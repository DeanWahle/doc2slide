import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import TableChartIcon from '@mui/icons-material/TableChart';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Simple placeholder types for the document data
interface Section {
  title: string;
  content: string;
  type: string;
}

interface Document {
  id: string;
  title: string;
  sections: Section[];
}

const Preview: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useAuth();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertSuccess, setConvertSuccess] = useState(false);
  const [slidePresentationId, setSlidePresentationId] = useState<string | null>(null);
  
  // For development mode mock data
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !documentId) {
      // Create mock data for development
      setDocument({
        id: 'mock-doc-123',
        title: 'Sample Document',
        sections: [
          {
            title: 'Introduction',
            content: 'This is a sample introduction section for testing purposes.',
            type: 'text'
          },
          {
            title: 'Key Points',
            content: '- First important point\n- Second key concept\n- Final takeaway',
            type: 'bullet_points'
          },
          {
            title: 'Conclusion',
            content: 'This concludes our sample document preview.',
            type: 'text'
          }
        ]
      });
      setLoading(false);
      return;
    }
    
    // Fetch document data in production mode
    const fetchDocument = async () => {
      try {
        if (!documentId) {
          setError('No document ID provided');
          setLoading(false);
          return;
        }
        
        const response = await axios.get(`${API_URL}/documents/${documentId}`);
        
        if (!response.data || !response.data.content) {
          setError('Failed to load document data');
          setLoading(false);
          return;
        }
        
        // Transform the API response into our simpler format
        setDocument({
          id: response.data.id,
          title: response.data.content.title,
          sections: response.data.content.sections
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching document:', error);
        setError('Failed to load document. Please try again.');
        setLoading(false);
      }
    };
    
    fetchDocument();
  }, [documentId]);
  
  // Get icon for section type
  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'bullet_points':
        return <FormatListBulletedIcon />;
      case 'table':
        return <TableChartIcon />;
      case 'text':
      default:
        return <TextFieldsIcon />;
    }
  };
  
  // Handle conversion to slides
  const handleConvertToSlides = async () => {
    // For development/testing without auth
    if (process.env.NODE_ENV === 'development' && (!isAuthenticated || !user)) {
      console.log("Development mode: Simulating conversion to Google Slides");
      setConverting(true);
      
      try {
        // Actually call the API even in development mode
        const response = await axios.post(`${API_URL}/documents/${documentId}/convert`, {
          accessToken: 'mock-token-for-development',
          templateId: 'default'
        });
        
        const { slidePresentationId } = response.data;
        setSlidePresentationId(slidePresentationId);
        setConvertSuccess(true);
      } catch (error) {
        console.error('Error during conversion:', error);
        setError('Failed to convert to Google Slides. Please try again.');
      } finally {
        setConverting(false);
      }
      
      return;
    }
    
    if (!isAuthenticated || !user) {
      login();
      return;
    }
    
    try {
      setConverting(true);
      setError(null);
      
      const response = await axios.post(`${API_URL}/documents/${documentId}/convert`, {
        accessToken: user.accessToken,
        templateId: 'default' // Use default template for now
      });
      
      setSlidePresentationId(response.data.slidePresentationId);
      setConvertSuccess(true);
    } catch (error: any) {
      setError(
        error.response?.data?.error || 
        'Failed to convert to Google Slides. Please try again.'
      );
      console.error('Conversion error:', error);
    } finally {
      setConverting(false);
    }
  };
  
  // Update the openGoogleSlides function to handle mock presentation IDs
  const openGoogleSlides = () => {
    if (!slidePresentationId) return;
    
    // Handle mock presentation IDs in development
    if (slidePresentationId.startsWith('mock-')) {
      window.alert(`In production, this would open the Google Slides presentation with ID: ${slidePresentationId}`);
      console.log(`Would open Google Slides with ID: ${slidePresentationId}`);
      return;
    }
    
    // Open actual Google Slides presentation
    window.open(`https://docs.google.com/presentation/d/${slidePresentationId}/edit`, '_blank');
  };
  
  if (loading) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading document...</Typography>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/upload')}
        >
          Back to Upload
        </Button>
      </Container>
    );
  }
  
  if (!document) {
    return (
      <Container sx={{ py: 8 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Document not found or not processed yet.
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/upload')}
        >
          Back to Upload
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/upload')}
        >
          Back to Upload
        </Button>
        
        <Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/editor/${documentId}`)}
            sx={{ mr: 2 }}
          >
            Open Slide Editor
          </Button>
          
          {!convertSuccess ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<SlideshowIcon />}
              onClick={handleConvertToSlides}
              disabled={converting}
            >
              {converting ? 'Converting...' : 'Convert to Google Slides'}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={<SlideshowIcon />}
              onClick={openGoogleSlides}
            >
              Open in Google Slides
            </Button>
          )}
        </Box>
      </Box>
      
      {convertSuccess && (
        <Alert severity="success" sx={{ mb: 4 }}>
          Document successfully converted to Google Slides!
        </Alert>
      )}
      
      <Paper sx={{ p: 4, mb: 6 }}>
        <Typography variant="body1" paragraph>
          Preview of slides generated from your document.
          Each card below represents a slide in your presentation.
        </Typography>
      </Paper>
      
      <Grid container spacing={3}>
        {document.sections.map((section, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  {getSectionIcon(section.type)}
                  <Typography variant="subtitle1" fontWeight="bold" ml={1}>
                    {section.title}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    maxHeight: 200,
                    overflow: 'auto',
                    bgcolor: 'grey.50',
                    p: 2,
                    borderRadius: 1,
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    mt: 2
                  }}
                >
                  {section.content}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      <Box display="flex" justifyContent="center" mt={6}>
        {!convertSuccess ? (
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<SlideshowIcon />}
            onClick={handleConvertToSlides}
            disabled={converting}
          >
            {converting ? (
              <>
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                Converting...
              </>
            ) : (
              'Convert to Google Slides'
            )}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={<SlideshowIcon />}
            onClick={openGoogleSlides}
          >
            Open in Google Slides
          </Button>
        )}
      </Box>
    </Container>
  );
};

export default Preview; 