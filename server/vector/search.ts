import { pool } from '../db';

export interface SearchResult {
  id: number;
  contractId: number;
  chunkIndex: number;
  chunkText: string;
  metadata: Record<string, any>;
  similarity: number;
}

/**
 * Search for similar contract chunks using vector similarity
 */
export async function searchSimilarChunks(
  query: string,
  embedding: number[],
  limit: number,
  minSimilarity: number = 0.7,
  filterContractId?: number
): Promise<SearchResult[]> {
  try {
    let queryText = `
      SELECT 
        id,
        contract_id,
        chunk_index,
        chunk_text,
        metadata,
        1 - (embedding <=> $1::vector) as similarity
      FROM contract_chunks
      WHERE 1 - (embedding <=> $1::vector) > $2
    `;
    
    const params: any[] = [JSON.stringify(embedding), minSimilarity];
    
    if (filterContractId) {
      queryText += ` AND contract_id = $${params.length + 1}`;
      params.push(filterContractId);
    }
    
    queryText += ` ORDER BY similarity DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await pool.query(queryText, params);
    
    return result.rows.map(row => ({
      id: row.id,
      contractId: row.contract_id,
      chunkIndex: row.chunk_index,
      chunkText: row.chunk_text,
      metadata: row.metadata,
      similarity: parseFloat(row.similarity)
    }));
  } catch (error) {
    console.error('Error searching similar chunks:', error);
    throw error;
  }
}

/**
 * Get contract context for AI generation
 */
export async function getContractContext(
  query: string,
  embedding: number[],
  maxChunks: number = 5
): Promise<string> {
  const results = await searchSimilarChunks(query, embedding, maxChunks);
  
  console.log("Results length:", results.length);
  if (results.length === 0) {
    return '';
  }
  
  // Group by contract to provide full context
  const contextByContract = results.reduce((acc, result) => {
    const contractId = result.contractId;
    if (!acc[contractId]) {
      acc[contractId] = {
        contractId,
        chunks: []
      };
    }
    acc[contractId].chunks.push(result);
    return acc;
  }, {} as Record<number, { contractId: number; chunks: SearchResult[] }>);
  
  // Build context string
  let context = '';
  
  for (const [contractId, data] of Object.entries(contextByContract)) {
    const sortedChunks = data.chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    
    context += `\n--- Contract ID: ${contractId} (Similarity: ${Math.max(...data.chunks.map(c => c.similarity)).toFixed(3)}) ---\n\n`;
    
    for (const chunk of sortedChunks) {
      const metadata = chunk.metadata;
      if (metadata.type === 'article') {
        context += `[ARTICLE ${metadata.article}: ${metadata.articleTitle}]\n`;
      } else if (metadata.type === 'subsection') {
        context += `[§ ${metadata.subsection}]\n`;
      }
      context += chunk.chunkText + '\n\n';
    }
  }
  
  return context;
}