import OpenAI from 'openai';
import { DocumentContent, SlideSection } from '../types/documentTypes';
import dotenv from 'dotenv';

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
    console.log('OpenAI client initialized successfully');
  } else {
    console.warn('OpenAI API key not found in environment variables');
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

// Global progress tracking for different documents
export const processingProgress = new Map<string, {
  totalChunks: number;
  processedChunks: number;
  stage: 'extracting' | 'enhancing' | 'summarizing' | 'conclusion' | 'complete';
  progress: number;
}>();

/**
 * Updates the processing progress for a document
 */
export const updateProgress = (documentId: string, data: Partial<{
  totalChunks: number;
  processedChunks: number;
  stage: 'extracting' | 'enhancing' | 'summarizing' | 'conclusion' | 'complete';
  progress: number;
}>) => {
  const current = processingProgress.get(documentId) || {
    totalChunks: 0,
    processedChunks: 0,
    stage: 'extracting' as const,
    progress: 0
  };
  
  processingProgress.set(documentId, {
    ...current,
    ...data
  });
  
  // Calculate overall progress percentage
  const progress = processingProgress.get(documentId)!;
  
  let calculatedProgress = 0;
  
  if (progress.stage === 'extracting') {
    calculatedProgress = 10; // Start at 10%
  } else if (progress.stage === 'enhancing') {
    if (progress.totalChunks > 0) {
      // 10-80% range for enhancement
      calculatedProgress = 10 + (progress.processedChunks / progress.totalChunks) * 70;
    } else {
      calculatedProgress = 50; // Default to 50% if no chunks info
    }
  } else if (progress.stage === 'summarizing') {
    calculatedProgress = 80; // 80%
  } else if (progress.stage === 'conclusion') {
    calculatedProgress = 90; // 90%
  } else if (progress.stage === 'complete') {
    calculatedProgress = 100; // 100%
  }
  
  // Set the calculated progress
  progress.progress = Math.round(calculatedProgress);
  
  console.log(`Document ${documentId} processing progress: ${progress.progress}%`);
};

/**
 * Roughly estimate token count based on words (assuming 4 chars per token on average)
 * This is a simple estimation, not perfect but helps prevent token limit errors
 */
const estimateTokenCount = (text: string): number => {
  // A rough estimate: 1 token is about 4 characters or 0.75 words
  return Math.ceil(text.length / 4);
};

/**
 * Split text into chunks that stay within token limits
 * @param text The text to split
 * @param maxTokens Maximum tokens per chunk (default 4000 to leave room for prompt and completion)
 * @returns Array of text chunks
 */
const splitIntoChunks = (text: string, maxTokens: number = 4000): string[] => {
  const chunks: string[] = [];
  const totalTokens = estimateTokenCount(text);
  
  // If text is already within limits, return as is
  if (totalTokens <= maxTokens) {
    return [text];
  }
  
  // Split text into paragraphs
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = '';
  let currentChunkTokens = 0;
  
  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokenCount(paragraph);
    
    // If a single paragraph exceeds token limit, split it by sentences
    if (paragraphTokens > maxTokens) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokenCount(sentence);
        
        if (currentChunkTokens + sentenceTokens > maxTokens) {
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = sentence;
            currentChunkTokens = sentenceTokens;
          } else {
            // If a single sentence exceeds the limit, we need to split it (rare case)
            const words = sentence.split(' ');
            let sentenceChunk = '';
            let sentenceChunkTokens = 0;
            
            for (const word of words) {
              const wordTokens = estimateTokenCount(word + ' ');
              if (sentenceChunkTokens + wordTokens > maxTokens) {
                chunks.push(sentenceChunk);
                sentenceChunk = word + ' ';
                sentenceChunkTokens = wordTokens;
              } else {
                sentenceChunk += word + ' ';
                sentenceChunkTokens += wordTokens;
              }
            }
            
            if (sentenceChunk) {
              currentChunk = sentenceChunk;
              currentChunkTokens = sentenceChunkTokens;
            }
          }
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
          currentChunkTokens += sentenceTokens;
        }
      }
    } else if (currentChunkTokens + paragraphTokens > maxTokens) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
      currentChunkTokens = paragraphTokens;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentChunkTokens += paragraphTokens;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
};

/**
 * Process a single section through the LLM, handling token limits
 */
