"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const docxProcessor_1 = require("./services/docxProcessor");
const pdfProcessor_1 = require("./services/pdfProcessor");
const txtProcessor_1 = require("./services/txtProcessor");
// Load environment variables
dotenv_1.default.config();
// Create a simple Express server
const app = (0, express_1.default)();
const PORT = 5001;
// Create uploads directory if it doesn't exist
const uploadsDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Set up multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    }
});
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Store processed documents in memory
const processedDocuments = new Map();
// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});
// Upload route
app.post('/api/documents/upload', upload.single('document'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const documentId = Date.now().toString();
        processedDocuments.set(documentId, {
            id: documentId,
            originalName: req.file.originalname,
            path: req.file.path,
            mimeType: req.file.mimetype,
            status: 'uploaded',
            uploadedAt: new Date()
        });
        res.status(200).json({
            documentId,
            message: 'Document uploaded successfully'
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload document' });
    }
});
// Process document route
app.post('/api/documents/process/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        const document = processedDocuments.get(documentId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
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
            message: 'Document processed successfully'
        });
    }
    catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({ error: 'Failed to process document' });
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
// Start server
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
    console.log(`- Upload endpoint: http://localhost:${PORT}/api/documents/upload`);
    console.log(`- Process endpoint: http://localhost:${PORT}/api/documents/process/:documentId`);
    console.log(`- Get document endpoint: http://localhost:${PORT}/api/documents/:documentId`);
});
