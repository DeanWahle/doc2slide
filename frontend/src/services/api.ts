import axios from 'axios';

// API base URL - make sure it's pointing to port 5001
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Log the API URL being used (for debugging)
console.log('Using API URL:', API_URL);

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout and withCredentials for better reliability
  timeout: 30000,
  withCredentials: true
});

// Auth endpoints
export const authAPI = {
  // Get Google auth URL
  getAuthUrl: () => apiClient.get('/auth/google/url'),
  
  // Get user info
  getUserInfo: (accessToken: string) => 
    apiClient.get(`/auth/google/user?accessToken=${accessToken}`),
  
  // Refresh access token
  refreshToken: (refreshToken: string) => 
    apiClient.post('/auth/google/refresh', { refreshToken }),
};

// Document endpoints
export const documentAPI = {
  // Upload document
  uploadDocument: (file: File, onUploadProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('document', file);
    
    return apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds timeout for uploads
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onUploadProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(progress);
        }
      },
    });
  },
  
  // Process document
  processDocument: (documentId: string) => 
    apiClient.post(`/documents/process/${documentId}`, {}, {
      timeout: 120000, // 120 seconds (2 minutes) for processing
    }),
  
  // Get document processing progress
  getDocumentProgress: (documentId: string) => 
    apiClient.get(`/documents/${documentId}/progress`),
  
  // Get processed document
  getDocument: (documentId: string) => 
    apiClient.get(`/documents/${documentId}`),
  
  // Convert to slides
  convertToSlides: (documentId: string, accessToken: string, templateId?: string) => 
    apiClient.post(`/documents/${documentId}/convert`, {
      accessToken,
      templateId,
    }),
};

// Configure auth header
export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export default {
  auth: authAPI,
  documents: documentAPI,
}; 