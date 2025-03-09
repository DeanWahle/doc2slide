"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const form_data_1 = __importDefault(require("form-data"));
const path_1 = __importDefault(require("path"));
const API_URL = 'http://localhost:5001';
/**
 * Test the API endpoints for document processing
 */
async function testAPI() {
    try {
        console.log('Creating test document...');
        // Create a test text file
        const testTextPath = path_1.default.join(__dirname, '../uploads/testclient.txt');
        const textContent = `
Test Document Title for API

INTRODUCTION:
This is a test document for the API endpoints.
It contains some text that should be processed properly.

MAIN POINTS:
- First important point
- Second important idea
- Final key concept

CONCLUSION:
This concludes our test document.
    `;
        fs_1.default.writeFileSync(testTextPath, textContent);
        console.log('Testing API endpoints...');
        // Step 1: Test the server connection
        try {
            const response = await axios_1.default.get(`${API_URL}/api/test`);
            console.log('Server connection successful:', response.data);
        }
        catch (error) {
            console.error('Server connection failed. Make sure the test server is running on port 5001.');
            process.exit(1);
        }
        // Step 2: Upload the document
        console.log('\nUploading document...');
        const form = new form_data_1.default();
        form.append('document', fs_1.default.createReadStream(testTextPath));
        const uploadResponse = await axios_1.default.post(`${API_URL}/api/documents/upload`, form, {
            headers: {
                ...form.getHeaders()
            }
        });
        if (!uploadResponse.data.documentId) {
            throw new Error('Document upload failed');
        }
        const documentId = uploadResponse.data.documentId;
        console.log('Document uploaded successfully. ID:', documentId);
        // Step 3: Process the document
        console.log('\nProcessing document...');
        const processResponse = await axios_1.default.post(`${API_URL}/api/documents/process/${documentId}`);
        console.log('Document processing result:', processResponse.data);
        // Step 4: Retrieve the processed document
        console.log('\nRetrieving processed document...');
        const getResponse = await axios_1.default.get(`${API_URL}/api/documents/${documentId}`);
        console.log('Document processing complete!');
        console.log('\nProcessed document sections:');
        // Print the sections to verify processing worked
        getResponse.data.content.sections.forEach((section, index) => {
            console.log(`\nSection ${index + 1}: ${section.title} (${section.type})`);
            console.log('-'.repeat(50));
            console.log(section.content.substring(0, 100) + (section.content.length > 100 ? '...' : ''));
        });
    }
    catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response error:', error.response.data);
        }
    }
}
// Run the test client
console.log('Starting API test client...');
testAPI().then(() => {
    console.log('\nAPI testing completed.');
}).catch(err => {
    console.error('Test client error:', err);
});
