# Document to Google Slides Converter

A full-stack application that converts long documents (DOCX, PDF, TXT) into Google Slides presentations. The application preserves formatting, detects sections, and will eventually support corporate templates and custom components.

## Features

- Upload documents in various formats
- Automatic content extraction and slide segmentation
- Preview generated slides before exporting
- (Coming soon) Integration with Google Slides API
- (Coming soon) Corporate template support with custom components

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- Google Cloud Platform account (for Google Slides API integration)

### Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   cd doc-to-slides
   ```

2. Install backend dependencies:

   ```
   cd backend
   npm install
   ```

3. Install frontend dependencies:

   ```
   cd ../frontend
   npm install
   ```

4. Create a `.env` file in the backend directory with the following content:

   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
   ```

   You'll need to create a project in the Google Cloud Console and enable the Google Slides API to obtain these credentials.

### Running the Application

1. Start the backend server:

   ```
   cd backend
   npm run dev
   ```

2. Start the frontend development server:

   ```
   cd ../frontend
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Upload a document using the file picker
2. The application will process the document and generate slide content
3. Preview the slide content in the application
4. (Coming soon) Export the slides to Google Slides

## Next Steps for Development

1. Improve the slide content segmentation algorithm
2. Implement Google OAuth authentication
3. Add Google Slides API integration
4. Create a template management system
5. Support for custom corporate components (timelines, etc.)

## License

MIT
