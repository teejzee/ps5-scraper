import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeAllUrls } from './scraper.js';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

let lastResults = [];
let lastScrapedTime = null;
let emailedProducts = new Set();

let emailTransporter = null;
let resend = null;

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

function initializeResend() {
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️  Resend API key not configured. Resend email disabled.');
    return null;
  }

  try {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend initialized');
    return resend;
  } catch (error) {
    console.error('❌ Failed to initialize Resend:', error.message);
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

async function sendEmailAlertResend(product) {
  if (!resend) return;

  try {
    const response = await resend.emails.send({
      from: 'PS5 Scraper <noreply@resend.dev>',
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
    });
    console.log(`✉️  Resend email sent to thijs.zijp@gmail.com for ${product.name}:`, response.id);
  } catch (error) {
    console.error(`❌ Failed to send Resend email for ${product.name}:`, error.message);
  }
}

const possiblePaths = [
  path.join(__dirname, '../public'),
  path.join(__dirname, '..'),
  process.cwd(),
  '/var/task/dist',
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
  publicPath = path.join(__dirname, '..');
}

console.log(`Using publicPath: ${publicPath}`);

app.use(cors());
app.use(express.json());

// ========== API ROUTES ==========

app.get('/api/availability', (req, res) => {
  res.json({
    results: lastResults,
    lastScraped: lastScrapedTime,
    updateInterval: 60 * 1000
  });
});

app.get('/api/cron/check-availability', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (req.headers.authorization !== `Bearer ${secret}`) {
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

app.get('/api/check-ps5', async (req, res) => {
  try {
    console.log('🎮 Checking PS5 availability and sending email with Resend...');
    const results = await scrapeAllUrls();
    
    const availableProducts = results.filter(r => r.available && r.success && r.price && r.price < 1000);
    
    if (availableProducts.length > 0) {
      console.log(`✅ Found ${availableProducts.length} available PS5 Pro(s)`);
      
      for (const product of availableProducts) {
        await sendEmailAlertResend(product);
      }
      
      res.json({
        success: true,
        available: true,
        products: availableProducts,
        message: `Email sent to thijs.zijp@gmail.com for ${availableProducts.length} available product(s)`
      });
    } else {
      console.log('❌ No PS5 Pro available');
      res.json({
        success: true,
        available: false,
        products: [],
        message: 'No PS5 Pro available at this moment'
      });
    }
  } catch (error) {
    console.error('Error checking PS5:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/test-email', async (req, res) => {
  try {
    console.log('📧 Testing email functionality with Resend...');
    
    if (!resend) {
      return res.status(500).json({
        success: false,
        error: 'Resend not initialized. RESEND_API_KEY not configured.'
      });
    }

    const testProduct = {
      name: 'TEST - PlayStation Direct NL',
      url: 'https://direct.playstation.com/nl-nl/',
      price: 799.99,
      maxPrice: 1000,
      available: true,
      success: true,
      lastChecked: new Date().toISOString()
    };

    await sendEmailAlertResend(testProduct);

    res.json({
      success: true,
      message: 'Test email sent to thijs.zijp@gmail.com',
      testProduct: testProduct,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== SPA FALLBACK (ONLY for non-API routes) ==========

app.get('*', (req, res) => {
  const indexFile = path.join(publicPath, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      console.error(`Error serving index.html from ${indexFile}: ${err.message}`);
      res.status(404).send('index.html not found');
    }
  });
});

// ========== PERIODIC SCRAPE ==========

async function periodicScrape() {
  try {
    console.log(`[${new Date().toISOString()}] Running scheduled scrape...`);
    const results = await scrapeAllUrls();
    lastResults = results;
    lastScrapedTime = new Date().toISOString();

    const available = results.filter(r => r.available && r.success);
    if (available.length > 0) {
      console.log(`✅ AVAILABLE: ${available.map(r => r.name).join(', ')}`);
      
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
    initializeEmailTransporter();
    initializeResend();

    if (!process.env.VERCEL) {
      await periodicScrape();
      const SCRAPE_INTERVAL = 60 * 1000;
      setInterval(periodicScrape, SCRAPE_INTERVAL);
      console.log(`Scraping every 1 minute (local mode)`);
    } else {
      console.log('✅ Running on Vercel - use /api/cron/check-availability endpoint');
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
