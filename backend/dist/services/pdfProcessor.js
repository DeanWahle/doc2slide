"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPdf = void 0;
const pdfjs = __importStar(require("pdfjs-dist"));
const fs_1 = __importDefault(require("fs"));
// Set up PDF.js worker
const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.entry');
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
/**
 * Process a PDF file and extract its content
 */
const processPdf = async (filePath) => {
    try {
        // Load PDF document
        const data = new Uint8Array(fs_1.default.readFileSync(filePath));
        const loadingTask = pdfjs.getDocument({ data });
        const pdfDocument = await loadingTask.promise;
        // Extract text content
        const textContent = await extractTextContent(pdfDocument);
        // Analyze and structure the content
        const sections = analyzePdfContent(textContent);
        return {
            type: 'pdf',
            title: extractTitle(textContent),
            sections,
            rawContent: textContent.join('\n')
        };
    }
    catch (error) {
        console.error('PDF processing error:', error);
        throw new Error('Failed to process PDF file');
    }
};
exports.processPdf = processPdf;
/**
 * Extract text content from all pages of a PDF document
 */
const extractTextContent = async (pdfDocument) => {
    const pageTextPromises = [];
    // Extract text from each page
    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item) => 'str' in item ? item.str : '')
            .join(' ');
        pageTextPromises.push(Promise.resolve(pageText));
    }
    return Promise.all(pageTextPromises);
};
/**
 * Extract title from PDF content
 */
const extractTitle = (textContent) => {
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
const analyzePdfContent = (pageTexts) => {
    const sections = [];
    let currentSectionTitle = 'Introduction';
    let currentSectionContent = [];
    let currentSectionLevel = 1;
    // Simple heuristic to detect headings and section breaks
    const headingRegex = /^(([A-Z][a-z]*\s*){1,7})$/m;
    const sectionBreakRegex = /^[\s-_=*]{3,}$/m;
    // Process each page
    for (const pageText of pageTexts) {
        const lines = pageText.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine)
                continue;
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
const determineContentType = (content) => {
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
