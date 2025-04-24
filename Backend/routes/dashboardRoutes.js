const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../SQL/database');
const { getCurrentStockPrice } = require('../services/stockService');

function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

router.get('/stats', requireLogin, async (req, res) => {
  const userId = req.session.userId;
  const pool = await poolPromise;

  try {
    const portfoliosRes = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT portfolio_id, name FROM PortfolioTracker.Portfolios WHERE user_id = @userId`);

    const portfolios = portfoliosRes.recordset;

    let totalValue = 0;
    let realizedProfit = 0;
    let unrealizedProfit = 0;
    const allSecurities = [];

    for (const p of portfolios) {
      const tradesRes = await pool.request()
        .input('portfolioId', sql.Int, p.portfolio_id)
        .query(`SELECT * FROM PortfolioTracker.Trades WHERE portfolio_id = @portfolioId ORDER BY trade_date`);

      const trades = tradesRes.recordset;
      const holdings = {};

      for (const trade of trades) {
        const symbol = trade.ticker_symbol;
        if (!holdings[symbol]) {
          holdings[symbol] = { quantity: 0, cost: 0 };
        }

        if (trade.trade_type === 'buy') {
          holdings[symbol].quantity += trade.quantity;
          holdings[symbol].cost += trade.total_price;
        } else if (trade.trade_type === 'sell') {
          const avg = holdings[symbol].cost / (holdings[symbol].quantity || 1);
          const soldCost = avg * trade.quantity;
          const gain = trade.total_price - soldCost;

          realizedProfit += gain;
          holdings[symbol].quantity -= trade.quantity;
          holdings[symbol].cost -= soldCost;
        }
      }

      for (const [symbol, data] of Object.entries(holdings)) {
        if (data.quantity > 0) {
          try {
            const { price } = await getCurrentStockPrice(symbol);
            const value = price * data.quantity;
            const unrealized = value - data.cost;

            totalValue += value;
            unrealizedProfit += unrealized;

            allSecurities.push({
              symbol,
              portfolio: p.name,
              value,
              unrealizedProfit: unrealized
            });
          } catch (err) {
            console.warn(`Fejl ved pris for ${symbol}:`, err.message);
          }
        }
      }
    }

    const topByValue = [...allSecurities].sort((a, b) => b.value - a.value).slice(0, 5);
    const topByProfit = [...allSecurities].sort((a, b) => b.unrealizedProfit - a.unrealizedProfit).slice(0, 5);

    res.json({
      totalValue: totalValue.toFixed(2),
      realizedProfit: realizedProfit.toFixed(2),
      unrealizedProfit: unrealizedProfit.toFixed(2),
      topByValue,
      topByProfit
    });

  } catch (err) {
    console.error('Dashboard stats fejl:', err);
    res.status(500).json({ message: 'Fejl ved hentning af dashboard data' });
  }
});

module.exports = router;
