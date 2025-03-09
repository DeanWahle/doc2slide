"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSlides = void 0;
const googleapis_1 = require("googleapis");
/**
 * Create a Google Slides presentation from processed document content
 */
const createSlides = async (documentContent, accessToken, templateId) => {
    try {
        // Create OAuth client and set credentials
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        // Create Slides API client
        const slides = googleapis_1.google.slides({ version: 'v1', auth: oauth2Client });
        const drive = googleapis_1.google.drive({ version: 'v3', auth: oauth2Client });
        // Create a new presentation
        let presentation;
        if (templateId) {
            // Copy the template presentation
            const copyResponse = await drive.files.copy({
                fileId: templateId,
                requestBody: {
                    name: `${documentContent.title || 'Untitled'} - Generated Presentation`,
                },
            });
            const presentationId = copyResponse.data.id;
            presentation = await slides.presentations.get({ presentationId });
        }
        else {
            // Create a new blank presentation
            const createResponse = await slides.presentations.create({
                requestBody: {
                    title: `${documentContent.title || 'Untitled'} - Generated Presentation`,
                },
            });
            presentation = createResponse.data;
        }
        const presentationId = presentation.presentationId;
        // Generate slides from content
        await generateSlides(slides, presentationId, documentContent);
        return presentationId;
    }
    catch (error) {
        console.error('Google Slides API error:', error);
        throw new Error('Failed to create Google Slides presentation');
    }
};
exports.createSlides = createSlides;
/**
 * Generate slides from document content
 */
const generateSlides = async (slidesApi, presentationId, documentContent) => {
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
    }
    catch (error) {
        console.error('Slide generation error:', error);
        throw error;
    }
};
/**
 * Create a title slide
 */
const createTitleSlide = async (slidesApi, presentationId, title) => {
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
                        text: 'Automatically generated from document',
                    },
                },
            ],
        },
    });
};
/**
 * Create a content slide from a document section
 */
const createContentSlide = async (slidesApi, presentationId, section) => {
    try {
        // Choose slide layout based on content type
        let layout = 'TITLE_AND_BODY';
        if (section.type === 'bullet_points') {
            layout = 'TITLE_AND_BODY';
        }
        else if (section.type === 'table') {
            layout = 'TITLE_AND_BODY';
        }
        else if (section.type === 'image') {
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
        const slideId = createSlideResponse.data.replies[0].createSlide.objectId;
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
            // Extract bullet points and format for slides
            const bulletPoints = section.content
                .split('\n')
                .filter((line) => line.trim())
                .map((line) => line.replace(/^[-*•]\s+/, '').trim())
                .join('\n• ');
            formattedContent = '• ' + bulletPoints;
        }
        else if (section.type === 'table') {
            // For tables, we'd need a more complex approach to create tables in Slides
            // For now, just include the text content
            formattedContent = section.content;
        }
        else {
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
    }
    catch (error) {
        console.error('Error creating content slide:', error);
        throw error;
    }
};
/**
 * Create a conclusion slide
 */
const createConclusionSlide = async (slidesApi, presentationId, title) => {
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
