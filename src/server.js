import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeAllUrls } from './scraper.js';
import fs from 'fs';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

let lastResults = [];
let lastScrapedTime = null;
let emailedProducts = new Set(); // Track products we've already emailed about

// Setup email transporter
let emailTransporter = null;

function initializeEmailTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('⚠️  Email credentials not configured. Email notifications disabled.');
    return null;
  }

  try {
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    console.log('✅ Email transporter initialized');
    return emailTransporter;
  } catch (error) {
    console.error('❌ Failed to initialize email transporter:', error.message);
    return null;
  }
}

async function sendEmailAlert(product) {
  if (!emailTransporter) return;

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'thijs.zijp@gmail.com',
      subject: `🎮 PS5 PRO AVAILABLE - ${product.name}!`,
      html: `
        <h2>🎮 PS5 PRO IS AVAILABLE!</h2>
        <p><strong>Store:</strong> ${product.name}</p>
        <p><strong>Price:</strong> €${product.price ? product.price.toFixed(2) : 'N/A'}</p>
        <p><strong>Status:</strong> Available for purchase</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString('nl-NL')}</p>
        <br>
        <p><a href="${product.url}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Visit Store</a></p>
        <hr>
        <p><small>This is an automated notification from PS5 Scraper</small></p>
      `
    };

    await emailTransporter.sendMail(mailOptions);
    console.log(`✉️  Email sent to thijs.zijp@gmail.com for ${product.name}`);
  } catch (error) {
    console.error(`❌ Failed to send email for ${product.name}:`, error.message);
  }
}



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
    updateInterval: 60 * 1000
  });
});

app.get('/api/cron/check-availability', async (req, res) => {
  // Verify this is a legitimate Vercel cron call
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🔄 Cron job triggered');
  await periodicScrape();
  res.json({ success: true, lastScraped: lastScrapedTime });
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
      
      // Send email for newly available products
      for (const product of available) {
        const productKey = `${product.name}-${product.price}`;
        if (!emailedProducts.has(productKey)) {
          await sendEmailAlert(product);
          emailedProducts.add(productKey);
        }
      }
    } else {
      console.log('❌ No availability found');
    }
  } catch (error) {
    console.error('Scheduled scrape error:', error);
  }
}

async function startServer() {
  try {
    // Initialize email transporter
    initializeEmailTransporter();

    // Only run periodic scrape if not on Vercel (for local development)
    if (!process.env.VERCEL) {
      // Run first scrape immediately
      await periodicScrape();

      // Schedule periodic scrapes every 1 minute
      const SCRAPE_INTERVAL = 60 * 1000;
      setInterval(periodicScrape, SCRAPE_INTERVAL);
      console.log(`Scraping every 1 minute (local mode)`);
    } else {
      console.log('✅ Running on Vercel - use /api/cron/check-availability endpoint');
      // Run once on startup to populate initial data
      await periodicScrape();
    }

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
