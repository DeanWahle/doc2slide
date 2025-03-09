"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserInfo = exports.refreshToken = exports.handleAuthCallback = exports.generateAuthUrl = void 0;
const googleapis_1 = require("googleapis");
// Configure OAuth client
const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
// Scopes required for Google Slides API
const SCOPES = [
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
];
/**
 * Generate Google OAuth URL
 */
const generateAuthUrl = (req, res) => {
    try {
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent'
        });
        res.status(200).json({ url: authUrl });
    }
    catch (error) {
        console.error('Auth URL generation error:', error);
        res.status(500).json({ error: 'Failed to generate authentication URL' });
    }
};
exports.generateAuthUrl = generateAuthUrl;
/**
 * Handle Google OAuth callback
 */
const handleAuthCallback = async (req, res) => {
    try {
        const { code } = req.query;
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: 'Authorization code is required' });
        }
        // Exchange auth code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        // Store tokens in a secure way (consider using a database and sessions)
        // For now, sending back to client (not recommended for production)
        res.status(200).json({
            tokens,
            message: 'Authentication successful'
        });
    }
    catch (error) {
        console.error('Auth callback error:', error);
        res.status(500).json({ error: 'Failed to complete authentication' });
    }
};
exports.handleAuthCallback = handleAuthCallback;
/**
 * Refresh access token
 */
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }
        // Set refresh token and get new access token
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const { credentials } = await oauth2Client.refreshAccessToken();
        res.status(200).json({
            tokens: credentials,
            message: 'Token refreshed successfully'
        });
    }
    catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
};
exports.refreshToken = refreshToken;
/**
 * Get user's Google profile information
 */
const getUserInfo = async (req, res) => {
    try {
        const { accessToken } = req.query;
        if (!accessToken || typeof accessToken !== 'string') {
            return res.status(400).json({ error: 'Access token is required' });
        }
        // Set access token
        oauth2Client.setCredentials({ access_token: accessToken });
        // Get user profile
        const people = googleapis_1.google.people({ version: 'v1', auth: oauth2Client });
        const profile = await people.people.get({
            resourceName: 'people/me',
            personFields: 'names,emailAddresses,photos'
        });
        res.status(200).json(profile.data);
    }
    catch (error) {
        console.error('User info error:', error);
        res.status(500).json({ error: 'Failed to retrieve user information' });
    }
};
exports.getUserInfo = getUserInfo;
