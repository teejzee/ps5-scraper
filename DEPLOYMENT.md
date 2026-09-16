# PS5 Pro Availability Scraper - Deployment Guide

This project is refactored for **Option 1** deployment: Frontend (GitHub Pages) + Backend (Vercel/Railway/Render).

## Project Structure

```
├── public/              # Frontend static files
│   ├── index.html      # Main HTML with API calls
│   └── config.js       # API configuration (generated at build time)
├── src/                # Backend Node.js code
│   ├── server.js       # Express server
│   └── scraper.js      # Scraping logic
├── config/             # Configuration files
│   └── urls.json       # URLs to scrape
└── build.sh            # Build script with environment variables
```

## Local Development

### Run Backend Only
```bash
npm install
npm start
# Server runs on http://localhost:3000
```

### Run Both Frontend + Backend
```bash
# Terminal 1: Start backend
npm start

# Terminal 2: Open frontend
open http://localhost:3000
```

## Production Deployment

### Step 1: Deploy Backend

Choose one:

#### Option A: Vercel (Recommended)
```bash
npm install -g vercel
vercel
# Follow prompts, then copy your URL
```

#### Option B: Railway
1. Create account at https://railway.app
2. Connect GitHub repo
3. Deploy and get URL

#### Option C: Render
1. Create account at https://render.com
2. New Web Service → GitHub
3. Deploy and get URL

### Step 2: Configure Frontend

**Method 1: GitHub Secrets (Recommended)**
```bash
# Go to GitHub: Settings → Secrets → New repository secret
# Name: API_URL
# Value: https://your-backend.vercel.app
```

**Method 2: Direct Build Command**
```bash
REACT_APP_API_URL=https://your-backend.vercel.app npm run build
```

### Step 3: Deploy to GitHub Pages

1. **Enable GitHub Pages:**
   - Go to repo Settings → Pages
   - Select `gh-pages` branch
   - Save

2. **Push to deploy:**
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push origin main
   ```
   
   GitHub Actions will automatically build and deploy!

## Build Commands

```bash
# Build with default API (localhost:3000)
npm run build

# Build with custom backend URL
REACT_APP_API_URL=https://your-backend.vercel.app npm run build

# Production build using npm script
npm run build:production

# Deploy to GitHub Pages
npm run deploy
```

## Environment Variables

Create or edit `.env` file:
```
REACT_APP_API_URL=https://your-backend-url.com
```

See `.env.example` for more options.

## Configuration Files

### public/config.js (Auto-generated)
```javascript
window.API_CONFIG = {
  BASE_URL: 'https://your-backend.vercel.app',
  AVAILABILITY_ENDPOINT: '/api/availability',
  SCRAPE_NOW_ENDPOINT: '/api/scrape-now'
};
```

This file is generated at build time with the correct API URL.

## Monitoring Scraping

The backend scrapes every 5 minutes by default. To change:

**Backend** (src/server.js, line ~71):
```javascript
const SCRAPE_INTERVAL = 5 * 60 * 1000;  // 5 minutes
```

**Frontend** (public/index.html, line ~252):
```javascript
const UPDATE_INTERVAL = 5 * 60 * 1000;  // 5 minutes
```

## Troubleshooting

### "Failed to load availability data"
- Check if backend URL is correct in `API_CONFIG`
- Verify backend is running and accessible
- Check browser console for CORS errors

### "Price not available" for all products
- Backend might not be scraping
- Check backend logs
- Verify URLs in `config/urls.json`

### Backend deployed but frontend shows old API URL
- Clear browser cache
- Rebuild frontend with correct `API_URL`
- Check that GitHub Actions workflow ran successfully

## Next Steps

1. Deploy backend to Vercel/Railway/Render
2. Get backend URL
3. Set `API_URL` in GitHub Secrets
4. Push to GitHub (Actions will deploy automatically)
5. Access your site at `https://yourusername.github.io/scraper-ps`

---

**Frontend URL:** `https://yourusername.github.io/scraper-ps`
**Backend URL:** `https://your-backend.vercel.app` (or your chosen provider)
