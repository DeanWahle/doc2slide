/**
 * Represents a section of content to be converted to a slide
 */
export interface SlideSection {
  title: string;
  level: number;
  content: string;
  type: string; // 'text', 'bullet_points', 'table', 'image', 'generic', etc.
}

/**
 * Represents processed document content
 */
export interface DocumentContent {
  type: string; // 'pdf', 'docx', 'txt'
  title: string;
  sections: SlideSection[];
  rawContent: string;
}

/**
 * Represents an uploaded document
 */
export interface UploadedDocument {
  id: string;
  originalName: string;
  path: string;
  mimeType: string;
  status: 'uploaded' | 'processing' | 'processed' | 'converted' | 'error';
  uploadedAt: Date;
  processedAt?: Date;
  convertedAt?: Date;
  content?: DocumentContent;
  slidePresentationId?: string;
  error?: string;
} 