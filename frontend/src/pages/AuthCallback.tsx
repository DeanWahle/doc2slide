import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Container, Alert } from '@mui/material';
import axios from 'axios';

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const AuthCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the auth code from URL
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        
        if (!code) {
          setError('No authorization code found');
          return;
        }
        
        // Exchange code for tokens
        const response = await axios.get(`${API_URL}/auth/google/callback?code=${code}`);
        
        if (!response.data || !response.data.tokens) {
          setError('Failed to get authentication tokens');
          return;
        }
        
        // Get user info
        const userResponse = await axios.get(
          `${API_URL}/auth/google/user?accessToken=${response.data.tokens.access_token}`
        );
        
        if (!userResponse.data) {
          setError('Failed to get user information');
          return;
        }
        
        // Combine tokens and user info
        const userData = {
          name: userResponse.data.names?.[0]?.displayName || 'User',
          email: userResponse.data.emailAddresses?.[0]?.value || '',
          picture: userResponse.data.photos?.[0]?.url || '',
          accessToken: response.data.tokens.access_token,
          refreshToken: response.data.tokens.refresh_token,
          expiresAt: response.data.tokens.expiry_date || Date.now() + 3600000, // 1 hour default
        };
        
        // Save user data to localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Redirect to home or original intended destination
        navigate('/');
      } catch (error) {
        console.error('Auth callback error:', error);
        setError('Failed to complete authentication. Please try again.');
      }
    };
    
    handleAuthCallback();
  }, [location, navigate]);
  
  return (
    <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <Box>
          <CircularProgress size={50} sx={{ mb: 3 }} />
          <Typography variant="h5">
            Completing authentication...
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default AuthCallback; 