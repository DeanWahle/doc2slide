"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTxt = void 0;
const fs_1 = __importDefault(require("fs"));
/**
 * Process a TXT file and extract its content
 */
const processTxt = async (filePath) => {
    try {
        // Read the text file
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        // Extract title and segments
        const title = extractTitle(content);
        const sections = segmentContent(content);
        return {
            type: 'txt',
            title,
            sections,
            rawContent: content
        };
    }
    catch (error) {
        console.error('TXT processing error:', error);
        throw new Error('Failed to process TXT file');
    }
};
exports.processTxt = processTxt;
/**
 * Extract a title from the text content
 */
const extractTitle = (content) => {
    const lines = content.split('\n');
    // Find the first non-empty line
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && trimmedLine.length > 3) {
            return trimmedLine;
        }
    }
    return 'Untitled Document';
};
/**
 * Segment text content into logical sections
 */
const segmentContent = (content) => {
    const lines = content.split('\n');
    const sections = [];
    // Simple rule to detect headings:
    // - All uppercase
    // - Surrounded by blank lines
    // - Ends with colon
    // - Short line length compared to paragraphs
    let currentSectionTitle = 'Introduction';
    let currentSectionContent = [];
    let currentSectionLevel = 1;
    // Check each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Skip empty lines
        if (!line)
            continue;
        // Check if line is likely a header
        const isHeader = (line.toUpperCase() === line && line.length > 3 && line.length < 50) || // All caps
            (line.endsWith(':') && line.length < 50) || // Ends with colon
            (i > 0 && i < lines.length - 1 && !lines[i - 1].trim() && !lines[i + 1].trim() && line.length < 50); // Surrounded by blank lines
        if (isHeader) {
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
            currentSectionTitle = line;
            // Try to guess section level
            if (line.startsWith('  ')) {
                currentSectionLevel = 2;
            }
            else if (line.startsWith('    ')) {
                currentSectionLevel = 3;
            }
            else if (line.toUpperCase() === line) {
                currentSectionLevel = 1;
            }
            else {
                currentSectionLevel = 2;
            }
            continue;
        }
        // Add to current section content
        currentSectionContent.push(line);
    }
    // Add the last section
    if (currentSectionContent.length > 0) {
        sections.push({
            title: currentSectionTitle,
            level: currentSectionLevel,
            content: currentSectionContent.join('\n'),
            type: determineContentType(currentSectionContent.join('\n'))
        });
    }
    // If no sections detected, create single section with all content
    if (sections.length === 0) {
        sections.push({
            title: 'Main Content',
            level: 1,
            content,
            type: 'text'
        });
    }
    return sections;
};
/**
 * Determine the content type based on text patterns
 */
const determineContentType = (content) => {
    const lines = content.split('\n');
    // Check for bullet points
    const bulletLinesCount = lines.filter(line => line.trim().match(/^[-*•]\s/) ||
        line.trim().match(/^\d+[.)]\s/)).length;
    if (bulletLinesCount > 0 && bulletLinesCount / lines.length > 0.3) {
        return 'bullet_points';
    }
    // Check for tables (simple detection)
    const tableLinesCount = lines.filter(line => line.includes('|') || line.includes('+---') || line.includes('+===')).length;
    if (tableLinesCount > 3 && tableLinesCount / lines.length > 0.3) {
        return 'table';
    }
    return 'text';
};
