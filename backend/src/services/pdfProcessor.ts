import * as pdfjs from 'pdfjs-dist';
import fs from 'fs';
import { DocumentContent, SlideSection } from '../types/documentTypes';

// Set up PDF.js worker
const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.entry');
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Process a PDF file and extract its content
 */
export const processPdf = async (filePath: string): Promise<DocumentContent> => {
  try {
    console.log(`Processing PDF file: ${filePath}`);
    const startTime = Date.now();
    
    // Load PDF document
    const data = new Uint8Array(fs.readFileSync(filePath));
    const loadingTask = pdfjs.getDocument({ data });
    const pdfDocument = await loadingTask.promise;
    
    console.log(`PDF loaded with ${pdfDocument.numPages} pages`);
    
    // Extract text content using batch processing for large PDFs
    const textContent = await extractTextContentInBatches(pdfDocument);
    
    console.log(`PDF text extraction completed in ${(Date.now() - startTime) / 1000}s`);
    
    // Analyze and structure the content
    const sections = analyzePdfContent(textContent);
    
    console.log(`PDF processing completed in ${(Date.now() - startTime) / 1000}s, found ${sections.length} sections`);
    
    return {
      type: 'pdf',
      title: extractTitle(textContent),
      sections,
      rawContent: textContent.join('\n')
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    throw new Error('Failed to process PDF file');
  }
};

/**
 * Extract text content from all pages of a PDF document in batches
 * to avoid memory issues with large documents
 */
const extractTextContentInBatches = async (pdfDocument: pdfjs.PDFDocumentProxy): Promise<string[]> => {
  const textContent: string[] = [];
  const batchSize = 10; // Process 10 pages at a time
  
  for (let batchStart = 1; batchStart <= pdfDocument.numPages; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize - 1, pdfDocument.numPages);
    console.log(`Processing PDF pages ${batchStart} to ${batchEnd}...`);
    
    const batchPromises: Promise<string>[] = [];
    for (let i = batchStart; i <= batchEnd; i++) {
      batchPromises.push(extractPageText(pdfDocument, i));
    }
    
    const batchResults = await Promise.all(batchPromises);
    textContent.push(...batchResults);
    
    // Small delay between batches to allow garbage collection
    if (batchEnd < pdfDocument.numPages) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return textContent;
};

/**
 * Extract text from a single PDF page
 */
const extractPageText = async (pdfDocument: pdfjs.PDFDocumentProxy, pageNum: number): Promise<string> => {
  try {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => 'str' in item ? item.str : '')
      .join(' ');
    
    // Free up resources
    page.cleanup();
    
    return pageText;
  } catch (error) {
    console.error(`Error extracting text from page ${pageNum}:`, error);
    return `[Error extracting page ${pageNum}]`;
  }
};

/**
 * Extract title from PDF content
 */
const extractTitle = (textContent: string[]): string => {
  if (textContent.length === 0) {
    return 'Untitled Document';
  }
  
  // Try to find a title in the first page
  const firstPage = textContent[0];
  const lines = firstPage.split('\n');
  
  // Assume first non-empty line might be the title
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && trimmedLine.length > 3) {
      return trimmedLine;
    }
  }
  
  return 'Untitled Document';
};

/**
 * Analyze PDF content and segment it into logical sections
 */
const analyzePdfContent = (pageTexts: string[]): SlideSection[] => {
  const sections: SlideSection[] = [];
  let currentSectionTitle = 'Introduction';
  let currentSectionContent: string[] = [];
  let currentSectionLevel = 1;
  
  // Simple heuristic to detect headings and section breaks
  const headingRegex = /^(([A-Z][a-z]*\s*){1,7})$/m;
  const sectionBreakRegex = /^[\s-_=*]{3,}$/m;
  
  // Process each page
  for (const pageText of pageTexts) {
    const lines = pageText.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) continue;
      
      // Check if line looks like a heading
      if (headingRegex.test(trimmedLine) || 
          trimmedLine.length < 50 && trimmedLine.toUpperCase() === trimmedLine) {
        
        // Save previous section if it has content
        if (currentSectionContent.length > 0) {
          sections.push({
            title: currentSectionTitle,
            level: currentSectionLevel,
            content: currentSectionContent.join('\n'),
            type: determineContentType(currentSectionContent.join('\n'))
          });
          
          currentSectionContent = [];
        }
        
        currentSectionTitle = trimmedLine;
        currentSectionLevel = 1; // Default to level 1
        
        // Try to determine section level by indentation or formatting
        if (trimmedLine.startsWith('  ')) {
          currentSectionLevel = 2;
        }
        if (trimmedLine.startsWith('    ')) {
          currentSectionLevel = 3;
        }
        
        continue;
      }
      
      // Check for section breaks
      if (sectionBreakRegex.test(trimmedLine)) {
        continue; // Skip section break lines
      }
      
      // Add line to current section
      currentSectionContent.push(trimmedLine);
    }
  }
  
  // Add the last section if it has content
  if (currentSectionContent.length > 0) {
    sections.push({
      title: currentSectionTitle,
      level: currentSectionLevel,
      content: currentSectionContent.join('\n'),
      type: determineContentType(currentSectionContent.join('\n'))
    });
  }
  
  // If no sections were identified, create a generic one
  if (sections.length === 0) {
    sections.push({
      title: 'Main Content',
      level: 1,
      content: pageTexts.join('\n'),
      type: 'generic'
    });
  }
  
  return sections;
};

/**
 * Determine the type of content for a section
 */
const determineContentType = (content: string): string => {
  // Check for bullet points
  if (/^[•\-*]\s/m.test(content) || /^\d+\.\s/m.test(content)) {
    return 'bullet_points';
  }
  
  // Check for tables (crude heuristic)
  if (content.includes('|') && content.includes('\n') && 
      content.split('\n').filter(line => line.includes('|')).length > 2) {
    return 'table';
  }
  
  // Default to text
  return 'text';
}; 