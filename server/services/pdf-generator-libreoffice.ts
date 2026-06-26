import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function generatePdfFromDocx(docxData: any): Promise<Buffer> {
  let tempInputPath: string | null = null;
  let tempDir: string | null = null;
  
  try {
    console.log('Starting DOCX to PDF conversion using LibreOffice...');
    
    // Step 1: Convert input to Buffer
    let buffer: Buffer;
    if (Buffer.isBuffer(docxData)) {
      buffer = docxData;
    } else if (docxData instanceof Blob) {
      const arrayBuffer = await docxData.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (docxData instanceof ArrayBuffer) {
      buffer = Buffer.from(docxData);
    } else if (docxData && typeof docxData === 'object' && 'data' in docxData) {
      buffer = Buffer.from(docxData.data);
    } else {
      throw new Error('Invalid DOCX data format');
    }
    
    console.log('Buffer size:', buffer.length, 'bytes');
    
    // Step 2: Create temporary directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docx2pdf-'));
    const timestamp = Date.now();
    tempInputPath = path.join(tempDir, `input_${timestamp}.docx`);
    
    // Step 3: Write DOCX buffer to temp file
    await fs.writeFile(tempInputPath, buffer);
    console.log('Temp DOCX file created:', tempInputPath);
    
    // Step 4: Determine LibreOffice command path based on OS
    let libreofficeCmd: string;
    if (process.platform === 'darwin') {
      // macOS
      libreofficeCmd = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
    } else if (process.platform === 'win32') {
      // Windows
      libreofficeCmd = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
    } else {
      // Linux
      libreofficeCmd = 'libreoffice';
    }
    
    // Step 5: Build conversion command
    const command = `"${libreofficeCmd}" --headless --convert-to pdf --outdir "${tempDir}" "${tempInputPath}"`;
    console.log('Running LibreOffice command:', command);
    
    // Step 6: Execute conversion
    try {
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 60000, // 60 second timeout for large files
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      });
      
      if (stderr) {
        console.log('LibreOffice stderr:', stderr);
      }
      if (stdout) {
        console.log('LibreOffice stdout:', stdout);
      }
    } catch (execError: any) {
      console.error('LibreOffice execution error:', execError);
      throw new Error(`LibreOffice conversion failed: ${execError.message}`);
    }
    
    // Step 7: Find the generated PDF file
    const files = await fs.readdir(tempDir);
    const pdfFile = files.find(f => f.endsWith('.pdf'));
    
    if (!pdfFile) {
      throw new Error('PDF file was not created by LibreOffice');
    }
    
    const tempOutputPath = path.join(tempDir, pdfFile);
    console.log('PDF created at:', tempOutputPath);
    
    // Step 8: Read the generated PDF
    const pdfBuffer = await fs.readFile(tempOutputPath);
    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    
    return pdfBuffer;
    
  } catch (error) {
    console.error('Error generating PDF from DOCX:', error);
    throw error;
  } finally {
    // Step 9: Clean up temp files
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log('Temp directory cleaned up:', tempDir);
      } catch (e) {
        console.error('Error cleaning up temp directory:', e);
      }
    }
  }
}