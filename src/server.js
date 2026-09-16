import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeAllUrls } from './scraper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

let lastResults = [];
let lastScrapedTime = null;

app.use(cors());
app.use(express.json());

// Determine the public path
const isDev = process.env.NODE_ENV !== 'production';
const publicPath = isDev 
  ? path.join(__dirname, '../public')      // Local: ../public
  : path.join(__dirname, '..');             // Production: .. (dist root)

console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`Serving static files from: ${publicPath}`);

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
  const indexPath = path.join(publicPath, 'index.html');
  console.log(`[SPA] Serving ${req.path} -> ${indexPath}`);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`Error sending index.html: ${err.message}`);
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
