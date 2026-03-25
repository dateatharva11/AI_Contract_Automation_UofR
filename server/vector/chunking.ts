import * as pdf from 'pdf-parse';
import mammoth from 'mammoth';

export interface Chunk {
  index: number;
  text: string;
  metadata: Record<string, any>;
}

/**
 * Smart chunking strategy for legal contracts
 */
export function chunkContract(
  text: string,
  contractId: number,
  metadata: Record<string, any> = {}
): Chunk[] {
  const chunks: Chunk[] = [];
  
  // Split by articles/sections first (hierarchical structure)
  const articleRegex = /(ARTICLE\s+\d+.*?)(?=ARTICLE\s+\d+|$)/gs;
  const preambleMatch = text.match(/^.*?(?=ARTICLE\s+1)/s);
  
  // Add preamble as first chunk (agreement header, parties, etc.)
  if (preambleMatch) {
    chunks.push({
      index: chunks.length,
      text: preambleMatch[0].trim(),
      metadata: {
        ...metadata,
        type: 'preamble',
        section: 'Preamble'
      }
    });
  }
  
  // Process each article
  const articles = text.match(articleRegex) || [];
  articles.forEach((article) => {
    // Extract article number and title
    const articleTitleMatch = article.match(/ARTICLE\s+(\d+)\s+(.+?)(?:\n|$)/);
    const articleNumber = articleTitleMatch ? articleTitleMatch[1] : 'unknown';
    const articleTitle = articleTitleMatch ? articleTitleMatch[2].trim() : 'Unknown';
    
    // Check if article is too long, split into subsections
    if (article.length > 1500) {
      // Split by subsections (§ symbols)
      const subsectionRegex = /(§\s+\d+\.\d+.*?)(?=§\s+\d+\.\d+|$)/gs;
      const subsections = article.match(subsectionRegex) || [];
      
      if (subsections.length > 1) {
        subsections.forEach((subsection) => {
          chunks.push({
            index: chunks.length,
            text: subsection.trim(),
            metadata: {
              ...metadata,
              type: 'subsection',
              article: articleNumber,
              articleTitle,
              subsection: extractSubsectionNumber(subsection)
            }
          });
        });
      } else {
        // If no clear subsections, split by paragraphs
        const paragraphs = splitIntoParagraphs(article, 1000);
        paragraphs.forEach((paragraph, idx) => {
          chunks.push({
            index: chunks.length,
            text: paragraph,
            metadata: {
              ...metadata,
              type: 'paragraph',
              article: articleNumber,
              articleTitle,
              part: idx + 1
            }
          });
        });
      }
    } else {
      // Article is small enough to keep as one chunk
      chunks.push({
        index: chunks.length,
        text: article.trim(),
        metadata: {
          ...metadata,
          type: 'article',
          article: articleNumber,
          articleTitle
        }
      });
    }
  });
  
  return chunks;
}

/**
 * Extract subsection number from a subsection text
 */
function extractSubsectionNumber(text: string): string | null {
  const match = text.match(/§\s+(\d+\.\d+)/);
  return match ? match[1] : null;
}

/**
 * Split text into paragraphs with maximum length
 */
function splitIntoParagraphs(text: string, maxLength: number): string[] {
  const paragraphs: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentParagraph = '';
  
  sentences.forEach((sentence) => {
    if ((currentParagraph + ' ' + sentence).length <= maxLength) {
      currentParagraph = currentParagraph ? currentParagraph + ' ' + sentence : sentence;
    } else {
      if (currentParagraph) {
        paragraphs.push(currentParagraph);
      }
      currentParagraph = sentence;
    }
  });
  
  if (currentParagraph) {
    paragraphs.push(currentParagraph);
  }
  
  return paragraphs;
}

/**
 * Extract text from DOCX file
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw error;
  }
}

/**
 * Extract text from PDF file
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}