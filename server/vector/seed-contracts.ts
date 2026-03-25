import { pool } from '../db';
import { chunkContract, extractTextFromDocx } from './chunking';
import { generateEmbeddingsBatch } from './embeddings';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ContractMetadata {
  contractId: number;
  fileName: string;
  projectName?: string;
  ownerName?: string;
  vendorName?: string;
  projectLocation?: string;
  contractType: string;
}

/**
 * Extract basic metadata from contract text
 */
function extractBasicMetadata(text: string, fileName: string, contractId: number): ContractMetadata {
    const metadata: ContractMetadata = {
      contractId,
      fileName,
      contractType: 'A102-2017'
    };
  
    // Try to extract project name - capture the line after the label and instruction line
    const projectNameMatch = text.match(/for the following Project:\s*\n\s*\(Name, location and detailed description\)\s*\n\s*([^\n]+)/i);
    if (projectNameMatch) {
      metadata.projectName = projectNameMatch[1].trim();
    }
  
    // Try to extract owner name - capture the line after the label and instruction line
    const ownerMatch = text.match(/BETWEEN the Owner:\s*\n\s*\(Name, legal status, address and other information\)\s*\n\s*([^\n]+)/i);
    if (ownerMatch) {
      metadata.ownerName = ownerMatch[1].trim();
    }
  
    // Try to extract contractor/vendor name - capture the line after the label and instruction line
    const contractorMatch = text.match(/and the Contractor:\s*\n\s*\(Name, legal status, address and other information\)\s*\n\s*([^\n]+)/i);
    if (contractorMatch) {
      metadata.vendorName = contractorMatch[1].trim();
    }
  
    // Try to extract project location - capture the line after the project name
    const locationMatch = text.match(/for the following Project:\s*\n\s*\(Name, location and detailed description\)\s*\n\s*[^\n]+\s*\n\s*([^\n]+)/i);
    if (locationMatch) {
      metadata.projectLocation = locationMatch[1].trim();
    }
  
    return metadata;
}

/**
 * Main function to seed contracts from local DOCX files into vector database
 */
async function seedVectorDatabase() {
  console.log('Starting vector database seeding from local DOCX files...');
  
  // Base path for contract files
  const basePath = '/Users/atharvadate/Documents/documents_db/contracts/';
  const contractFiles = [
    'A102-2017-extended-1.docx',
    'A102-2017-extended-2.docx',
    'A102-2017-extended-3.docx',
    'A102-2017-extended-4.docx',
    'A102-2017-extended-5.docx'
  ];

  try {
    for (let i = 0; i < contractFiles.length; i++) {
      const fileName = contractFiles[i];
      const filePath = path.join(basePath, fileName);
      const contractId = i + 1; // Using 1-5 as contract IDs
      
      console.log(`\n[${i + 1}/${contractFiles.length}] Processing: ${fileName}`);
      
      try {
        // Check if file exists
        await fs.access(filePath);
        
        // Read and extract text from DOCX
        console.log('  Reading DOCX file...');
        const fileBuffer = await fs.readFile(filePath);
        const documentText = await extractTextFromDocx(fileBuffer);
        console.log(`  Extracted ${documentText.length} characters`);
        
        // Extract basic metadata from the contract text
        const metadata = extractBasicMetadata(documentText, fileName, contractId);
        console.log('  Extracted metadata:', metadata);
        
        // Prepare enhanced metadata for chunking
        const chunkMetadata = {
          contractId,
          fileName,
          projectName: metadata.projectName || `Contract ${contractId}`,
          ownerName: metadata.ownerName || 'Unknown',
          vendorName: metadata.vendorName || 'Unknown',
          projectLocation: metadata.projectLocation || 'Unknown',
          contractType: metadata.contractType,
          source: 'local_file',
          filePath
        };
        
        // Chunk the contract
        console.log('  Chunking contract...');
        const chunks = chunkContract(documentText, contractId, chunkMetadata);
        console.log(`  Created ${chunks.length} chunks`);
        
        // Generate embeddings
        console.log('  Generating embeddings (this may take a few minutes)...');
        const embeddings = await generateEmbeddingsBatch(chunks);
        console.log(`  Generated ${embeddings.size} embeddings`);
        
        // Insert chunks into database
        console.log('  Inserting chunks into database...');
        let insertedCount = 0;
        let updatedCount = 0;
        
        for (const chunk of chunks) {
          const embedding = embeddings.get(chunk.index);
          
          if (!embedding) {
            console.warn(`  Warning: No embedding for chunk ${chunk.index}, skipping...`);
            continue;
          }
          
          // Check if chunk already exists
          const existing = await pool.query(
            'SELECT id FROM contract_chunks WHERE contract_id = $1 AND chunk_index = $2',
            [contractId, chunk.index]
          );
          
          if (existing.rows.length > 0) {
            // Update existing chunk
            await pool.query(
              `UPDATE contract_chunks 
               SET chunk_text = $1, embedding = $2::vector, metadata = $3, created_at = NOW()
               WHERE contract_id = $4 AND chunk_index = $5`,
              [
                chunk.text,
                JSON.stringify(embedding),
                JSON.stringify(chunk.metadata),
                contractId,
                chunk.index
              ]
            );
            updatedCount++;
          } else {
            // Insert new chunk
            await pool.query(
              `INSERT INTO contract_chunks 
               (contract_id, chunk_index, chunk_text, embedding, metadata, created_at)
               VALUES ($1, $2, $3, $4::vector, $5, NOW())`,
              [
                contractId,
                chunk.index,
                chunk.text,
                JSON.stringify(embedding),
                JSON.stringify(chunk.metadata)
              ]
            );
            insertedCount++;
          }
        }
        
        console.log(`  ✓ Completed: Inserted ${insertedCount} new chunks, Updated ${updatedCount} chunks`);
        
      } catch (fileError) {
        console.error(`  ✗ Error processing file ${fileName}:`, fileError);
        // Continue with next file
        continue;
      }
    }
    
    console.log('\n✓ Vector database seeding completed successfully!');
    
    // Verify the results
    const result = await pool.query(
      'SELECT contract_id, COUNT(*) as chunk_count FROM contract_chunks GROUP BY contract_id ORDER BY contract_id'
    );
    
    console.log('\n📊 Seeding Summary:');
    console.log('===================');
    result.rows.forEach(row => {
      console.log(`Contract ID ${row.contract_id}: ${row.chunk_count} chunks`);
    });
    
  } catch (error) {
    console.error('Error seeding vector database:', error);
  } finally {
    await pool.end();
  }
}

// Run the seeding
seedVectorDatabase(); 

// Export for use in other modules
// export { seedVectorDatabase };