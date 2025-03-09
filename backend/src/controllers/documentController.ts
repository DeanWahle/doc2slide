import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { processDocx } from '../services/docxProcessor';
import { processPdf } from '../services/pdfProcessor';
import { processTxt } from '../services/txtProcessor';
import { createSlides } from '../services/slidesService';
import { enhanceWithLLM, generateConclusionSlide } from '../services/llmProcessor';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Store processed documents in memory (in a real app, use a database)
const processedDocuments = new Map();

/**
 * Handle document upload
 */
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    console.log('Upload request received', req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Make sure uploads directory exists
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Ensure file was saved correctly
    if (!fs.existsSync(req.file.path)) {
      console.error('File was not saved correctly:', req.file.path);
      return res.status(500).json({ error: 'File upload failed - file not saved' });
    }

    const documentId = Date.now().toString();
    
    // Store basic file info
    processedDocuments.set(documentId, {
      id: documentId,
      originalName: req.file.originalname,
      path: req.file.path,
      mimeType: req.file.mimetype,
      status: 'uploaded',
      uploadedAt: new Date(),
      content: null
    });

    console.log('Document stored with ID:', documentId);

    res.status(200).json({ 
      documentId,
      message: 'Document uploaded successfully',
      status: 'uploaded'
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload document',
      details: error.message || 'Unknown error'
    });
  }
};

/**
 * Process the uploaded document
 */
export const processDocument = async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const document = processedDocuments.get(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update status
    document.status = 'processing';
    processedDocuments.set(documentId, document);

    // Process based on file type
    let processedContent;
    if (document.mimeType === 'application/pdf') {
      processedContent = await processPdf(document.path);
    } else if (document.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      processedContent = await processDocx(document.path);
    } else if (document.mimeType === 'text/plain') {
      processedContent = await processTxt(document.path);
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Use LLM to enhance content if API key is available
    if (process.env.OPENAI_API_KEY) {
      try {
        console.log('Enhancing content with LLM...');
        processedContent = await enhanceWithLLM(processedContent);
        
        // Add a conclusion slide
        const conclusionSlide = await generateConclusionSlide(processedContent);
        processedContent.sections.push(conclusionSlide);
        
        console.log('LLM enhancement completed');
      } catch (llmError: any) {
        console.error('LLM enhancement failed:', llmError.message);
        // Continue with unenhanced content if LLM fails
      }
    } else {
      console.log('Skipping LLM enhancement - no API key found');
    }

    // Update document with processed content
    document.content = processedContent;
    document.status = 'processed';
    document.processedAt = new Date();
    processedDocuments.set(documentId, document);

    res.status(200).json({
      documentId,
      status: 'processed',
      message: 'Document processed successfully'
    });
  } catch (error: any) {
    console.error('Processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process document',
      details: error.message || 'Unknown error'
    });
  }
};

/**
 * Get processed document
 */
export const getProcessedDocument = (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const document = processedDocuments.get(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.status(200).json(document);
  } catch (error) {
    console.error('Retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve document' });
  }
};

/**
 * Convert processed document to Google Slides
 */
export const convertToSlides = async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { accessToken, templateId } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Google access token is required' });
    }

    const document = processedDocuments.get(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.status !== 'processed') {
      return res.status(400).json({ error: 'Document has not been processed yet' });
    }

    // Create slides using Google Slides API
    const slidePresentationId = await createSlides(document.content, accessToken, templateId);
    
    // Update document status
    document.status = 'converted';
    document.slidePresentationId = slidePresentationId;
    document.convertedAt = new Date();
    processedDocuments.set(documentId, document);

    res.status(200).json({
      documentId,
      slidePresentationId,
      status: 'converted',
      message: 'Document converted to slides successfully'
    });
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: 'Failed to convert to slides' });
  }
}; 