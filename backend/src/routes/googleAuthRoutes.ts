import express from 'express';
import { generateAuthUrl, handleAuthCallback, refreshToken, getUserInfo } from '../controllers/googleAuthController';

const router = express.Router();

// Google OAuth routes
router.get('/google/url', generateAuthUrl);
router.get('/google/callback', handleAuthCallback);
router.post('/google/refresh', refreshToken);
router.get('/google/user', getUserInfo);

export { router as googleAuthRoutes }; 