const processSection = async (section: SlideSection, index: number, documentId?: string): Promise<SlideSection> => {
  if (!openai) {
    return section;
  }
  
  try {
    console.log(`Processing section ${index + 1}: ${section.title}`);
    
    // Skip processing if the section is too short
    if (section.content.length < 20) {
      console.log('Section content too short, skipping LLM processing');
      return section;
    }
    
    // Estimate token count
    const estimatedTokens = estimateTokenCount(section.content);
    console.log(`Estimated tokens for section: ${estimatedTokens}`);
    
    // If content is within limits, process normally
    if (estimatedTokens <= 4000) {
      if (documentId) {
        updateProgress(documentId, { 
          totalChunks: 1, 
          processedChunks: 0, 
          stage: 'enhancing' 
        });
      }
      
      // Prepare the prompt based on content type
      let prompt = '';
      if (section.type === 'bullet_points') {
        prompt = `Transform this content into an engaging slide titled "${section.title}" following best presentation practices. 
        
Content to transform:

${section.content}

Create a slide that includes:
1. A concise, informative heading (use the provided title unless you can improve it)
2. 3-6 key bullet points that capture the essential information
3. Each bullet point should be brief but meaningful (1-2 lines maximum)
4. Ensure logical flow and coherence between points
5. Focus on the most important insights, data, or concepts`;
      } else {
        prompt = `Transform this content into an engaging slide titled "${section.title}" following best presentation practices.
        
Content to transform:

${section.content}

Create a slide that includes:
1. A concise, informative heading (use the provided title unless you can improve it)
2. 3-6 key bullet points that capture the essential information
3. Each bullet point should be brief but meaningful (1-2 lines maximum)
4. Ensure logical flow and coherence between points
5. Focus on the most important insights, data, or concepts`;
      }
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: `You are an expert at converting detailed documents into engaging and informative Google Slides or PowerPoint presentations. Follow this structured approach precisely:

Step 1: Analyze and Summarize

Carefully read the entire document to grasp the main ideas, arguments, key insights, and supporting details.

Identify the document's core message, purpose, and intended audience.

Step 2: Slide Structure Outline

Develop a clear slide outline, ensuring logical flow and coherence:

Title Slide: Clear title and subtitle reflecting the document’s main idea.

Agenda Slide: List topics covered in the presentation.

Introduction Slide: Brief context, objectives, or background information.

Body Slides: Divide the main content into digestible sections. Each slide should have:

A concise, informative heading.

Key bullet points summarizing main ideas.

Relevant supporting evidence or data points (charts, graphs, quotes, etc., if applicable).

Summary Slide: Concise recap of the main points.

Actionable Insights or Next Steps Slide: Clearly defined takeaways or actions suggested by the document.

Q&A Slide: Invite questions or discussion points.

Step 3: Slide Content Creation

For each slide, clearly and succinctly present the information:

Limit text to short phrases or bullet points.

Highlight only the most essential information.

Recommend appropriate visuals or graphics (charts, tables, diagrams) when useful for enhancing understanding.

Step 4: Visual and Design Recommendations

Suggest a visual theme or style suitable for the audience and topic.

Recommend minimalistic yet appealing designs (fonts, color schemes, layouts).

Step 5: Speaker Notes

Provide concise speaker notes for each slide to guide the presenter, containing deeper explanations, context, or relevant examples from the document.

Ensure clarity, brevity, and visual appeal, enabling the audience to easily understand and engage with the presentation.` 
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 700,
        temperature: 0.7,
      });
      
      // Extract the enhanced content
      const enhancedContent = response.choices[0].message.content?.trim() || section.content;
      
      console.log(`Section ${index + 1} enhanced`);
      
      if (documentId) {
        updateProgress(documentId, { 
          processedChunks: 1
        });
      }
      
      // Return enhanced section
      return {
        ...section,
        content: enhancedContent,
        type: 'bullet_points' // Mark as bullet points
      };
    } else {
      // For large sections, split into chunks and process each chunk
      console.log(`Section ${index + 1} is too large (${estimatedTokens} tokens), splitting into chunks...`);
      const chunks = splitIntoChunks(section.content);
      console.log(`Split into ${chunks.length} chunks`);
      
      if (documentId) {
        updateProgress(documentId, { 
          totalChunks: chunks.length, 
          processedChunks: 0, 
          stage: 'enhancing' 
        });
      }
      
      let enhancedChunks: string[] = [];
      
      // Process each chunk separately
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunks.length} of section ${index + 1}`);
        
        let prompt = '';
        if (i === 0) {
          prompt = `This is part 1 of ${chunks.length} from a section titled "${section.title}". Extract the key points that would be most valuable for a presentation slide:

${chunks[i]}`;
        } else {
          prompt = `This is part ${i + 1} of ${chunks.length} from a section titled "${section.title}". Extract additional key points that would be most valuable for a presentation slide:

${chunks[i]}`;
        }
        
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { 
                role: "system", 
                content: `You are an expert at analyzing documents and extracting key information for presentation slides. Your task is to:

