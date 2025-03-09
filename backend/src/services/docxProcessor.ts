import mammoth from 'mammoth';
import { DocumentContent, SlideSection } from '../types/documentTypes';

// Define Result type to fix TypeScript error
interface MammothResult {
  value: string;
  messages: any[];
}

/**
 * Process a DOCX file and extract its content
 */
export const processDocx = async (filePath: string): Promise<DocumentContent> => {
  try {
    console.log(`Processing DOCX file: ${filePath}`);
    const startTime = Date.now();
    
    // Use mammoth to convert docx to HTML with basic options
    const options = {
      path: filePath
    };
    
    // Use a promise with timeout to prevent hanging on corrupt files
    const result = await Promise.race([
      mammoth.convertToHtml(options),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('DOCX conversion timeout')), 60000)
      )
    ]) as MammothResult;
    
    const htmlContent = result.value;
    console.log(`DOCX converted to HTML in ${(Date.now() - startTime) / 1000}s`);
    
    // Extract and analyze content structure
    const sections = extractSections(htmlContent);
    console.log(`DOCX processing completed in ${(Date.now() - startTime) / 1000}s, found ${sections.length} sections`);
    
    return {
      type: 'docx',
      title: extractTitle(htmlContent),
      sections,
      rawContent: htmlContent
    };
  } catch (error) {
    console.error('DOCX processing error:', error);
    throw new Error(`Failed to process DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Extract the title from HTML content
 */
const extractTitle = (htmlContent: string): string => {
  // Look for first H1 or first paragraph
  const titleMatch = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i) || 
                     htmlContent.match(/<p[^>]*>(.*?)<\/p>/i);
  
  if (titleMatch && titleMatch[1]) {
    // Remove any HTML tags within the title
    return titleMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
  }
  
  return 'Untitled Document';
};

/**
 * Extract sections from HTML content
 */
const extractSections = (htmlContent: string): SlideSection[] => {
  const sections: SlideSection[] = [];
  
  // Split content by heading elements to identify sections
  const headingRegex = /<h([1-3])[^>]*>(.*?)<\/h\1>/gi;
  const contentParts = htmlContent.split(headingRegex);
  
  if (contentParts.length <= 1) {
    // No headings found, treat the entire document as one section
    sections.push({
      title: 'Main Content',
      level: 1,
      content: htmlContent,
      type: 'generic'
    });
    return sections;
  }
  
  // Skip first part (content before first heading)
  let currentSection: SlideSection | null = null;
  
  for (let i = 1; i < contentParts.length; i += 3) {
    const level = parseInt(contentParts[i], 10);
    const title = contentParts[i + 1].replace(/<\/?[^>]+(>|$)/g, "").trim();
    const content = contentParts[i + 2] || '';
    
    currentSection = {
      title,
      level,
      content,
      type: determineContentType(content)
    };
    
    sections.push(currentSection);
  }
  
  return sections;
};

/**
 * Determine the type of content based on HTML analysis
 */
const determineContentType = (content: string): string => {
  if (content.includes('<ul>') || content.includes('<ol>')) {
    return 'bullet_points';
  }
  
  if (content.includes('<table>')) {
    return 'table';
  }
  
  if (content.includes('<img')) {
    return 'image';
  }
  
  return 'text';
}; 