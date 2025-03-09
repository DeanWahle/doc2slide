import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  
  // Handle user menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle user menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle logout
  const handleLogout = () => {
    handleMenuClose();
    logout();
  };
  
  return (
    <AppBar position="static">
      <Toolbar>
        {/* Logo and App Name */}
        <Box display="flex" alignItems="center">
          <DescriptionIcon sx={{ mr: 1 }} />
          <SlideshowIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 'bold',
            }}
          >
            Doc2Slides
          </Typography>
          
          {process.env.NODE_ENV === 'development' && (
            <Chip 
              label="DEV" 
              color="secondary" 
              size="small" 
              sx={{ ml: 1 }}
            />
          )}
        </Box>
        
        {/* Navigation */}
        <Box sx={{ flexGrow: 1, ml: 3 }}>
          <Button
            color="inherit"
            component={RouterLink}
            to="/"
            sx={{ 
              fontWeight: location.pathname === '/' ? 'bold' : 'normal',
              borderBottom: location.pathname === '/' ? '2px solid white' : 'none'
            }}
          >
            Home
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/upload"
            sx={{ 
              ml: 2,
              fontWeight: location.pathname === '/upload' ? 'bold' : 'normal',
              borderBottom: location.pathname === '/upload' ? '2px solid white' : 'none'
            }}
          >
            Upload
          </Button>
          {isAuthenticated && (
            <Button
              color="inherit"
              component={RouterLink}
              to="/settings"
              sx={{ 
                ml: 2,
                fontWeight: location.pathname === '/settings' ? 'bold' : 'normal',
                borderBottom: location.pathname === '/settings' ? '2px solid white' : 'none'
              }}
            >
              Settings
            </Button>
          )}
        </Box>
        
        {/* Authentication */}
        <Box>
          {isAuthenticated ? (
            <>
              <Tooltip title="Account settings">
                <IconButton
                  onClick={handleMenuOpen}
                  size="small"
                  aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
                >
                  <Avatar
                    alt={user?.name || 'User'}
                    src={user?.picture}
                    sx={{ width: 32, height: 32 }}
                  />
                </IconButton>
              </Tooltip>
              <Menu
                id="account-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={handleMenuClose} component={RouterLink} to="/settings">
                  Settings
                </MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              color="inherit"
              variant="outlined"
              onClick={login}
              startIcon={<SlideshowIcon />}
            >
              Sign in with Google
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 