1. Carefully read the provided content (which is part of a larger document)
2. Identify the 2-3 most important points that should appear on a presentation slide
3. Convert these points into concise, well-formatted bullet points (1-2 lines each)
4. Focus on insights, conclusions, data points, or concepts that provide the most value
5. Ensure bullet points are clear, specific, and meaningful even without the surrounding context

Your output should be ONLY the bullet points, without any additional commentary, explanations, or formatting instructions.` 
              },
              { role: "user", content: prompt }
            ],
            max_tokens: 350,
            temperature: 0.7,
          });
          
          const chunkContent = response.choices[0].message.content?.trim() || '';
          if (chunkContent) {
            enhancedChunks.push(chunkContent);
          }
          
          if (documentId) {
            updateProgress(documentId, { 
              processedChunks: i + 1
            });
          }
          
        } catch (chunkError) {
          console.error(`Error processing chunk ${i + 1} of section ${index + 1}:`, chunkError);
          // If a chunk fails, try to extract some content from it manually
          const simplifiedBullets = chunks[i]
            .split(/\n+/) // Split by newlines
            .filter(line => line.length > 30) // Keep only substantial lines
            .slice(0, 3) // Take up to 3 items
            .map(line => `• ${line.substring(0, 100)}...`) // Format as bullets and truncate
            .join('\n');
          
          if (simplifiedBullets) {
            enhancedChunks.push(simplifiedBullets);
          }
          
          if (documentId) {
            updateProgress(documentId, { 
              processedChunks: i + 1
            });
          }
        }
      }
      
      // Combine the enhanced chunks
      const combinedContent = enhancedChunks.join('\n\n');
      
      // If we have too many bullet points, summarize them further
      if (enhancedChunks.length > 2) {
        try {
          console.log(`Summarizing combined chunks for section ${index + 1}`);
          
          if (documentId) {
            updateProgress(documentId, { 
              stage: 'summarizing' 
            });
          }
          
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { 
                role: "system", 
                content: `You are an expert at creating focused, impactful presentation slides. Your task is to:

1. Review the provided bullet points (which come from different parts of the same document section)
2. Identify the most important 4-6 points that should appear on a single slide
3. Eliminate redundancies, consolidate similar points, and ensure variety of insights
4. Restructure the points in a logical order that tells a coherent story
5. Refine the language to be concise, clear, and impactful
6. Ensure each bullet point is brief (1-2 lines maximum)

Your output should be ONLY the final bullet points for the slide, without any additional commentary, explanations, or formatting instructions.` 
              },
              { role: "user", content: `Create a focused presentation slide titled "${section.title}" by refining these extracted bullet points into 4-6 key takeaways:

${combinedContent}` }
            ],
            max_tokens: 700,
            temperature: 0.7,
          });
          
          const finalContent = response.choices[0].message.content?.trim() || combinedContent;
          
          console.log(`Section ${index + 1} enhanced (summarized from ${chunks.length} chunks)`);
          
          return {
            ...section,
            content: finalContent,
            type: 'bullet_points'
          };
        } catch (summaryError) {
          console.error(`Error summarizing combined chunks for section ${index + 1}:`, summaryError);
        }
      }
      
      console.log(`Section ${index + 1} enhanced (from ${chunks.length} chunks)`);
      
      return {
        ...section,
        content: combinedContent || section.content,
        type: 'bullet_points'
      };
    }
  } catch (error) {
    console.error(`Error enhancing section ${index + 1}:`, error);
    return section; // Return original if processing fails
  }
};

/**
 * Enhance document content using OpenAI to create better slide presentations
 */
export const enhanceWithLLM = async (content: DocumentContent, documentId?: string): Promise<DocumentContent> => {
  console.log('Enhancing document content with LLM...');
  
  // Initialize progress tracking if documentId provided
  if (documentId) {
    updateProgress(documentId, {
      totalChunks: 0,
      processedChunks: 0,
      stage: 'extracting',
      progress: 10
    });
  }
  
  // If OpenAI client is not available, return original content
  if (!openai) {
    console.warn('Skipping LLM enhancement - OpenAI client not available');
    
    if (documentId) {
      updateProgress(documentId, {
        stage: 'complete',
        progress: 100
      });
    }
    
    return content;
  }
  
  try {
    // Process each section through the LLM
    const enhancedSections = await Promise.all(
      content.sections.map((section, index) => processSection(section, index, documentId))
    );
    
    if (documentId) {
      updateProgress(documentId, {
        stage: 'conclusion'
      });
    }
    
    return {
      ...content,
      sections: enhancedSections
    };
  } catch (error) {
    console.error('LLM enhancement error:', error);
    
    if (documentId) {
      updateProgress(documentId, {
        stage: 'complete',
        progress: 100
      });
    }
    
    return content; // Return original content if processing fails
  }
};

/**
 * Generate a title slide description
 */
export const generateTitleDescription = async (title: string): Promise<string> => {
  // If OpenAI client is not available, return a default description
  if (!openai) {
    console.warn('Skipping title description generation - OpenAI client not available');
    return "Created with Doc2Slides";
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are an expert at creating compelling presentation titles and subtitles. Your task is to:

1. Analyze the provided presentation title
2. Create a brief, engaging subtitle that:
   - Captures the essence or purpose of the presentation
   - Provides context or additional information
   - Creates interest and encourages audience engagement
   - Is concise (10-15 words maximum)
   - Uses professional but engaging language
   - Complements rather than repeats the main title

Your output should be ONLY the subtitle text, without any additional commentary, explanations, or formatting instructions.` 
        },
        { 
          role: "user", 
          content: `Create an engaging, professional subtitle for a presentation titled "${title}". Keep it concise and compelling.` 
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });
    
    return response.choices[0].message.content?.trim() || "Presentation created with Doc2Slides";
  } catch (error) {
    console.error('Error generating title description:', error);
    return "Presentation created with Doc2Slides";
  }
};

