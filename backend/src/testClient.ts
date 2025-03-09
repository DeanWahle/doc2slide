import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';

const API_URL = 'http://localhost:5001';

/**
 * Test the API endpoints for document processing
 */
async function testAPI() {
  try {
    console.log('Creating test document...');
    
    // Create a test text file
    const testTextPath = path.join(__dirname, '../uploads/testclient.txt');
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
    
    fs.writeFileSync(testTextPath, textContent);
    
    console.log('Testing API endpoints...');
    
    // Step 1: Test the server connection
    try {
      const response = await axios.get(`${API_URL}/api/test`);
      console.log('Server connection successful:', response.data);
    } catch (error) {
      console.error('Server connection failed. Make sure the test server is running on port 5001.');
      process.exit(1);
    }
    
    // Step 2: Upload the document
    console.log('\nUploading document...');
    const form = new FormData();
    form.append('document', fs.createReadStream(testTextPath));
    
    const uploadResponse = await axios.post(`${API_URL}/api/documents/upload`, form, {
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
    const processResponse = await axios.post(`${API_URL}/api/documents/process/${documentId}`);
    console.log('Document processing result:', processResponse.data);
    
    // Step 4: Retrieve the processed document
    console.log('\nRetrieving processed document...');
    const getResponse = await axios.get(`${API_URL}/api/documents/${documentId}`);
    
    console.log('Document processing complete!');
    console.log('\nProcessed document sections:');
    
    // Print the sections to verify processing worked
    getResponse.data.content.sections.forEach((section: any, index: number) => {
      console.log(`\nSection ${index + 1}: ${section.title} (${section.type})`);
      console.log('-'.repeat(50));
      console.log(section.content.substring(0, 100) + (section.content.length > 100 ? '...' : ''));
    });
    
  } catch (error: any) {
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