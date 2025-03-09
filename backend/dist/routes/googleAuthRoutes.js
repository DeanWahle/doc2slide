"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAuthRoutes = void 0;
const express_1 = __importDefault(require("express"));
const googleAuthController_1 = require("../controllers/googleAuthController");
const router = express_1.default.Router();
exports.googleAuthRoutes = router;
// Google OAuth routes
router.get('/google/url', googleAuthController_1.generateAuthUrl);
router.get('/google/callback', googleAuthController_1.handleAuthCallback);
router.post('/google/refresh', googleAuthController_1.refreshToken);
router.get('/google/user', googleAuthController_1.getUserInfo);
