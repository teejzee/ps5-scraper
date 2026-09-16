#!/bin/bash

# Build script that generates config.js with environment variables
# Usage: ./build.sh or npm run build

# Get API URL from environment variable or use default
API_URL="${REACT_APP_API_URL:-http://localhost:3000}"

# Create dist directory
mkdir -p dist

# Copy public files (includes config.js template)
cp -r public/* dist/

# Generate config.js with the API URL
cat > dist/config.js << EOF
// API Configuration - Generated at build time
window.API_CONFIG = {
  BASE_URL: '${API_URL}',
  AVAILABILITY_ENDPOINT: '/api/availability',
  SCRAPE_NOW_ENDPOINT: '/api/scrape-now'
};
EOF

# Copy backend files
cp -r src dist/
cp -r config dist/

echo "✅ Build complete!"
echo "API URL configured: ${API_URL}"
echo "Output directory: dist/"
