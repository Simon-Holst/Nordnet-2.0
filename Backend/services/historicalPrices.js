const fetch = require('node-fetch');
require('dotenv').config();
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

async function getHistoricalPrices(ticker) {
  try {
    const res = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol=${ticker}&outputsize=compact&apikey=${API_KEY}`);
    const json = await res.json();

    // Fejl fra AlphaVantage
    if (json['Error Message']) {
      throw new Error(`AlphaVantage API-fejl: ${json['Error Message']}`);
    }

    if (json['Note']) {
      throw new Error(`AlphaVantage rate limit: ${json['Note']}`);
    }

    const series = json['Weekly Adjusted Time Series'];
    if (!series) {
      throw new Error('Kursdata ikke tilgængelig');
    }

    return Object.entries(series)
      .slice(0, 52) // ca. 1 år
      .reverse()
      .map(([date, value]) => ({
        date,
        price: parseFloat(value['4. close']) // "4. close" er stadig korrekt
      }));
  } catch (err) {
    console.error(`AlphaVantage fejl for ${ticker}:`, err.message);
    return [];
  }
}

module.exports = { getHistoricalPrices };
