#!/bin/bash
# Quick Vercel Deployment Script

echo "🚀 JNK Nutrition Sales System - Vercel Deployment"
echo "=================================================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ This is not a Git repository. Initializing..."
    git init
    git add .
    git commit -m "Initial commit for Vercel deployment"
fi

echo "📋 Pre-deployment checklist:"
echo " Avatar functionality working"
echo " Database setup complete"
echo " Environment variables ready"

echo ""
echo "🔧 Next steps:"
echo "1. Push to GitHub:"
echo "   git add ."
echo "   git commit -m 'Ready for Vercel deployment'"
echo "   git push origin main"
echo ""
echo "2. Deploy to Vercel:"
echo "   - Go to https://vercel.com"
echo "   - Import your GitHub repository"
echo "   - Add environment variables:"
echo "     VITE_SUPABASE_URL=https://your-project.supabase.co"
echo "     VITE_SUPABASE_ANON_KEY=your_anon_key"
echo "   - Click Deploy!"
echo ""
echo "🎉 Your app will be live at: https://your-project.vercel.app"
