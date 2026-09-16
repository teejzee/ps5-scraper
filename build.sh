#!/bin/bash

# Production build script
# Creates a complete dist/ folder with backend + frontend ready for deployment
# Usage: npm run build (for localhost) or npm run build:production (for production API)

# Get API URL from environment variable
# For production on Vercel: dist will use current domain (window.location.origin)
# For localhost development: dist will use http://localhost:3000
API_URL="${REACT_APP_API_URL:-http://localhost:3000}"

echo "🔨 Building for production..."
echo "📍 API URL: ${API_URL}"

# Clean and create dist directory
rm -rf dist
mkdir -p dist

# Copy frontend (public) files
cp -r public/* dist/

# Generate config.js with the correct API URL
# For Vercel: use window.location.origin (current domain)
# For localhost: use http://localhost:3000
if [ "${VERCEL}" = "1" ] || [ "${API_URL}" = "window.location.origin" ]; then
  cat > dist/config.js << EOF
// API Configuration - Generated at build time for production
window.API_CONFIG = {
  BASE_URL: window.location.origin,
  AVAILABILITY_ENDPOINT: '/api/availability',
  SCRAPE_NOW_ENDPOINT: '/api/scrape-now'
};
EOF
else
  cat > dist/config.js << EOF
// API Configuration - Generated at build time for production
window.API_CONFIG = {
  BASE_URL: '${API_URL}',
  AVAILABILITY_ENDPOINT: '/api/availability',
  SCRAPE_NOW_ENDPOINT: '/api/scrape-now'
};
EOF
fi

# Copy backend files
cp -r src dist/src
cp -r config dist/config

# Copy deployment configuration
cp vercel.json dist/vercel.json
cp package.json dist/package.json
cp package-lock.json dist/package-lock.json 2>/dev/null || true

# Create .env for production (if not exists)
if [ ! -f dist/.env ]; then
  cat > dist/.env << EOF
NODE_ENV=production
PORT=3000
EOF
fi

# Create a simple README for the dist folder
cat > dist/README.md << EOF
# PS5 Scraper - Production Build

This is a production-ready build containing both backend and frontend.

## Deployment

### Local Testing
\`\`\`bash
cd dist
npm install
npm start
\`\`\`

### Vercel Deployment
Push this folder to GitHub and Vercel will automatically detect the \`vercel.json\` and deploy.

### Other Platforms
- Install dependencies: \`npm install\`
- Start server: \`npm start\`
- Server will run on port 3000
- Frontend served from \`/\`
- API available at \`/api/*\`

## File Structure
- \`public/\` - Frontend static files (HTML, CSS, JS)
- \`src/\` - Backend Node.js code
- \`config/\` - Configuration files (urls.json)
- \`vercel.json\` - Vercel deployment configuration
EOF

echo "✅ Build complete!"
echo "📦 dist/ folder contains:"
echo "   ✓ Frontend (public/)"
echo "   ✓ Backend (src/)"
echo "   ✓ Configuration (config/)"
echo "   ✓ Package files"
echo "   ✓ Deployment config (vercel.json)"
echo ""
echo "🚀 Ready to deploy!"

