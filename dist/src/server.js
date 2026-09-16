import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeAllUrls } from './scraper.js';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

let lastResults = [];
let lastScrapedTime = null;

app.use(cors());
app.use(express.json());

// In Vercel, __dirname is the function directory
// We need to look for static files relative to the actual file location
// When deployed: /var/task/dist/src/server.js
// Static files are at: /var/task/dist/

// Try multiple possible locations for index.html
const possiblePaths = [
  path.join(__dirname, '../public'),         // ../public (local dev: src -> public)
  path.join(__dirname, '..'),                // .. (dist root when running from dist/src)
  process.cwd(),                             // current working directory
  '/var/task/dist',                          // Vercel specific
];

let publicPath = null;
for (const p of possiblePaths) {
  const indexPath = path.join(p, 'index.html');
  if (fs.existsSync(indexPath)) {
    publicPath = p;
    console.log(`✅ Found index.html at: ${p}`);
    break;
  }
}

if (!publicPath) {
  console.error('❌ Could not find index.html in any location!');
  console.error('Tried:', possiblePaths);
  console.error('Current working directory:', process.cwd());
  console.error('__dirname:', __dirname);
  publicPath = path.join(__dirname, '..');  // fallback
}

console.log(`Using publicPath: ${publicPath}`);

// Serve static files
app.use(express.static(publicPath));

app.get('/api/availability', (req, res) => {
  res.json({
    results: lastResults,
    lastScraped: lastScrapedTime,
    updateInterval: 5 * 60 * 1000
  });
});

app.get('/api/scrape-now', async (req, res) => {
  try {
    console.log('Manual scrape triggered...');
    const results = await scrapeAllUrls();
    lastResults = results;
    lastScrapedTime = new Date().toISOString();

    res.json({
      success: true,
      results,
      timestamp: lastScrapedTime
    });
  } catch (error) {
    console.error('Manual scrape error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Fallback: serve index.html for all non-API routes (SPA routing)
app.get('*', (req, res) => {
  const indexFile = path.join(publicPath, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      console.error(`Error serving index.html from ${indexFile}: ${err.message}`);
      res.status(404).send('index.html not found');
    }
  });
});

async function periodicScrape() {
  try {
    console.log(`[${new Date().toISOString()}] Running scheduled scrape...`);
    const results = await scrapeAllUrls();
    lastResults = results;
    lastScrapedTime = new Date().toISOString();

    const available = results.filter(r => r.available && r.success);
    if (available.length > 0) {
      console.log(`✅ AVAILABLE: ${available.map(r => r.name).join(', ')}`);
    } else {
      console.log('❌ No availability found');
    }
  } catch (error) {
    console.error('Scheduled scrape error:', error);
  }
}

async function startServer() {
  try {
    // Run first scrape immediately
    await periodicScrape();

    // Schedule periodic scrapes every 1 minute
    const SCRAPE_INTERVAL = 60 * 1000;
    setInterval(periodicScrape, SCRAPE_INTERVAL);
    console.log(`Scraping every 1 minute`);

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

startServer();
