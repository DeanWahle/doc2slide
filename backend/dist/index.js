"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const documentRoutes_1 = require("./routes/documentRoutes");
const googleAuthRoutes_1 = require("./routes/googleAuthRoutes");
// Load environment variables
dotenv_1.default.config();
// Create Express server
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// API Routes
app.use('/api/documents', documentRoutes_1.documentRoutes);
app.use('/api/auth', googleAuthRoutes_1.googleAuthRoutes);
// For production, serve static files from frontend build
if (process.env.NODE_ENV === 'production') {
    app.use(express_1.default.static(path_1.default.join(__dirname, '../../frontend/build')));
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(__dirname, '../../frontend/build', 'index.html'));
    });
}
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
