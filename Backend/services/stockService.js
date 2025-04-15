
const fetch = require('node-fetch');
require('dotenv').config();

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

async function getCurrentStockPrice(symbol) {
  const url = `${BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const timeseries = data['Time Series (5min)'];
    if (!timeseries) throw new Error('No data returned');

    const latest = Object.keys(timeseries)[0];
    const latestData = timeseries[latest];

    return {
      symbol,
      price: parseFloat(latestData['4. close']),
      time: latest,
    };
  } catch (err) {
    console.error('Fejl i stockService:', err.message);
    throw err;
  }
}

module.exports = {
  getCurrentStockPrice,
};
