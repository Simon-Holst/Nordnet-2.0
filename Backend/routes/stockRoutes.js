const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
require('dotenv').config();

const { getCurrentStockPrice } = require('../services/stockService');

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

// === SØGNING via Finnhub ===
router.get('/search', async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Finnhub search API returned status ${response.status}`);
    }

    const data = await response.json();

    const results = (data.result || []).map(item => ({
      symbol: item.symbol,
      name: item.description
    }));

    res.json(results);
  } catch (err) {
    console.error('Error fetching stock search from Finnhub:', err);
    res.status(500).json({ error: 'Could not search for stock symbols' });
  }
});

// === HENT AKTUEL PRIS via Finnhub ===
router.get('/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  console.log("Fetching stock data for:", symbol);
  
  try {
    const data = await getCurrentStockPrice(symbol);
    res.json(data);
  } catch (err) {
    console.error('Error while fetching stock data:', err.message || err);
    res.status(500).json({ error: 'Could not fetch stock data' });
  }
});

module.exports = router;
