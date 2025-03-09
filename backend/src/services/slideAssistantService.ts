import OpenAI from 'openai';
import dotenv from 'dotenv';
import { SlideSection } from '../types/documentTypes';

// Ensure environment variables are loaded
dotenv.config();

// Get API key from environment variable
const apiKey = process.env.OPENAI_API_KEY;

// Initialize OpenAI client only if API key is available
let openai: OpenAI | null = null;
try {
  if (apiKey) {
    openai = new OpenAI({
      apiKey: apiKey
    });
    console.log('OpenAI client initialized for Slide Assistant');
  } else {
    console.warn('OpenAI API key not found in environment variables');
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client for Slide Assistant:', error);
}

// Types for slide assistant
interface SlideModification {
  title?: string;
  content?: string;
  backgroundColor?: string;
  textColor?: string;
  imageUrl?: string;
  layout?: 'default' | 'title-only' | 'title-and-body' | 'two-column' | 'comparison';
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Process a user request to modify a slide
 */
export const processSlideModificationRequest = async (
  userMessage: string,
  currentSlide: SlideSection,
  chatHistory: ChatMessage[]
): Promise<{ 
  responseMessage: string, 
  modifications: SlideModification | null 
}> => {
  if (!openai) {
    return {
      responseMessage: "Sorry, the slide assistant is not available at the moment. Please try again later.",
      modifications: null
    };
  }

  try {
    console.log(`Processing slide modification request: "${userMessage}"`);

    // Prepare the context for the LLM
    const systemPrompt = `You are an expert slide presentation assistant. Your job is to help users modify their slides based on their requests.
You can suggest changes to slide content, formatting, layout, colors, and images.

When a user asks for a modification:
1. Understand exactly what they want to change
2. Generate a helpful, friendly response explaining what you'll change
3. Provide specific modifications in a structured format

Current slide information:
- Title: ${currentSlide.title}
- Content: ${currentSlide.content}
- Type: ${currentSlide.type}

You can modify:
- title: The slide title text
- content: The slide content (bullet points or paragraphs)
- backgroundColor: A color name or hex code for the slide background
- textColor: A color name or hex code for the text
- imageUrl: A placeholder URL for an image (in a real implementation, this would be replaced with an actual image)
- layout: The slide layout (default, title-only, title-and-body, two-column, comparison)

Respond conversationally, but also include a JSON object with your modifications in the format:
\`\`\`json
{
  "title": "New title if changed",
  "content": "New content if changed",
  "backgroundColor": "#RRGGBB if changed",
  "textColor": "#RRGGBB if changed",
  "imageUrl": "URL if adding image",
  "layout": "layout name if changed"
}
\`\`\`
Only include fields that should be changed. If no modifications are needed, return an empty JSON object.`;

    // Prepare the conversation history
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.slice(-5), // Include last 5 messages for context
      { role: 'user', content: userMessage }
    ];

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any, // Type casting to satisfy OpenAI API types
      max_tokens: 1000,
      temperature: 0.7,
    });

    // Extract the response text
    const responseText = response.choices[0].message.content?.trim() || "I'm sorry, I couldn't process your request.";
    
    // Extract JSON modifications if present
    let modifications: SlideModification | null = null;
    const jsonMatch = responseText.match(/```json\s*({[\s\S]*?})\s*```/);
    
    if (jsonMatch && jsonMatch[1]) {
      try {
        modifications = JSON.parse(jsonMatch[1]);
        console.log('Extracted modifications:', modifications);
      } catch (error) {
        console.error('Error parsing JSON modifications:', error);
      }
    }
    
    // Clean up the response to remove the JSON part
    let cleanResponse = responseText.replace(/```json\s*{[\s\S]*?}\s*```/, '').trim();
    
    return {
      responseMessage: cleanResponse,
      modifications
    };
  } catch (error) {
    console.error('Error processing slide modification request:', error);
    return {
      responseMessage: "I'm sorry, I encountered an error while processing your request. Please try again.",
      modifications: null
    };
  }
};

/**
 * Apply modifications to a slide
 */
export const applySlideModifications = (
  slide: SlideSection,
  modifications: SlideModification
): SlideSection => {
  // Create a copy of the slide
  const updatedSlide = { ...slide };
  
  // Apply modifications
  if (modifications.title) {
    updatedSlide.title = modifications.title;
  }
  
  if (modifications.content) {
    updatedSlide.content = modifications.content;
  }
  
  // In a real implementation, you would also handle:
  // - backgroundColor
  // - textColor
  // - imageUrl
  // - layout
  // These would likely be stored as additional properties on the slide
  
  return updatedSlide;
}; 