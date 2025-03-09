import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Define the Auth User type
type AuthUser = {
  name: string;
  email: string;
  picture: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

// Define the Auth Context type
type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  refreshAuth: () => Promise<string>;
};

// Create the Auth Context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  refreshAuth: async () => '',
});

// Define the provider props
type AuthProviderProps = {
  children: React.ReactNode;
};

// API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Mock user for development/testing
const devUser: AuthUser = {
  name: "Test User",
  email: "test@example.com",
  picture: "https://via.placeholder.com/150",
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
  expiresAt: Date.now() + 3600000 // 1 hour from now
};

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // For development testing without Google auth
        if (process.env.NODE_ENV === 'development') {
          console.log('Using mock user for development');
          setUser(devUser);
          setIsLoading(false);
          return;
        }
        
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // Check if token is expired
          if (parsedUser.expiresAt < Date.now()) {
            try {
              // Attempt to refresh the token
              const response = await axios.post(`${API_URL}/auth/google/refresh`, {
                refreshToken: parsedUser.refreshToken,
              });
              
              const { access_token, expiry_date } = response.data.tokens;
              
              // Update the user with new tokens
              const updatedUser = {
                ...parsedUser,
                accessToken: access_token,
                expiresAt: expiry_date,
              };
              
              localStorage.setItem('user', JSON.stringify(updatedUser));
              setUser(updatedUser);
            } catch (error) {
              console.error('Failed to refresh token:', error);
              localStorage.removeItem('user');
              setUser(null);
            }
          } else {
            // Token still valid
            setUser(parsedUser);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Initiate login
  const login = () => {
    // For development testing, just use the mock user
    if (process.env.NODE_ENV === 'development') {
      setUser(devUser);
      return;
    }
    
    // Get Google auth URL from backend
    axios.get(`${API_URL}/auth/google/url`)
      .then(response => {
        // Redirect to Google auth
        window.location.href = response.data.url;
      })
      .catch(error => {
        console.error('Login error:', error);
      });
  };
  
  // Logout
  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };
  
  // Refresh authentication
  const refreshAuth = async (): Promise<string> => {
    // For development testing
    if (process.env.NODE_ENV === 'development') {
      return devUser.accessToken;
    }
    
    if (!user || !user.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const response = await axios.post(`${API_URL}/auth/google/refresh`, {
        refreshToken: user.refreshToken,
      });
      
      const { access_token, expiry_date } = response.data.tokens;
      
      // Update user
      const updatedUser = {
        ...user,
        accessToken: access_token,
        expiresAt: expiry_date,
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      return access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      throw error;
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using the auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext; 