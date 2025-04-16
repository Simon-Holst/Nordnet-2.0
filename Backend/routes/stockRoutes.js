const express = require('express');
const router = express.Router();
const { getCurrentStockPrice } = require('../services/stockService');
const fetch = require('node-fetch');

console.log("stockRoutes.js loaded successfully");

// Søgning via Alpha Vantage
router.get('/search', async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    const apiKey = process.env.ALPHAVANTAGE_API_KEY;
    const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    const matches = (data.bestMatches || []).map(match => ({
      symbol: match['1. symbol'],
      name: match['2. name']
    }));

    res.json(matches);
  } catch (err) {
    console.error('Error fetching stock search:', err);
    res.status(500).json({ error: 'Could not search for stock symbols' });
  }
});


router.get('/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  console.log("Fetching stock data for:", symbol);

  try {
    const data = await getCurrentStockPrice(symbol);
    res.json(data); // Example response: { symbol: 'AAPL', price: 173.54, time: '2025-04-15 14:00:00' }
  } catch (err) {
    console.error('Error while fetching stock data:', err);
    res.status(500).json({ error: 'Could not fetch stock data' });
  }
});


module.exports = router;
