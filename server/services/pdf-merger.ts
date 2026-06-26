import { PDFDocument } from 'pdf-lib';
import { supabase } from '../supabase';

export async function mergePdfs(mainPdfBuffer: Buffer, exhibitBuffers: Buffer[]): Promise<Buffer> {
  try {
    console.log(`Merging ${exhibitBuffers.length + 1} PDF files...`);
    
    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();
    
    // Load and copy main contract PDF
    const mainPdf = await PDFDocument.load(mainPdfBuffer);
    const mainPages = await mergedPdf.copyPages(mainPdf, mainPdf.getPageIndices());
    mainPages.forEach(page => mergedPdf.addPage(page));
    
    // Load and copy each exhibit PDF directly after main contract
    for (let i = 0; i < exhibitBuffers.length; i++) {
      console.log(`Adding exhibit ${i + 1}...`);
      try {
        const exhibitPdf = await PDFDocument.load(exhibitBuffers[i]);
        const exhibitPages = await mergedPdf.copyPages(exhibitPdf, exhibitPdf.getPageIndices());
        exhibitPages.forEach(page => mergedPdf.addPage(page));
      } catch (err) {
        console.error(`Failed to load exhibit ${i + 1}:`, err);
      }
    }
    
    // Save the merged PDF
    const mergedPdfBuffer = await mergedPdf.save();
    console.log(`Merged PDF created, size: ${mergedPdfBuffer.length} bytes`);
    
    return mergedPdfBuffer;
  } catch (error) {
    console.error('Error merging PDFs:', error);
    throw error;
  }
}

export async function downloadExhibitFromStorage(bucket: string, filePath: string): Promise<Buffer> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);
    
    if (error) {
      throw new Error(`Failed to download exhibit: ${error.message}`);
    }
    
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error downloading exhibit from storage:', error);
    throw error;
  }
}