import React from 'react';
import { Container, Typography, Paper, Box, Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Settings: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  // If not authenticated, redirect to home
  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          You must be signed in to access settings.
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/')}
        >
          Go to Home
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        
        <Typography paragraph>
          This is a placeholder for the settings page. In a full implementation, you would be able to:
        </Typography>
        
        <ul>
          <li>Manage your user profile</li>
          <li>Configure Google Slides integration</li>
          <li>Set default templates</li>
          <li>Customize slide layouts</li>
        </ul>
        
        {process.env.NODE_ENV === 'development' && (
          <Alert severity="info" sx={{ mt: 4, mb: 2 }}>
            Development mode: Using mock authentication
          </Alert>
        )}
        
        <Box mt={4} display="flex" justifyContent="center">
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            Return Home
          </Button>
          
          <Button 
            variant="outlined" 
            color="error"
            onClick={logout}
          >
            Sign Out
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Settings; 