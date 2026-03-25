import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

// Note: For embeddings, you need to use the embedding model, not the chat model
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_API_KEY || '');

export interface Chunk {
  index: number;
  text: string;
  metadata: Record<string, any>;
}

/**
 * Generate embedding for a text using Google's embedding model
 * Uses the gemini-embedding-001 model (3072 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use the embedding model
    const model = genAI.getGenerativeModel({
      model: "gemini-embedding-001", // This is the correct embedding model
    });
    
    // Truncate text to avoid token limits (max 2048 tokens for embedding model)
    const truncatedText = text.slice(0, 8000); // Approximately 2000 tokens
    
    // Generate embedding
    const result = await model.embedContent({
        content: {
          parts: [{ text: truncatedText }],
          role: "user",
        }
    });
    const embedding = result.embedding.values;
    
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response');
    }
    
    // gemini-embedding-001 returns 3072 dimensions
    if (embedding.length !== 3072) {
      console.warn(`Expected 3072 dimensions, got ${embedding.length}`);
    }
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple chunks in batches with rate limiting
 */
export async function generateEmbeddingsBatch(
  chunks: Chunk[],
  batchSize: number = 10, // Embedding model can handle more concurrent requests
  delayMs: number = 500
): Promise<Map<number, number[]>> {
  const embeddings = new Map<number, number[]>();
  let successfulCount = 0;
  let failedCount = 0;
  
  console.log(`Total chunks to process: ${chunks.length}`);
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batchStart = i;
    const batchEnd = Math.min(i + batchSize, chunks.length);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (chunks ${batchStart + 1}-${batchEnd})...`);
    
    // Process batch sequentially to avoid overwhelming the API
    for (let j = batchStart; j < batchEnd; j++) {
      const chunk = chunks[j];
      const chunkNumber = j;
      
      try {
        console.log(`  Generating embedding for chunk ${chunkNumber + 1}/${chunks.length}...`);
        const embedding = await generateEmbedding(chunk.text);
        embeddings.set(chunk.index, embedding);
        successfulCount++;
        console.log(`  ✓ Completed chunk ${chunkNumber + 1}/${chunks.length}`);
        
        // Add delay between individual requests within batch
        if (j < batchEnd - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs / batchSize));
        }
      } catch (error) {
        failedCount++;
        console.error(`  ✗ Failed to generate embedding for chunk ${chunkNumber + 1}/${chunks.length}:`, error);
        // Continue with next chunk
      }
    }
    
    // Add delay between batches
    if (i + batchSize < chunks.length) {
      console.log(`Waiting ${delayMs}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.log(`\nEmbedding generation complete: ${successfulCount} successful, ${failedCount} failed`);
  return embeddings;
}