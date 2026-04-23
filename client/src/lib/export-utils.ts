import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Strips HTML tags and returns plain text
 */
export function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * Converts HTML to plain text with basic formatting preserved for DOCX
 */
function htmlToPlainText(html: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Replace block elements with newlines
  const blockElements = temp.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, table, tr, td, th');
  blockElements.forEach(el => {
    el.insertAdjacentHTML('afterend', '\n\n');
  });
  
  // Replace br with newline
  temp.querySelectorAll('br').forEach(el => {
    el.insertAdjacentHTML('afterend', '\n');
  });
  
  return temp.textContent || temp.innerText || '';
}

/**
 * Parses HTML content into structured document elements for docx
 */
export function parseHtmlToDocxElements(html: string) {
  const elements: any[] = [];
  
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Clean up the HTML - remove empty paragraphs and normalize whitespace
  const cleanHtml = tempDiv.innerHTML
    .replace(/<p>\s*<\/p>/g, '') // Remove empty paragraphs
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  tempDiv.innerHTML = cleanHtml;
  
  // Process each child node
  const processNode = (node: Node, parentStyles: any = {}): any[] => {
    const results: any[] = [];
    
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) {
        // Create a text run with inherited styles
        const textRunOptions: any = {
          text: text,
        };
        
        if (parentStyles.bold) textRunOptions.bold = true;
        if (parentStyles.italic) textRunOptions.italics = true;
        if (parentStyles.underline) textRunOptions.underline = {};
        
        results.push(new TextRun(textRunOptions));
      }
      return results;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      
      // Get computed styles
      const styles = window.getComputedStyle(element);
      const currentStyles = {
        bold: parentStyles.bold || tagName === 'strong' || tagName === 'b' || styles.fontWeight === 'bold' || parseInt(styles.fontWeight) >= 600,
        italic: parentStyles.italic || tagName === 'em' || tagName === 'i' || styles.fontStyle === 'italic',
        underline: parentStyles.underline || tagName === 'u' || styles.textDecoration === 'underline',
      };
      
      // Process children
      const childContents: any[] = [];
      element.childNodes.forEach(child => {
        childContents.push(...processNode(child, currentStyles));
      });

      // Handle different element types
      switch (tagName) {
        case 'p':
          if (childContents.length > 0) {
            results.push(
              new Paragraph({
                children: childContents,
                spacing: { after: 200 },
              })
            );
          }
          break;
          
        case 'h1':
          if (childContents.length > 0) {
            results.push(
              new Paragraph({
                children: childContents,
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200, before: 400 },
              })
            );
          }
          break;
          
        case 'h2':
          if (childContents.length > 0) {
            results.push(
              new Paragraph({
                children: childContents,
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 200, before: 300 },
              })
            );
          }
          break;
          
        case 'h3':
          if (childContents.length > 0) {
            results.push(
              new Paragraph({
                children: childContents,
                heading: HeadingLevel.HEADING_3,
                spacing: { after: 200, before: 200 },
              })
            );
          }
          break;
          
        case 'h4':
        case 'h5':
        case 'h6':
          if (childContents.length > 0) {
            results.push(
              new Paragraph({
                children: childContents,
                spacing: { after: 200, before: 200 },
              })
            );
          }
          break;
          
        case 'ul':
          element.childNodes.forEach((li, index) => {
            if (li.nodeType === Node.ELEMENT_NODE && (li as HTMLElement).tagName.toLowerCase() === 'li') {
              const liContent = processNode(li, currentStyles);
              if (liContent.length > 0) {
                results.push(
                  new Paragraph({
                    children: [new TextRun('• '), ...liContent],
                    indent: { left: 720 },
                    spacing: { after: 100 },
                  })
                );
              }
            }
          });
          break;
        
        case 'ol':
          let counter = 1;
          element.childNodes.forEach((li) => {
            if (li.nodeType === Node.ELEMENT_NODE && (li as HTMLElement).tagName.toLowerCase() === 'li') {
              const liContent = processNode(li, currentStyles);
              if (liContent.length > 0) {
                results.push(
                  new Paragraph({
                    children: [new TextRun(`${counter}. `), ...liContent],
                    indent: { left: 720 },
                    spacing: { after: 100 },
                  })
                );
                counter++;
              }
            }
          });
          break;
          
        case 'table':
          // For now, convert table to text representation
          const tableText = element.textContent || '';
          if (tableText.trim()) {
            results.push(
              new Paragraph({
                children: [new TextRun(tableText)],
                spacing: { after: 200 },
              })
            );
          }
          break;
          
        case 'div':
        case 'section':
        case 'article':
        case 'main':
        case 'span':
          results.push(...childContents);
          break;
          
        case 'br':
          results.push(new Paragraph({ children: [] }));
          break;
          
        case 'hr':
          results.push(
            new Paragraph({
              children: [],
              border: {
                bottom: {
                  color: '000000',
                  size: 1,
                  style: BorderStyle.SINGLE,
                },
              },
              spacing: { after: 200, before: 200 },
            })
          );
          break;
          
        default:
          results.push(...childContents);
      }
    }
    
    return results;
  };

  // Process all child nodes
  tempDiv.childNodes.forEach(node => {
    const processed = processNode(node);
    elements.push(...processed);
  });

  // If no elements were created, create a simple paragraph with the text
  if (elements.length === 0) {
    const text = stripHtml(html);
    if (text) {
      elements.push(
        new Paragraph({
          children: [new TextRun(text)],
        })
      );
    }
  }

  return elements;
}

/**
 * Export as PDF using browser print functionality
 * This often gives better results with text selection and smaller file sizes
 */
export async function exportAsPDF(elementId: string, filename: string = 'document.pdf') {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Element not found');
      }
  
      // Clone the element and its content
      const clone = element.cloneNode(true) as HTMLElement;
      
      // Create a print-optimized version
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window');
      }
  
      // Get the styles from the original document
      const styles = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules || [])
              .map(rule => rule.cssText)
              .join('');
          } catch (e) {
            return '';
          }
        })
        .join('');
  
      // Write the print document
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${filename.replace('.pdf', '')}</title>
            <style>
              /* Reset and print styles */
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif;
                background: white;
              }
              
              /* Ensure all content is visible */
              #print-content {
                width: 100%;
                max-width: 800px;
                margin: 0 auto;
              }
              
              /* Remove any scrollable containers */
              .overflow-y-auto, 
              [class*="overflow"] {
                overflow: visible !important;
                max-height: none !important;
                height: auto !important;
              }
              
              /* Preserve formatting */
              @media print {
                body { 
                  margin: 0; 
                  padding: 0.5in;
                }
              }
              
              ${styles}
            </style>
          </head>
          <body>
            <div id="print-content">
              ${clone.outerHTML}
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `);
  
      printWindow.document.close();
      return true;
    } catch (error) {
      console.error('Error generating PDF via print:', error);
      throw error;
    }
  }

