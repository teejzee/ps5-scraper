// API Configuration
// This file is generated at build time with the correct API URL
// Default: local development server
window.API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  AVAILABILITY_ENDPOINT: '/api/availability',
  SCRAPE_NOW_ENDPOINT: '/api/scrape-now'
};
