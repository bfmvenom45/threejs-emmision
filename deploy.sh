#!/bin/bash

# Deploy script for Vercel
echo "🚀 Deploying to Vercel..."

# Build the project
echo "📦 Building project..."
npm run build

# Deploy to Vercel (requires vercel CLI installed)
echo "🌐 Deploying to production..."
vercel --prod

echo "✅ Deployment complete!"
echo "🔗 Check your deployment at: https://vercel.com/dashboard"