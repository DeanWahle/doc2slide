import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Paper,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PresentationIcon from '@mui/icons-material/Slideshow';
import TemplateIcon from '@mui/icons-material/Dashboard';
import { useAuth } from '../contexts/AuthContext';

const Home: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  
  return (
    <>
      {/* Hero Section */}
      <Paper
        sx={{
          position: 'relative',
          bgcolor: 'primary.dark',
          color: 'white',
          py: 8,
          mb: 6,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h2" component="h1" gutterBottom>
                Documents to Slides in Minutes
              </Typography>
              <Typography variant="h5" paragraph>
                Convert your documents into professional presentations with a single click.
                Preserve formatting, organize content, and save hours of manual work.
              </Typography>
              <Box mt={4}>
                {isAuthenticated ? (
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    component={RouterLink}
                    to="/upload"
                    startIcon={<UploadFileIcon />}
                  >
                    Upload Document
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    onClick={login}
                    startIcon={<UploadFileIcon />}
                  >
                    Sign in to Get Started
                  </Button>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  height: '300px',
                  width: '100%',
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box 
                  sx={{ 
                    width: '80%', 
                    height: '80%', 
                    position: 'relative',
                    background: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 10px 10px',
                    borderRadius: 1,
                    boxShadow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    p: 2,
                  }}
                >
                  <Box sx={{ height: '20%', bgcolor: 'primary.main', borderRadius: 1, mb: 1, width: '50%' }} />
                  <Box sx={{ height: '10%', bgcolor: 'primary.light', borderRadius: 1, mb: 1, width: '80%' }} />
                  <Box sx={{ height: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                    <Box sx={{ height: '20%', bgcolor: 'secondary.light', borderRadius: 1, width: '80%' }} />
                    <Box sx={{ height: '20%', bgcolor: 'secondary.light', borderRadius: 1, width: '70%' }} />
                    <Box sx={{ height: '20%', bgcolor: 'secondary.light', borderRadius: 1, width: '60%' }} />
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Paper>
      
      {/* Features Section */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Typography
          variant="h3"
          component="h2"
          align="center"
          gutterBottom
          sx={{ mb: 6 }}
        >
          Features
        </Typography>
        
        <Grid container spacing={4} justifyContent="center">
          {/* Feature 1 */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <UploadFileIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h5" component="h3" gutterBottom>
                  Multiple Formats
                </Typography>
                <Typography>
                  Upload DOCX, PDF, or TXT files and convert them with their formatting preserved.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Feature 2 */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <AutoAwesomeIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h5" component="h3" gutterBottom>
                  Smart Processing
                </Typography>
                <Typography>
                  AI-powered content analysis identifies sections, bullet points, and key content automatically.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Feature 3 */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <PresentationIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h5" component="h3" gutterBottom>
                  Google Slides
                </Typography>
                <Typography>
                  Directly export to Google Slides for easy sharing, editing, and presenting.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Feature 4 */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <TemplateIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h5" component="h3" gutterBottom>
                  Custom Templates
                </Typography>
                <Typography>
                  Apply your own templates and themes for consistent, branded presentations.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
      
      {/* Call to Action */}
      <Box sx={{ bgcolor: 'secondary.light', py: 6 }}>
        <Container maxWidth="md">
          <Typography variant="h4" align="center" gutterBottom>
            Ready to save hours on presentation creation?
          </Typography>
          <Box display="flex" justifyContent="center" mt={3}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              component={RouterLink}
              to="/upload"
            >
              Start Converting
            </Button>
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default Home; 