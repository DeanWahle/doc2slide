import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { processDocx } from './services/docxProcessor';
import { processPdf } from './services/pdfProcessor';
import { processTxt } from './services/txtProcessor';
import { enhanceWithLLM, generateConclusionSlide, processingProgress } from './services/llmProcessor';
import { createSlides } from './services/slidesService';

// Load environment variables
dotenv.config();

// Create a simple Express server
const app = express();
const PORT = 5001;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Allow frontend development server
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store processed documents in memory
const processedDocuments = new Map();

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Upload route
app.post('/api/documents/upload', upload.single('document'), (req, res) => {
  try {
    console.log('Upload request received');
    
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File uploaded:', req.file);
    const documentId = Date.now().toString();
    
    processedDocuments.set(documentId, {
      id: documentId,
      originalName: req.file.originalname,
      path: req.file.path,
      mimeType: req.file.mimetype,
      status: 'uploaded',
      uploadedAt: new Date()
    });

    console.log('Document created with ID:', documentId);
    res.status(200).json({ 
      documentId,
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get document processing progress
app.get('/api/documents/:documentId/progress', (req, res) => {
  const { documentId } = req.params;
  const progress = processingProgress.get(documentId);
  
  if (!progress) {
    // If no progress data exists, check if document exists
    const document = processedDocuments.get(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // If document exists but no progress data, determine status
    if (document.status === 'processed' || document.status === 'converted') {
      return res.json({ progress: 100, stage: 'complete' });
    } else if (document.status === 'processing') {
      return res.json({ progress: 50, stage: 'processing' });
    } else {
      return res.json({ progress: 0, stage: 'uploaded' });
    }
  }
  
  res.json(progress);
});

// Process document route
app.post('/api/documents/process/:documentId', async (req, res) => {
  try {
    console.log('Process request received for document:', req.params.documentId);
    
    const { documentId } = req.params;
    const document = processedDocuments.get(documentId);
    
    if (!document) {
      console.error('Document not found:', documentId);
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update document status to processing
    document.status = 'processing';
    processedDocuments.set(documentId, document);

    // Send immediate response to client
    res.status(202).json({
      documentId,
      message: 'Document processing started',
      status: 'processing'
    });

    // Continue processing in the background
    try {
      console.log('Processing document:', document.originalName, document.mimeType);
      
      // Process based on file type
      let processedContent;
      try {
        if (document.mimeType === 'application/pdf') {
          processedContent = await processPdf(document.path);
        } else if (document.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          processedContent = await processDocx(document.path);
        } else if (document.mimeType === 'text/plain') {
          processedContent = await processTxt(document.path);
        } else {
          console.error('Unsupported file type:', document.mimeType);
          document.status = 'error';
          document.error = 'Unsupported file type';
          processedDocuments.set(documentId, document);
          return;
        }
      } catch (processingError: any) {
        console.error('Error processing document:', processingError);
        document.status = 'error';
        document.error = processingError.message || 'Unknown processing error';
        processedDocuments.set(documentId, document);
        return;
      }

      // Use LLM to enhance content if API key is available
      if (process.env.OPENAI_API_KEY) {
        try {
          console.log('Enhancing content with LLM...');
          processedContent = await enhanceWithLLM(processedContent, documentId);
          
          // Add a conclusion slide
          const conclusionSlide = await generateConclusionSlide(processedContent, documentId);
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

      console.log('Document processed successfully:', documentId);
    } catch (error: any) {
      console.error('Processing error:', error);
      document.status = 'error';
      document.error = error.message || 'Unknown error';
      processedDocuments.set(documentId, document);
    }
  } catch (error: any) {
    console.error('Processing request error:', error);
    res.status(500).json({ 
      error: 'Failed to process document',
      details: error.message || 'Unknown error'
    });
  }
});

// Get document route
app.get('/api/documents/:documentId', (req, res) => {
  const { documentId } = req.params;
  const document = processedDocuments.get(documentId);
  
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  res.status(200).json(document);
});

// Convert to slides route
app.post('/api/documents/:documentId/convert', async (req, res) => {
  try {
    console.log('Convert request received for document:', req.params.documentId);
    
    const { documentId } = req.params;
    const { accessToken, templateId } = req.body;
    
    // In development mode with test server, we allow conversion without real access token
    const token = accessToken || 'test-token-for-development';
    
    const document = processedDocuments.get(documentId);
    
    if (!document) {
      console.error('Document not found:', documentId);
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.status !== 'processed') {
      console.error('Document has not been processed:', documentId);
      return res.status(400).json({ error: 'Document has not been processed yet' });
    }

    console.log('Converting document to slides:', documentId);
    
    // Create slides using Google Slides API (or mock in dev mode)
    const slidePresentationId = await createSlides(document.content, token, templateId);
    
    // Update document status
    document.status = 'converted';
    document.slidePresentationId = slidePresentationId;
    document.convertedAt = new Date();
    processedDocuments.set(documentId, document);

    console.log('Document converted to slides successfully:', slidePresentationId);
    
    res.status(200).json({
      documentId,
      slidePresentationId,
      status: 'converted',
      message: 'Document converted to slides successfully'
    });
  } catch (error: any) {
    console.error('Conversion error:', error);
    res.status(500).json({ 
      error: 'Failed to convert to slides',
      details: error.message || 'Unknown error'
    });
  }
});

// Add global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`- Upload endpoint: http://localhost:${PORT}/api/documents/upload`);
  console.log(`- Process endpoint: http://localhost:${PORT}/api/documents/process/:documentId`);
  console.log(`- Get document endpoint: http://localhost:${PORT}/api/documents/:documentId`);
  console.log(`- Convert endpoint: http://localhost:${PORT}/api/documents/:documentId/convert`);
});

// Handle server errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
}); 