import fs from 'fs';
import path from 'path';
import { processDocx } from './services/docxProcessor';
import { processPdf } from './services/pdfProcessor';
import { processTxt } from './services/txtProcessor';

// Create a simple test function
async function testProcessors() {
  console.log('Running processor tests...');
  
  // Create a test text file
  const testTextPath = path.join(__dirname, '../uploads/test.txt');
  const textContent = `
Test Document Title

INTRODUCTION:
This is a simple introduction to the document.
It contains multiple lines and should be processed correctly.

MAIN SECTION:
- Point 1: Testing bullet points
- Point 2: Making sure they're detected
- Point 3: And properly formatted

CONCLUSION:
In conclusion, this document tests our processing logic.
  `;
  
  fs.writeFileSync(testTextPath, textContent);
  
  try {
    // Test text processor
    console.log('Testing TXT processor...');
    const txtResult = await processTxt(testTextPath);
    console.log('TXT Result:', JSON.stringify(txtResult, null, 2));
    
    console.log('\nText processing test completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testProcessors().then(() => {
  console.log('All tests completed!');
}).catch(err => {
  console.error('Test suite failed:', err);
}); 