#!/bin/bash

# Production build script
# Creates a complete dist/ folder with backend + frontend ready for deployment

API_URL="${REACT_APP_API_URL:-http://localhost:3000}"

echo "🔨 Building for production..."
echo "📍 API URL: ${API_URL}"

# Clean and create dist directory
rm -rf dist
mkdir -p dist
mkdir -p dist/public

# Copy frontend (public) files to dist/public (NOT root)
cp -r public/* dist/public/

# Generate config.js in dist/public
if [ "${NODE_ENV}" = "production" ] || [ -n "${VERCEL}" ]; then
  cat > dist/public/config.js << EOF
window.API_CONFIG = {
  BASE_URL: window.location.origin,
  AVAILABILITY_ENDPOINT: '/api/availability',
  SCRAPE_NOW_ENDPOINT: '/api/scrape-now'
};
EOF
  echo "   📍 Production: using window.location.origin (dynamic)"
else
  cat > dist/public/config.js << EOF
window.API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  AVAILABILITY_ENDPOINT: '/api/availability',
  SCRAPE_NOW_ENDPOINT: '/api/scrape-now'
};
EOF
  echo "   📍 Development: http://localhost:3000"
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
