import { google } from 'googleapis';
import { SlideSection } from '../types/documentTypes';
import { generateTitleDescription } from './llmProcessor';

/**
 * Create a Google Slides presentation from processed document content
 */
export const createSlides = async (
  documentContent: any, 
  accessToken: string,
  templateId?: string
): Promise<string> => {
  // For development testing without real Google access
  if (process.env.NODE_ENV === 'development' && !process.env.GOOGLE_CLIENT_ID) {
    console.log('Development mode: Creating mock presentation');
    
    // Log what would happen with real slides
    console.log(`Would create presentation titled: ${documentContent.title}`);
    console.log(`Would add ${documentContent.sections.length} content slides`);
    console.log(`Template ID: ${templateId || 'default'}`);
    
    // Wait to simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return a mock presentation ID
    return `mock-presentation-${Date.now()}`;
  }
  
  try {
    // Create OAuth client and set credentials
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    // Create Slides API client
    const slides = google.slides({ version: 'v1', auth: oauth2Client });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Create a new presentation
    let presentation;
    let presentationId: string;
    
    if (templateId) {
      // Copy the template presentation
      const copyResponse = await drive.files.copy({
        fileId: templateId,
        requestBody: {
          name: `${documentContent.title || 'Untitled'} - Generated Presentation`,
        },
      });
      
      presentationId = copyResponse.data.id!;
      presentation = await slides.presentations.get({ presentationId });
    } else {
      // Create a new blank presentation
      const createResponse = await slides.presentations.create({
        requestBody: {
          title: `${documentContent.title || 'Untitled'} - Generated Presentation`,
        },
      });
      
      presentation = createResponse.data;
      presentationId = createResponse.data.presentationId!;
    }
    
    // Generate slides from content
    await generateSlides(slides, presentationId, documentContent);
    
    return presentationId;
  } catch (error) {
    console.error('Google Slides API error:', error);
    throw new Error('Failed to create Google Slides presentation');
  }
};

/**
 * Generate slides from document content
 */
const generateSlides = async (
  slidesApi: any,
  presentationId: string,
  documentContent: any
): Promise<void> => {
  try {
    // Get existing slides info
    const presentation = await slidesApi.presentations.get({ presentationId });
    const slides = presentation.data.slides || [];
    
    // Create title slide if the presentation is new (only has one slide)
    if (slides.length <= 1) {
      await createTitleSlide(slidesApi, presentationId, documentContent.title);
    }
    
    // Generate content slides from document sections
    for (const section of documentContent.sections) {
      await createContentSlide(slidesApi, presentationId, section);
    }
    
    // Create a summary/conclusion slide
    await createConclusionSlide(slidesApi, presentationId, documentContent.title);
    
  } catch (error) {
    console.error('Slide generation error:', error);
    throw error;
  }
};

/**
 * Create a title slide
 */
