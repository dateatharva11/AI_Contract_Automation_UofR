import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { supabase } from "../supabase";

const TEMPLATE_BUCKET = "contract_templates";
const OUTPUT_BUCKET = "contracts";

/** Safe object name for Supabase Storage (no path separators / odd chars). */
function safeObjectName(base: string): string {
  const trimmed = base.trim().slice(0, 120) || "document";
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

/**
 * Completely remove ALL split placeholders and only keep contiguous ones
 * This aggressively removes any {{ or }} that aren't part of valid placeholders
 */
function cleanupSplitPlaceholders(xmlContent: string): string {
  // First, extract and preserve valid contiguous placeholders
  const validPattern = /\{\{[\w]+\}\}/g;
  const validPlaceholders: string[] = [];
  let content = xmlContent;
  
  // Replace valid placeholders with unique markers
  content = content.replace(validPattern, (match) => {
    validPlaceholders.push(match);
    return `__VALID_PH_${validPlaceholders.length - 1}__`;
  });
  
  // CRITICAL: Remove ALL {{ and }} patterns that remain
  // This includes split ones like {{star, {{owne, etc.
  content = content.replace(/\{\{/g, '');
  content = content.replace(/\}\}/g, '');
  
  // Also remove any single braces that might be left
  content = content.replace(/\{/g, '');
  content = content.replace(/\}/g, '');
  
  // Restore valid placeholders
  content = content.replace(/__VALID_PH_(\d+)__/g, (_, index) => {
    return validPlaceholders[parseInt(index)];
  });
  
  return content;
}

/**
 * Extract contiguous placeholders from XML
 */
function extractContiguousPlaceholders(xmlContent: string): string[] {
  const placeholderPattern = /\{\{([\w]+)\}\}/g;
  const placeholders: string[] = [];
  let match;
  
  while ((match = placeholderPattern.exec(xmlContent)) !== null) {
    placeholders.push(match[0]);
  }
  
  return placeholders;
}

/**
 * Log which placeholders are missing from the data object
 */
function logMissingPlaceholders(xmlContent: string, data: Record<string, unknown>): void {
    const placeholderPattern = /\{\{([\w]+)\}\}/g;
    const missingPlaceholders: string[] = [];
    let match;
    
    while ((match = placeholderPattern.exec(xmlContent)) !== null) {
      const key = match[1];
      if (!(key in data)) {
        missingPlaceholders.push(key);
      }
    }
    
    if (missingPlaceholders.length > 0) {
      console.warn(`Missing data for ${missingPlaceholders.length} placeholder(s):`, missingPlaceholders);
    } else {
      console.log('All placeholders have corresponding data values');
    }
}

export async function generateDocxFromTemplate(
  templateFilePath: string,
  data: Record<string, unknown>,
  outputFileName: string,
): Promise<string> {
    console.log(`Attempting to download template from bucket: ${TEMPLATE_BUCKET}`);
    console.log(`Template file path: ${templateFilePath}`);
  
  // First, check if the file exists in the bucket
  const { data: fileList, error: listError } = await supabase.storage
    .from(TEMPLATE_BUCKET)
    .list('', {
      limit: 100,
      offset: 0,
    });
    
  if (!listError && fileList) {
    console.log(`Files in ${TEMPLATE_BUCKET} bucket:`, fileList.map(f => f.name));
    
    const fileExists = fileList.some(file => file.name === templateFilePath);
    if (!fileExists) {
      throw new Error(
        `File "${templateFilePath}" not found in bucket "${TEMPLATE_BUCKET}". ` +
        `Available files: ${fileList.map(f => f.name).join(', ')}`
      );
    }
  }
  
  // Download the file
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(TEMPLATE_BUCKET)
    .download(templateFilePath);

  if (downloadError) {
    console.error('Download error details:', downloadError);
    throw new Error(`Failed to download template: ${downloadError.message}`);
  }
  
  if (!fileData) {
    throw new Error(`Template download returned no data for: ${templateFilePath}`);
  }

  console.log(`Successfully downloaded template: ${templateFilePath} (${fileData.size} bytes)`);

  const arrayBuffer = await fileData.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  
  // Extract and preprocess the document.xml
  const documentXmlPath = "word/document.xml";
  const documentXmlFile = zip.file(documentXmlPath);
  
  if (!documentXmlFile) {
    throw new Error("Could not find word/document.xml in the template");
  }
  
  // Get the content as string
  let documentXmlContent: string;
  if (typeof documentXmlFile === 'object' && 'asText' in documentXmlFile) {
    documentXmlContent = (documentXmlFile as any).asText();
  } else {
    documentXmlContent = documentXmlFile.toString();
  }
  
  if (!documentXmlContent) {
    throw new Error("Could not read content from word/document.xml");
  }
  
  // Log original placeholders (for debugging)
  const originalPlaceholders = extractContiguousPlaceholders(documentXmlContent);
  // console.log(`Found ${originalPlaceholders.length} contiguous placeholder(s):`, originalPlaceholders);

  // Log which placeholders might be missing from data
  logMissingPlaceholders(documentXmlContent, data);
  
  // Clean up split placeholders
  // console.log("Cleaning up split placeholders...");
  let cleanedXmlContent = cleanupSplitPlaceholders(documentXmlContent);
  
  // Verify only valid placeholders remain
  const remainingPlaceholders = extractContiguousPlaceholders(cleanedXmlContent);
  // console.log(`After cleanup: ${remainingPlaceholders.length} contiguous placeholder(s) remaining:`, remainingPlaceholders);
  
  // Update the zip with the cleaned XML
  zip.remove(documentXmlPath);
  zip.file(documentXmlPath, cleanedXmlContent);
  
  // Create docxtemplater instance with custom delimiters to be extra safe
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: {
      start: '{{',
      end: '}}'
    },
    nullGetter: () => "", // Replace undefined/null values with empty string
  });

  try {
    doc.render(data);
    console.log("Template rendered successfully!");
  } catch (error) {
    console.error("Render error:", error);
    
    // Log which placeholders might be missing from data
    const placeholdersNeeded = extractContiguousPlaceholders(cleanedXmlContent);
    const missingPlaceholders = placeholdersNeeded.filter(ph => {
      const key = ph.slice(2, -2); // Remove {{ and }}
      return !(key in data);
    });
    
    if (missingPlaceholders.length > 0) {
      console.error("Missing data for placeholders:", missingPlaceholders);
    }
    
    throw new Error(`Failed to render template: ${error instanceof Error ? error.message : String(error)}`);
  }

  const generatedBuffer = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  const objectName = `${safeObjectName(outputFileName)}_${Date.now()}.docx`;

  const { error: uploadError } = await supabase.storage
    .from(OUTPUT_BUCKET)
    .upload(objectName, generatedBuffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload DOCX: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(OUTPUT_BUCKET)
    .getPublicUrl(objectName);

  console.log(`Successfully generated and uploaded DOCX: ${urlData.publicUrl}`);
  
  return urlData.publicUrl;
}