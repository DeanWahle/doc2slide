import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  Divider,
  Chip,
  Grid,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionIcon from '@mui/icons-material/Description';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArticleIcon from '@mui/icons-material/Article';
import DeleteIcon from '@mui/icons-material/Delete';
import { documentAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Get API URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
console.log('Upload component using API URL:', API_URL);

const Upload: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [pollingActive, setPollingActive] = useState(false);
  
  // Poll for processing progress
  useEffect(() => {
    if (!documentId || !pollingActive || status !== 'processing') {
      return;
    }
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await documentAPI.getDocumentProgress(documentId);
        const { progress, stage } = response.data;
        
        // Update progress and stage
        setProcessingProgress(progress);
        setProcessingStage(stage);
        
        // Check if processing is complete
        if (progress === 100 || stage === 'complete') {
          clearInterval(pollInterval);
          setPollingActive(false);
          setStatus('complete');
          
          // Redirect to preview after a short delay
          setTimeout(() => {
            navigate(`/preview/${documentId}`);
          }, 1000);
        }
      } catch (error) {
        console.error('Error polling for progress:', error);
      }
    }, 1000); // Poll every second
    
    return () => clearInterval(pollInterval);
  }, [documentId, pollingActive, status, navigate]);
  
  // Determine progress message based on stage
  const getProgressMessage = () => {
    switch (processingStage) {
      case 'extracting':
        return 'Extracting content from document...';
      case 'enhancing':
        return 'Enhancing content with AI...';
      case 'summarizing':
        return 'Summarizing key points...';
      case 'conclusion':
        return 'Generating conclusion slide...';
      case 'complete':
        return 'Processing complete!';
      default:
        return 'Processing document...';
    }
  };
  
  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Reset state
    setError(null);
    setUploadProgress(0);
    setProcessingProgress(0);
    setDocumentId(null);
    setStatus('idle');
    
    // Check file
    if (acceptedFiles.length === 0) {
      return;
    }
    
    const selectedFile = acceptedFiles[0];
    
    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!validTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload a PDF, DOCX, or TXT file.');
      return;
    }
    
    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }
    
    setFile(selectedFile);
  }, []);
  
  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });
  
  // Get file icon based on type
  const getFileIcon = () => {
    if (!file) return <UploadFileIcon fontSize="large" />;
    
    switch (file.type) {
      case 'application/pdf':
        return <PictureAsPdfIcon fontSize="large" color="error" />;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return <DescriptionIcon fontSize="large" color="primary" />;
      case 'text/plain':
        return <ArticleIcon fontSize="large" color="action" />;
      default:
        return <UploadFileIcon fontSize="large" />;
    }
  };
  
  // Handle file upload and processing
  const handleUpload = async () => {
    if (!file) return;
    
    try {
      // Reset state
      setError(null);
      setStatus('uploading');
      setUploadProgress(0);
      setProcessingProgress(0);
      
      // Use our API service instead of direct axios call
      const uploadResponse = await documentAPI.uploadDocument(file, (progress) => {
        setUploadProgress(progress);
      });
      
      // Get document ID from response
      const { documentId } = uploadResponse.data;
      setDocumentId(documentId);
      
      // Start processing
      setStatus('processing');
      setProcessingProgress(5);
      setProcessingStage('extracting');
      
      // Start progress polling
      setPollingActive(true);
      
      // Process document (this returns quickly now that processing is in the background)
      await documentAPI.processDocument(documentId);
      
      // Note: We don't redirect here anymore since the polling will handle that when complete
      
    } catch (error: any) {
      setStatus('error');
      setPollingActive(false);
      console.error('Full error object:', error);
      setError(
        error.response?.data?.error || 
        'An error occurred during upload or processing. Please try again.'
      );
    }
  };
  
  // Handle file removal
  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
    setStatus('idle');
    setUploadProgress(0);
    setProcessingProgress(0);
    setPollingActive(false);
  };
  
  // Modify the processing progress display
  const renderProcessingProgress = () => {
    return (
      <>
        <Typography variant="h6" align="center" gutterBottom>
          {getProgressMessage()}
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={processingProgress} 
          sx={{ height: 10, borderRadius: 5, mb: 2 }}
        />
        <Typography variant="body2" color="text.secondary" align="center">
          {processingProgress}% Complete
          {processingStage === 'enhancing' && <span> - Enhancing document content</span>}
        </Typography>
      </>
    );
  };
  
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Upload Your Document
        </Typography>
        <Typography variant="body1" paragraph align="center" color="text.secondary">
          Upload a document to convert it into a Google Slides presentation.
          We support PDF, DOCX, and TXT files.
        </Typography>
        
        <Divider sx={{ my: 3 }}>
          <Chip label="Upload" />
        </Divider>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {!file ? (
          // Dropzone for file upload
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'primary.50' : 'background.paper',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'primary.50',
              },
            }}
          >
            <input {...getInputProps()} />
            <UploadFileIcon fontSize="large" color="primary" sx={{ mb: 2 }} />
            {isDragActive ? (
              <Typography>Drop your file here...</Typography>
            ) : (
              <>
                <Typography variant="h6" gutterBottom>
                  Drag & drop your file here, or click to select
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supported formats: PDF, DOCX, TXT (Max 10MB)
                </Typography>
              </>
            )}
          </Box>
        ) : (
          // Selected file display
          <Box>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
                mb: 3,
              }}
            >
              <Box sx={{ mr: { sm: 3 }, mb: { xs: 2, sm: 0 }, display: 'flex', justifyContent: 'center' }}>
                {getFileIcon()}
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" noWrap>
                  {file.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type.split('/')[1].toUpperCase()}
                </Typography>
              </Box>
              {status === 'idle' && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleRemoveFile}
                  sx={{ mt: { xs: 2, sm: 0 } }}
                >
                  Remove
                </Button>
              )}
            </Paper>
            
            {status === 'uploading' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Uploading... {uploadProgress}%
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 8, borderRadius: 4 }} />
              </Box>
            )}
            
            {status === 'processing' && renderProcessingProgress()}
            
            {status === 'complete' && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Document processed successfully! Redirecting to preview...
              </Alert>
            )}
          </Box>
        )}
      </Paper>
      
      {file && status === 'idle' && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleUpload}
            disabled={!isAuthenticated && process.env.NODE_ENV !== 'development'}
            sx={{ px: 4 }}
          >
            Convert to Slides
          </Button>
        </Box>
      )}
      
      {!isAuthenticated && file && process.env.NODE_ENV !== 'development' && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          You need to sign in with Google to convert documents to slides.
        </Alert>
      )}
      
      {!isAuthenticated && file && process.env.NODE_ENV === 'development' && (
        <Alert severity="info" sx={{ mt: 3 }}>
          Development mode: Authentication bypassed for testing
        </Alert>
      )}
      
      <Grid container spacing={4} sx={{ mt: 6 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom color="primary">
              1. Upload
            </Typography>
            <Typography variant="body2">
              Upload your document in PDF, DOCX, or TXT format. We'll preserve the
              formatting and structure.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom color="primary">
              2. Preview
            </Typography>
            <Typography variant="body2">
              Review the extracted content and how it will be organized into slides.
              Make adjustments if needed.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom color="primary">
              3. Convert
            </Typography>
            <Typography variant="body2">
              Convert to Google Slides with a single click. The presentation will be
              available in your Google Drive.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Upload; 