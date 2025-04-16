const express = require('express');
const router = express.Router();
const { getCurrentStockPrice } = require('../services/stockService');

console.log("stockRoutes.js loaded successfully");

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