/**
 * Generate a conclusion slide
 */
export const generateConclusionSlide = async (documentContent: DocumentContent, documentId?: string): Promise<SlideSection> => {
  // If OpenAI client is not available, return a basic conclusion slide
  if (!openai) {
    console.warn('Skipping LLM conclusion generation - OpenAI client not available');
    
    if (documentId) {
      updateProgress(documentId, {
        stage: 'complete',
        progress: 100
      });
    }
    
    return {
      title: "Conclusion",
      content: "Thank you for your attention!",
      type: "bullets",
      level: 1
    };
  }

  try {
    if (documentId) {
      updateProgress(documentId, {
        stage: 'conclusion'
      });
    }
    
    // Extract section titles, but limit to avoid token limit issues
    // Take first 3, last 2, and estimate total tokens
    const allSectionTitles = documentContent.sections.map(section => section.title);
    let sectionTitlesForPrompt: string[];
    
    if (allSectionTitles.length <= 10) {
      sectionTitlesForPrompt = allSectionTitles;
    } else {
      // Take first 5 and last 5 sections if there are many
      const firstSections = allSectionTitles.slice(0, 5);
      const lastSections = allSectionTitles.slice(-5);
      sectionTitlesForPrompt = [...firstSections, ...lastSections];
    }
    
    const sectionTitlesText = sectionTitlesForPrompt.join(", ");
    console.log(`Generating conclusion from ${sectionTitlesForPrompt.length} section titles`);
    
    // Extract a sample of content from sections for better context
    let sampleContent = "";
    const sampleSections = documentContent.sections.slice(0, Math.min(3, documentContent.sections.length));
    sampleSections.forEach(section => {
      // Take just a small sample of each section's content
      const contentSample = section.content.slice(0, 200);
      sampleContent += `${section.title}:\n${contentSample}...\n\n`;
    });
    
    // Also include document title for context
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are an expert at creating impactful conclusion slides for presentations. Your task is to:

1. Analyze the provided presentation title and section information
2. Create 3-5 bullet points that:
   - Summarize the key takeaways from the entire presentation
   - Reinforce the main message or purpose
   - Highlight actionable insights or next steps when appropriate
   - End with a strong, memorable final point
   - Are concise and impactful (1-2 lines each)
   - Have a coherent flow and structure

Your output should be ONLY the bullet points for the conclusion slide, without any additional commentary, explanations, or formatting instructions.` 
        },
        { 
          role: "user", 
          content: `Create 3-5 impactful bullet points for a conclusion slide for a presentation titled "${documentContent.title}".

The presentation covers these sections: ${sectionTitlesText}

Here's a sample of some content from the presentation:
${sampleContent}

Focus on synthesizing key takeaways and providing a strong conclusion.` 
        }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });
    
    if (documentId) {
      updateProgress(documentId, {
        stage: 'complete',
        progress: 100
      });
    }
    
    return {
      title: "Key Takeaways",
      level: 1,
      content: response.choices[0].message.content?.trim() || "Thank you for your attention!",
      type: "bullet_points"
    };
  } catch (error) {
    console.error('Error generating conclusion slide:', error);
    
    if (documentId) {
      updateProgress(documentId, {
        stage: 'complete',
        progress: 100
      });
    }
    
    return {
      title: "Conclusion",
      level: 1,
      content: "Thank you for your attention!",
      type: "bullets"
    };
  }
}; 