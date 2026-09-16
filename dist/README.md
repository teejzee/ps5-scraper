# PS5 Scraper - Production Build

This is a production-ready build containing both backend and frontend.

## Deployment

### Local Testing
```bash
cd dist
npm install
npm start
```

### Vercel Deployment
Push this folder to GitHub and Vercel will automatically detect the `vercel.json` and deploy.

### Other Platforms
- Install dependencies: `npm install`
- Start server: `npm start`
- Server will run on port 3000
- Frontend served from `/`
- API available at `/api/*`

## File Structure
- `public/` - Frontend static files (HTML, CSS, JS)
- `src/` - Backend Node.js code
- `config/` - Configuration files (urls.json)
- `vercel.json` - Vercel deployment configuration
