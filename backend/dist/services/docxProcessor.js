"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processDocx = void 0;
const mammoth_1 = __importDefault(require("mammoth"));
/**
 * Process a DOCX file and extract its content
 */
const processDocx = async (filePath) => {
    try {
        // Use mammoth to convert docx to HTML
        const result = await mammoth_1.default.convertToHtml({ path: filePath });
        const htmlContent = result.value;
        // Extract and analyze content structure
        const sections = extractSections(htmlContent);
        return {
            type: 'docx',
            title: extractTitle(htmlContent),
            sections,
            rawContent: htmlContent
        };
    }
    catch (error) {
        console.error('DOCX processing error:', error);
        throw new Error('Failed to process DOCX file');
    }
};
exports.processDocx = processDocx;
/**
 * Extract the title from HTML content
 */
const extractTitle = (htmlContent) => {
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
const extractSections = (htmlContent) => {
    const sections = [];
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
    let currentSection = null;
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
const determineContentType = (content) => {
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
