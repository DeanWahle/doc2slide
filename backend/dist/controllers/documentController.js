"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToSlides = exports.getProcessedDocument = exports.processDocument = exports.uploadDocument = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const docxProcessor_1 = require("../services/docxProcessor");
const pdfProcessor_1 = require("../services/pdfProcessor");
const txtProcessor_1 = require("../services/txtProcessor");
const slidesService_1 = require("../services/slidesService");
// Create uploads directory if it doesn't exist
const uploadsDir = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Store processed documents in memory (in a real app, use a database)
const processedDocuments = new Map();
/**
 * Handle document upload
 */
const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
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
        res.status(200).json({
            documentId,
            message: 'Document uploaded successfully',
            status: 'uploaded'
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload document' });
    }
};
exports.uploadDocument = uploadDocument;
/**
 * Process the uploaded document
 */
const processDocument = async (req, res) => {
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
            processedContent = await (0, pdfProcessor_1.processPdf)(document.path);
        }
        else if (document.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            processedContent = await (0, docxProcessor_1.processDocx)(document.path);
        }
        else if (document.mimeType === 'text/plain') {
            processedContent = await (0, txtProcessor_1.processTxt)(document.path);
        }
        else {
            return res.status(400).json({ error: 'Unsupported file type' });
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
    }
    catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({ error: 'Failed to process document' });
    }
};
exports.processDocument = processDocument;
/**
 * Get processed document
 */
const getProcessedDocument = (req, res) => {
    try {
        const { documentId } = req.params;
        const document = processedDocuments.get(documentId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.status(200).json(document);
    }
    catch (error) {
        console.error('Retrieval error:', error);
        res.status(500).json({ error: 'Failed to retrieve document' });
    }
};
exports.getProcessedDocument = getProcessedDocument;
/**
 * Convert processed document to Google Slides
 */
const convertToSlides = async (req, res) => {
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
        const slidePresentationId = await (0, slidesService_1.createSlides)(document.content, accessToken, templateId);
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
    }
    catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: 'Failed to convert to slides' });
    }
};
exports.convertToSlides = convertToSlides;
