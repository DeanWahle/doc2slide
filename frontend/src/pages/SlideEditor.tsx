import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Drawer,
  TextField,
  Button,
  CircularProgress,
  AppBar,
  Toolbar,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Avatar,
  Grid,
  Tooltip,
  Slide,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  Chat as ChatIcon,
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatColorText as FormatColorTextIcon,
  FormatColorFill as FormatColorFillIcon,
  Palette as PaletteIcon,
  Image as ImageIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Menu as MenuIcon,
  Save as SaveIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Types
interface SlideSection {
  title: string;
  content: string;
  type: string;
  level: number;
}

interface Document {
  id: string;
  title: string;
  sections: SlideSection[];
  slidePresentationId?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// Transition component for slide animations
const SlideTransition = React.forwardRef(function Transition(props: any, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const SlideEditor: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const messageEndRef = useRef<null | HTMLDivElement>(null);

  // Document and slides state
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  // UI state
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isThumbnailPanelOpen, setIsThumbnailPanelOpen] = useState(true);
  const [slideZoom, setSlideZoom] = useState(100);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Chat state
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'system', content: 'Welcome to Slides Assistant. You can ask me to modify this slide in various ways, like changing colors, adding images, or rewording content.' }
  ]);
  const [isProcessingMessage, setIsProcessingMessage] = useState(false);
  
  // Slide edit state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editSlideContent, setEditSlideContent] = useState('');
  const [editSlideTitle, setEditSlideTitle] = useState('');

  // Fetch document on mount
  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  // Scroll chat to bottom when messages change
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  // Fetch document data
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
      
      // Transform the API response into our Document format
      setDocument({
        id: response.data.id,
        title: response.data.content.title,
        sections: response.data.content.sections,
        slidePresentationId: response.data.slidePresentationId
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching document:', error);
      setError('Failed to load document. Please try again.');
      setLoading(false);
    }
  };

  // Navigate between slides
  const goToNextSlide = () => {
    if (document && currentSlideIndex < document.sections.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const goToPreviousSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const goToSlide = (index: number) => {
    if (document && index >= 0 && index < document.sections.length) {
      setCurrentSlideIndex(index);
    }
  };

  // Handle chat interactions
  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !document) return;
    
    // Add user message to chat
    const userMessage = { role: 'user' as const, content: chatMessage, timestamp: new Date() };
    setChatHistory([...chatHistory, userMessage]);
    setChatMessage('');
    setIsProcessingMessage(true);
    
    try {
      // Get current slide data
      const currentSlide = document.sections[currentSlideIndex];
      
      // Send request to backend
      const response = await axios.post(`${API_URL}/slides/assistant`, {
        message: chatMessage,
        documentId: document.id,
        slideIndex: currentSlideIndex,
        chatHistory: chatHistory.map(msg => ({ role: msg.role, content: msg.content }))
      });
      
      // Extract response data
      const { message, modifications, updatedSlide } = response.data;
      
      // Update the slide if modifications were made
      if (modifications && updatedSlide) {
        const updatedDocument = { ...document };
        updatedDocument.sections[currentSlideIndex] = updatedSlide;
        setDocument(updatedDocument);
      }
      
      // Add assistant message to chat
      const assistantMessage = { 
        role: 'assistant' as const, 
        content: message, 
        timestamp: new Date() 
      };
      setChatHistory(prevChat => [...prevChat, assistantMessage]);
      
    } catch (error) {
      console.error('Error processing chat message:', error);
      setChatHistory(prevChat => [...prevChat, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request.', 
        timestamp: new Date() 
      }]);
    } finally {
      setIsProcessingMessage(false);
    }
  };

  // Open edit dialog for current slide
  const openEditDialog = () => {
    if (!document) return;
    
    const currentSlide = document.sections[currentSlideIndex];
    setEditSlideTitle(currentSlide.title);
    setEditSlideContent(currentSlide.content);
    setIsEditDialogOpen(true);
  };

  // Save edited slide
  const saveSlideEdit = () => {
    if (!document) return;
    
    // Create a copy of the document
    const updatedDocument = { ...document };
    
    // Update the current slide
    updatedDocument.sections[currentSlideIndex] = {
      ...updatedDocument.sections[currentSlideIndex],
      title: editSlideTitle,
      content: editSlideContent
    };
    
    // Update the document state
    setDocument(updatedDocument);
    setIsEditDialogOpen(false);
    
    // In a real implementation, you would also send these changes to your backend
  };

  // Render slide content
  const renderSlideContent = (slide: SlideSection) => {
    // Parse content based on content type
    if (slide.type === 'bullet_points' || slide.type === 'bullets') {
      // Split by common bullet formats
      const lines = slide.content.split(/\n+/).filter(line => line.trim() !== '');
      
      return (
        <Box>
          <Box component="ul" sx={{ pl: 2 }}>
            {lines.map((line, i) => (
              <Typography component="li" key={i} variant="body1" sx={{ mb: 1 }}>
                {line.replace(/^[•\-*]\s*/, '')}
              </Typography>
            ))}
          </Box>
        </Box>
      );
    }
    
    // Default text rendering
    return (
      <Box>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {slide.content}
        </Typography>
      </Box>
    );
  };

  // Rendering states
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error" variant="h6">{error}</Typography>
        <Button variant="contained" onClick={() => navigate('/upload')} sx={{ mt: 2 }}>
          Back to Upload
        </Button>
      </Box>
    );
  }

  if (!document || document.sections.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6">No slide content available</Typography>
        <Button variant="contained" onClick={() => navigate('/upload')} sx={{ mt: 2 }}>
          Back to Upload
        </Button>
      </Box>
    );
  }

  // Main slide editor UI
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      bgcolor: isDarkMode ? 'grey.900' : 'grey.100'
    }}>
      {/* Top toolbar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" onClick={() => navigate('/upload')}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 2, flexGrow: 1 }}>
            Slide Editor
          </Typography>
          <IconButton onClick={() => setIsDarkMode(!isDarkMode)}>
            <PaletteIcon />
          </IconButton>
          <IconButton onClick={() => setIsThumbnailPanelOpen(!isThumbnailPanelOpen)}>
            <MenuIcon />
          </IconButton>
          <Button 
            variant="contained" 
            startIcon={<SaveIcon />}
            sx={{ ml: 1 }}
          >
            Save
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ ml: 1 }}
            onClick={() => {
              if (document?.slidePresentationId) {
                window.open(`https://docs.google.com/presentation/d/${document.slidePresentationId}/edit`, '_blank');
              }
            }}
            disabled={!document?.slidePresentationId}
          >
            Open in Google Slides
          </Button>
          <IconButton 
            color={isChatOpen ? "primary" : "default"} 
            onClick={() => setIsChatOpen(!isChatOpen)}
            sx={{ ml: 1 }}
          >
            <ChatIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main content area */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Slide thumbnails panel */}
        <Drawer
          variant="persistent"
          anchor="left"
          open={isThumbnailPanelOpen}
          sx={{
            width: 240,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 240,
              position: 'relative',
              bgcolor: isDarkMode ? 'grey.800' : 'background.paper',
              color: isDarkMode ? 'common.white' : 'text.primary',
            },
          }}
        >
          <List>
            {document?.sections.map((slide, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton 
                  selected={currentSlideIndex === index} 
                  onClick={() => goToSlide(index)}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: isDarkMode ? 'primary.dark' : 'primary.light',
                    }
                  }}
                >
                  <Paper
                    sx={{
                      width: 100,
                      height: 60,
                      mr: 1,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'hidden',
                      bgcolor: isDarkMode ? 'grey.700' : 'common.white',
                      fontSize: '10px',
                      p: 1,
                    }}
                  >
                    {slide.title}
                  </Paper>
                  <ListItemText 
                    primary={`Slide ${index + 1}`} 
                    secondary={slide.title.length > 20 ? slide.title.substring(0, 20) + '...' : slide.title} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>

        {/* Slide editor area */}
        <Box sx={{ 
          flexGrow: 1, 
          p: 3, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          overflowY: 'auto',
          bgcolor: isDarkMode ? 'grey.900' : 'grey.100'
        }}>
          {/* Slide controls - moved to the top as a header for better visibility */}
          <Paper sx={{ 
            width: '100%', 
            mb: 3, 
            p: 2, 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Box display="flex" alignItems="center">
              <IconButton onClick={goToPreviousSlide} disabled={currentSlideIndex === 0}>
                <ChevronLeftIcon />
              </IconButton>
              <Typography sx={{ mx: 2 }}>
                Slide {currentSlideIndex + 1} of {document?.sections.length || 0}
              </Typography>
              <IconButton onClick={goToNextSlide} disabled={!document || currentSlideIndex === document.sections.length - 1}>
                <ChevronRightIcon />
              </IconButton>
            </Box>
            
            <Box display="flex" alignItems="center">
              <IconButton onClick={() => setSlideZoom(Math.max(50, slideZoom - 10))}>
                <ZoomOutIcon />
              </IconButton>
              <Typography sx={{ mx: 1 }}>
                {slideZoom}%
              </Typography>
              <IconButton onClick={() => setSlideZoom(Math.min(200, slideZoom + 10))}>
                <ZoomInIcon />
              </IconButton>
            </Box>
            
            <Box>
              <Tooltip title="Edit Slide">
                <IconButton onClick={openEditDialog} color="primary">
                  <FormatColorTextIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Change Background">
                <IconButton color="primary">
                  <FormatColorFillIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Add Image">
                <IconButton color="primary">
                  <ImageIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>

          {/* Slide display */}
          <Paper 
            elevation={8}
            sx={{ 
              width: `${(16 * 30) * (slideZoom / 100)}px`, 
              height: `${(9 * 30) * (slideZoom / 100)}px`,
              p: 4,
              position: 'relative',
              bgcolor: isDarkMode ? 'grey.800' : 'common.white',
              color: isDarkMode ? 'common.white' : 'text.primary',
              transition: 'all 0.3s ease'
            }}
            onClick={openEditDialog}
          >
            {document?.sections[currentSlideIndex] && renderSlideContent(document.sections[currentSlideIndex])}
          </Paper>
        </Box>

        {/* Chat drawer */}
        <Drawer
          anchor="right"
          open={isChatOpen}
          variant="persistent"
          sx={{
            width: 320,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 320,
              position: 'relative',
              bgcolor: isDarkMode ? 'grey.800' : 'background.paper',
            },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ 
              p: 2, 
              display: 'flex', 
              alignItems: 'center', 
              borderBottom: 1, 
              borderColor: 'divider' 
            }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>Slide Assistant</Typography>
              <IconButton onClick={() => setIsChatOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            
            {/* Chat messages */}
            <Box sx={{ 
              flexGrow: 1, 
              p: 2, 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}>
              {chatHistory.map((msg, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    gap: 1,
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main',
                      width: 32,
                      height: 32,
                    }}
                  >
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </Avatar>
                  <Paper
                    sx={{
                      p: 1.5,
                      maxWidth: '80%',
                      bgcolor: msg.role === 'user' ? 'primary.light' : 'grey.100',
                      borderRadius: 2,
                      color: msg.role === 'user' ? 'white' : 'text.primary',
                    }}
                  >
                    <Typography variant="body2">{msg.content}</Typography>
                    {msg.timestamp && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    )}
                  </Paper>
                </Box>
              ))}
              {isProcessingMessage && (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={24} />
                </Box>
              )}
              <div ref={messageEndRef} />
            </Box>
            
            {/* Chat input */}
            <Box sx={{ 
              p: 2, 
              borderTop: 1, 
              borderColor: 'divider',
              display: 'flex',
              gap: 1,
            }}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Ask me to edit this slide..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isProcessingMessage}
              />
              <IconButton 
                color="primary" 
                onClick={handleSendMessage}
                disabled={isProcessingMessage || !chatMessage.trim()}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </Drawer>
      </Box>

      {/* Edit dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onClose={() => setIsEditDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Edit Slide</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Slide Title"
            fullWidth
            variant="outlined"
            value={editSlideTitle}
            onChange={(e) => setEditSlideTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Slide Content"
            multiline
            fullWidth
            variant="outlined"
            value={editSlideContent}
            onChange={(e) => setEditSlideContent(e.target.value)}
            rows={12}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveSlideEdit} variant="contained" color="primary">Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SlideEditor; 