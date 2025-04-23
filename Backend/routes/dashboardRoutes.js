const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../SQL/database.js');
const { getCurrentStockPrice } = require('../services/stockService');

// Middleware til at sikre login
function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

router.get('/overview', requireLogin, async (req, res) => {
  const userId = req.session.userId;
  const pool = await poolPromise;

  try {
    const portfoliosRes = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT portfolio_id FROM PortfolioTracker.Portfolios WHERE user_id = @userId`);

    const portfolios = portfoliosRes.recordset;

    let totalValue = 0;
    let realizedProfit = 0;
    let unrealizedProfit = 0;

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
        }

        if (trade.trade_type === 'sell') {
          const quantityBefore = holdings[symbol].quantity;
          const costBefore = holdings[symbol].cost;

          if (quantityBefore === 0) continue; // sikkerhed mod deling med 0

          const avgPrice = costBefore / quantityBefore;
          const costBasis = avgPrice * trade.quantity;
          const gain = trade.total_price - costBasis;

          realizedProfit += gain;

          // Opdater holdings EFTER gain er regnet
          holdings[symbol].quantity -= trade.quantity;
          holdings[symbol].cost -= costBasis;
        }
      }

      // Beregn urealiseret gevinst og total markedsværdi
      for (const [symbol, data] of Object.entries(holdings)) {
        if (data.quantity > 0) {
          try {
            const { price } = await getCurrentStockPrice(symbol);
            const marketValue = price * data.quantity;

            totalValue += marketValue;
            unrealizedProfit += (marketValue - data.cost);
          } catch (err) {
            console.warn(`Kunne ikke hente pris for ${symbol}:`, err.message);
          }
        }
      }
    }

    res.json({
      totalValue: totalValue.toFixed(2),
      realizedProfit: realizedProfit.toFixed(2),
      unrealizedProfit: unrealizedProfit.toFixed(2)
    });

  } catch (err) {
    console.error('Dashboard overview fejl:', err);
    res.status(500).json({ message: 'Fejl ved hentning af dashboard data' });
  }
});

module.exports = router;
