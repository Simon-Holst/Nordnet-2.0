const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../SQL/database.js');
const { getCurrentStockPrice } = require('../services/stockService');
const { getExchangeRate } = require('../services/currencyService');

// Dashboard hovedrute
router.get('/', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const userId = req.session.userId;

  try {
    const pool = await poolPromise;

    const portfoliosResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT p.portfolio_id, p.name
        FROM PortfolioTracker.Portfolios p
        WHERE p.user_id = @userId
      `);

    const portfolios = portfoliosResult.recordset;
    let totalValueUSD = 0;
    let unrealizedProfitUSD = 0;
    const allSecurities = [];

    for (const p of portfolios) {
      const tradesResult = await pool.request()
        .input('portfolioId', sql.Int, p.portfolio_id)
        .query(`
          SELECT trade_type, ticker_symbol, quantity, total_price
          FROM PortfolioTracker.Trades
          WHERE portfolio_id = @portfolioId
        `);

      const trades = tradesResult.recordset;
      const holdings = {};

      for (const t of trades) {
        if (!holdings[t.ticker_symbol]) {
          holdings[t.ticker_symbol] = { quantity: 0, cost: 0 };
        }

        if (t.trade_type === 'buy') {
          holdings[t.ticker_symbol].quantity += t.quantity;
          holdings[t.ticker_symbol].cost += t.total_price + (t.fee || 0);
        } else if (t.trade_type === 'sell') {
            const holding = holdings[t.ticker_symbol];
            if (holding.quantity > 0) {
              const averageCostPerShare = holding.cost / holding.quantity;
              holding.cost -= averageCostPerShare * t.quantity;
            }
            holding.quantity -= t.quantity;
          }
      }

      for (const [symbol, data] of Object.entries(holdings)) {
        if (data.quantity > 0) {
          try {
            const { price } = await getCurrentStockPrice(symbol);
            const expectedValueUSD = price * data.quantity;
            //console.log(`DEBUG - ${symbol}: GAK cost=${data.cost}, expected=${expectedValueUSD}`);

            const unrealizedUSD = expectedValueUSD - data.cost;

            totalValueUSD += expectedValueUSD;
            unrealizedProfitUSD += unrealizedUSD;

            allSecurities.push({
              name: symbol,
              portfolio: p.name,
              valueUSD: expectedValueUSD,
              unrealizedProfitUSD: unrealizedUSD
            });

          } catch (err) {
            console.warn(`Fejl ved prisopslag for ${symbol}:`, err.message);
          }
        }
      }
    }

    const exchangeRate = await getExchangeRate('USD', 'DKK');
    const totalValueDKK = totalValueUSD * exchangeRate;
    const unrealizedProfitDKK = unrealizedProfitUSD * exchangeRate;

    // Top 5 sorteringer
    const topByValue = [...allSecurities]
      .sort((a, b) => b.valueUSD - a.valueUSD)
      .slice(0, 5)
      .map(s => ({
        name: s.name,
        portfolio: s.portfolio,
        valueDKK: (s.valueUSD * exchangeRate).toFixed(2)
      }));

    const topByProfit = [...allSecurities]
      .sort((a, b) => b.unrealizedProfitUSD - a.unrealizedProfitUSD)
      .slice(0, 5)
      .map(s => ({
        name: s.name,
        portfolio: s.portfolio,
        profitDKK: (s.unrealizedProfitUSD * exchangeRate).toFixed(2)
      }));

    res.render('dashboard', {
      username: req.session.username,
      totalValueDKK: totalValueDKK.toFixed(2),
      realizedProfitDKK: (0).toFixed(2), // Realized endnu ikke implementeret
      unrealizedProfitDKK: unrealizedProfitDKK.toFixed(2),
      topByValue,
      topByProfit
    });

  } catch (err) {
    console.error('Fejl i dashboard route:', err);
    res.status(500).send('Serverfejl ved indlæsning af dashboard.');
  }
});

module.exports = router;
