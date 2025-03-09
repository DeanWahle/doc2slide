#!/bin/bash

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Doc2Slides application with OpenAI integration"

# Instructions for setting up remote repository
echo "Repository initialized with initial commit."
echo ""
echo "To push to GitHub, run the following commands:"
echo "1. Create a new repository on GitHub"
echo "2. Run: git remote add origin <your-github-repo-url>"
echo "3. Run: git push -u origin main"
echo ""
echo "Done!" 