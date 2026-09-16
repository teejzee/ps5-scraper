# PS5 Pro Availability Scraper

A web application that automatically scrapes multiple retail websites to check PS5 Pro console availability and displays results in a real-time dashboard.

## Features

✅ **Automated Scraping** - Checks availability every 5 minutes  
✅ **Multiple Retailers** - Easily add new URLs in `config/urls.json`  
✅ **Real-Time Dashboard** - Beautiful frontend showing live availability  
✅ **Manual Refresh** - Check availability on-demand  
✅ **Lightweight Scraper** - Uses Cheerio (HTML parsing) + Axios  
✅ **Error Handling** - Graceful error management and logging  
✅ **Responsive Design** - Works on desktop and mobile  

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
npm install
```

### Configuration

Edit `config/urls.json` to add or modify URLs to scrape:

```json
{
  "urls": [
    {
      "name": "PlayStation Direct NL",
      "url": "https://direct.playstation.com/nl-nl/buy-consoles/playstation5-pro-console-2-tb",
      "checkSelector": "button.add-to-cart, button[aria-label*='Add to cart']",
      "unavailableText": "Out of stock"
    },
    {
      "name": "Amazon.nl",
      "url": "https://www.amazon.nl/PlayStation-Pro-Console/dp/B0DJ7FTCZ9",
      "checkSelector": "button#buy-now-button",
      "unavailableText": "Out of Stock"
    }
  ]
}
```

**URL Configuration Fields:**
- `name` - Display name for the retailer
- `url` - Full URL to check
- `checkSelector` - CSS selector for the "Add to Cart" or buy button
- `unavailableText` - Text that appears when item is out of stock

### Running the Application

**Production mode:**
```bash
npm start
```

**Development mode with auto-reload:**
```bash
npm run dev
```

The server will start at `http://localhost:3000`

## How It Works

### Backend
- **Cheerio** - Lightweight HTML parsing (no browser needed)
- **Axios** - HTTP requests with proper headers
- **Express** - Serves API endpoints and static files
- **Scheduled Scraping** - Runs every 5 minutes automatically

### API Endpoints

- `GET /api/availability` - Returns latest availability results
- `GET /api/scrape-now` - Triggers manual scrape immediately
- `GET /` - Serves the dashboard (index.html)

### Frontend
- Real-time availability display
- Color-coded status (Green = Available, Red = Out of Stock)
- Manual refresh button
- Clickable store links
- Auto-updates every 5 minutes

## Adding More URLs

Simply add entries to `config/urls.json`:

```json
{
  "urls": [
    {
      "name": "Your Store Name",
      "url": "https://store.example.com/ps5-pro",
      "checkSelector": "button.buy-now",
      "unavailableText": "Sold Out"
    }
  ]
}
```

### Finding the Right Selector

1. Open the store page in your browser
2. Right-click on the "Add to Cart" button → Inspect
3. Copy the CSS selector (class name, id, or aria-label)
4. Add it to the `checkSelector` field

Example selectors:
- `.add-to-cart` - class selector
- `#buy-now-button` - id selector  
- `button[aria-label*='Add to cart']` - attribute selector
- Multiple options with comma: `button.primary, button.add-to-cart`

## Project Structure

```
scraper-ps/
├── config/
│   └── urls.json          # Configurable list of URLs to scrape
├── src/
│   ├── scraper.js         # Cheerio scraping logic
│   └── server.js          # Express server & API
├── public/
│   └── index.html         # Frontend dashboard
├── package.json
└── README.md
```

## Troubleshooting

**No availability detected when there should be:**
- Verify the CSS selector is correct (site may have changed HTML)
- Check if the button's disabled state or text matches the config
- Open browser console (F12) and test the selector manually

**Server won't start:**
- Ensure port 3000 is not in use: `lsof -i :3000`
- Try a different port: `PORT=3001 npm start`

**Port already in use:**
- Change port: `PORT=3001 npm start`

## API Response Format

```json
{
  "results": [
    {
      "name": "PlayStation Direct NL",
      "url": "https://direct.playstation.com/...",
      "available": true,
      "lastChecked": "2026-09-16T07:47:50.313Z",
      "success": true
    }
  ],
  "lastScraped": "2026-09-16T07:47:50.313Z",
  "updateInterval": 300000
}
```

## Notes

- Scraping respects website load - checks every 5 minutes
- Uses standard HTTP requests, no browser needed for efficiency
- Some sites may block automated requests - check Terms of Service
- Always test selectors before assuming a site is unavailable

## Future Enhancements

- [ ] Email/webhook notifications when available
- [ ] Database to track history
- [ ] Support for multiple regions
- [ ] Retry logic for failed requests
- [ ] Custom notification settings per URL

## License

MIT

