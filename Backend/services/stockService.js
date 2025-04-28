const fetch = require('node-fetch');
require('dotenv').config();

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

async function getCurrentStockPrice(ticker) {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      symbol: ticker,
      price: data.c,
      time: new Date(data.t * 1000).toISOString()
    };
  } catch (error) {
    console.error('Error fetching stock price:', error.message);
    throw error;
  }
}

async function getPreviousClosePrice(ticker) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Finnhub error: ${response.status}`);
  const data = await response.json();
  return data.pc; // 'pc' = previous close
}



module.exports = {
  getCurrentStockPrice,
  getPreviousClosePrice
};