const createTitleSlide = async (
  slidesApi: any,
  presentationId: string,
  title: string
): Promise<void> => {
  try {
    // Generate a subtitle for the presentation using LLM
    let subtitle = "Presentation generated with Doc2Slides";
    if (process.env.OPENAI_API_KEY) {
      subtitle = await generateTitleDescription(title);
    }
    
    await slidesApi.presentations.batchUpdate({
      presentationId,
      requestBody: {
        requests: [
          {
            createSlide: {
              slideLayoutReference: {
                predefinedLayout: 'TITLE_AND_SUBTITLE',
              },
              placeholderIdMappings: [
                {
                  layoutPlaceholder: {
                    type: 'TITLE',
                    index: 0,
                  },
                  objectId: 'titleTextBox',
                },
                {
                  layoutPlaceholder: {
                    type: 'SUBTITLE',
                    index: 0,
                  },
                  objectId: 'subtitleTextBox',
                },
              ],
            },
          },
          {
            insertText: {
              objectId: 'titleTextBox',
              text: title || 'Generated Presentation',
            },
          },
          {
            insertText: {
              objectId: 'subtitleTextBox',
              text: subtitle,
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error('Error creating title slide:', error);
    throw error;
  }
};

/**
 * Create a content slide from a document section
 */
const createContentSlide = async (
  slidesApi: any,
  presentationId: string,
  section: SlideSection
): Promise<void> => {
  try {
    // Choose slide layout based on content type
    let layout = 'TITLE_AND_BODY';
    
    if (section.type === 'bullet_points') {
      layout = 'TITLE_AND_BODY';
    } else if (section.type === 'table') {
      layout = 'TITLE_AND_BODY';
    } else if (section.type === 'image') {
      layout = 'TITLE_AND_BODY';
    }
    
    // Create slide with appropriate layout
    const createSlideResponse = await slidesApi.presentations.batchUpdate({
      presentationId,
      requestBody: {
        requests: [
          {
            createSlide: {
              slideLayoutReference: {
                predefinedLayout: layout,
              },
              placeholderIdMappings: [
                {
                  layoutPlaceholder: {
                    type: 'TITLE',
                    index: 0,
                  },
                  objectId: `titleTextBox_${Date.now()}`,
                },
                {
                  layoutPlaceholder: {
                    type: 'BODY',
                    index: 0,
                  },
                  objectId: `bodyTextBox_${Date.now()}`,
                },
              ],
            },
          },
        ],
      },
    });
    
    // Get created slide info
    const slideId = createSlideResponse.data.replies![0].createSlide!.objectId!;
    
    // Add content to the slide
    const contentRequests = [];
    
    // Add title
    contentRequests.push({
      insertText: {
        objectId: `titleTextBox_${Date.now()}`,
        text: section.title,
      },
    });
    
    // Format content based on type
    let formattedContent = '';
    
    if (section.type === 'bullet_points') {
      // For bullet points, if the content already looks like bullet points,
      // ensure proper Google Slides formatting
      const content = section.content.trim();
      
      // Check if content already has bullet markers
      if (content.match(/^[-•*]\s/m)) {
        // Content already has bullet points, standardize them
        formattedContent = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => {
            // Remove existing bullet markers and add standard one
            return line.replace(/^[-•*]\s+/, '');
          })
          .join('\n• ');
        
        // Add bullet marker to first line
        formattedContent = '• ' + formattedContent;
      } else {
        // Content doesn't have bullet markers, split by lines and add them
        formattedContent = '• ' + content.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .join('\n• ');
      }
    } else if (section.type === 'table') {
      // For tables, we'd need a more complex approach to create tables in Slides
      // For now, just include the text content
      formattedContent = section.content;
    } else {
      // For regular text, limit to key points
      const sentences = section.content
        .replace(/([.!?])\s+/g, '$1\n')
        .split('\n')
        .filter((line) => line.trim().length > 15 && line.trim().length < 100)
        .slice(0, 5);
      
      formattedContent = sentences.join('\n\n');
    }
    
    // Add formatted content
    contentRequests.push({
      insertText: {
        objectId: `bodyTextBox_${Date.now()}`,
        text: formattedContent,
      },
    });
    
    // Apply content updates
    await slidesApi.presentations.batchUpdate({
      presentationId,
      requestBody: {
        requests: contentRequests,
      },
    });
  } catch (error) {
    console.error('Error creating content slide:', error);
    throw error;
  }
};

/**
 * Create a conclusion slide
 */
const createConclusionSlide = async (
  slidesApi: any,
  presentationId: string,
  title: string
): Promise<void> => {
  await slidesApi.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [
        {
          createSlide: {
            slideLayoutReference: {
              predefinedLayout: 'TITLE_AND_BODY',
            },
            placeholderIdMappings: [
              {
                layoutPlaceholder: {
                  type: 'TITLE',
                  index: 0,
                },
                objectId: 'conclusionTitleTextBox',
              },
              {
                layoutPlaceholder: {
                  type: 'BODY',
                  index: 0,
                },
                objectId: 'conclusionBodyTextBox',
              },
            ],
          },
        },
        {
          insertText: {
            objectId: 'conclusionTitleTextBox',
            text: 'Conclusion',
          },
        },
        {
          insertText: {
            objectId: 'conclusionBodyTextBox',
            text: `Thank you for viewing "${title || 'this presentation'}".\n\nKey takeaways:\n• Generated from document content\n• Preserved structure and formatting\n• Ready for customization`,
          },
        },
      ],
    },
  });
}; 