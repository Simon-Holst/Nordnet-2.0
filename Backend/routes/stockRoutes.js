const express = require('express');
const router = express.Router();
const { getCurrentStockPrice } = require('../services/stockService');

router.get('/stock/:symbol', async (req, res) => {
  const symbol = req.params.symbol;

  try {
    const data = await getCurrentStockPrice(symbol);
    res.json(data); // fx { symbol: 'AAPL', price: 173.54, time: '2025-04-15 14:00:00' }
  } catch (err) {
    res.status(500).json({ error: 'Kunne ikke hente kurs' });
  }
});

module.exports = router;
