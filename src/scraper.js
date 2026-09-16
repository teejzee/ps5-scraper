import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function checkAvailability(urlConfig) {
  try {
    const response = await axios.get(urlConfig.url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const pageContent = response.data;

    const hasUnavailableText = pageContent.includes(urlConfig.unavailableText);
    const isAvailable = !hasUnavailableText;

    // Extract price from page content regardless of availability
    let price = extractPrice(pageContent);

    // Check if price exceeds max price threshold
    const exceedsMaxPrice = price !== null && urlConfig.maxPrice && price > urlConfig.maxPrice;

    return {
      name: urlConfig.name,
      url: urlConfig.url,
      available: isAvailable && !exceedsMaxPrice,
      price: price,
      maxPrice: urlConfig.maxPrice,
      exceedsMaxPrice: exceedsMaxPrice,
      lastChecked: new Date().toISOString(),
      success: true
    };
  } catch (error) {
    console.error(`Error checking ${urlConfig.name}:`, error.message);
    return {
      name: urlConfig.name,
      url: urlConfig.url,
      available: false,
      price: null,
      lastChecked: new Date().toISOString(),
      success: false,
      error: error.message
    };
  }
}

function extractPrice(pageText) {
  // Pattern 1: Look for prices starting with 1 (likely PS5 Pro prices in higher range)
  // This catches 1439.00, 1399.99, etc.
  let match = pageText.match(/"price"\s*:\s*"(1\d{3}\.\d{2})"/);
  if (match) {
    const price = parseFloat(match[1]);
    if (price >= 800 && price <= 2000) {
      return price;
    }
  }

  // Pattern 2: productPrice:"899.99" or similar JSON patterns (PlayStation Direct)
  match = pageText.match(/productPrice\s*:\s*"?(\d+[.,]\d{2}|\d+)"?/i);
  if (match) {
    const priceStr = match[1].replace(',', '.');
    const price = parseFloat(priceStr);
    if (!isNaN(price) && price >= 750 && price <= 2000) {
      return price;
    }
  }

  // Pattern 3: "price":"899.99" or price":899 or similar (general JSON)
  match = pageText.match(/"price"\s*:\s*"?(\d+[.,]\d{2}|\d+)"?/i);
  if (match) {
    const priceStr = match[1].replace(',', '.');
    const price = parseFloat(priceStr);
    if (!isNaN(price) && price >= 750 && price <= 1400) {
      return price;
    }
  }

  // Pattern 4: content="899.99" (meta tag)
  match = pageText.match(/content="(\d+[.,]\d{2})"/);
  if (match) {
    const priceStr = match[1].replace(',', '.');
    const price = parseFloat(priceStr);
    if (!isNaN(price) && price >= 750 && price <= 1400) {
      return price;
    }
  }

  // Pattern 5: Euro symbol with price € 899 or €899,99 - find ALL matches and pick highest in range
  const euroMatches = pageText.match(/€\s*(\d{3,4})[.,](\d{2})/g);
  if (euroMatches) {
    let validPrices = [];
    for (const match of euroMatches) {
      const priceMatch = match.match(/€\s*(\d{3,4})[.,](\d{2})/);
      if (priceMatch) {
        const price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
        if (price >= 750 && price <= 1400) {
          validPrices.push(price);
        }
      }
    }
    // Return the highest valid price (most likely the PS5 Pro price)
    if (validPrices.length > 0) {
      return Math.max(...validPrices);
    }
  }

  return null;
}

export async function scrapeAllUrls() {
  try {
    const configPath = path.join(__dirname, '../config/urls.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    const results = await Promise.all(
      config.urls.map(urlConfig => checkAvailability(urlConfig))
    );

    return results;
  } catch (error) {
    console.error('Error scraping URLs:', error);
    throw error;
  }
}

export async function getUrlsConfig() {
  try {
    const configPath = path.join(__dirname, '../config/urls.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error reading URLs config:', error);
    throw error;
  }
}

