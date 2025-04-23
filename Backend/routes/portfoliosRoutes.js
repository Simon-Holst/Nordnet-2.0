const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../SQL/database.js');
const { getCurrentStockPrice, getPreviousClosePrice } = require('../services/stockService');

// Middleware til loginbeskyttelse
function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

// === POST: Opret ny portefølje ===
router.post('/', requireLogin, async (req, res) => {
  const { name, accountId } = req.body;
  const createdAt = new Date();
  const userId = req.session.userId;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('accountId', sql.Int, accountId)
      .input('name', sql.VarChar(255), name)
      .input('createdAt', sql.DateTime, createdAt)
      .input('userId', sql.Int, userId)
      .query(`
        INSERT INTO PortfolioTracker.Portfolios (account_id, name, created_at, user_id)
        VALUES (@accountId, @name, @createdAt, @userId)
      `);

    res.status(201).json({ message: 'Portfolio created successfully' });
  } catch (err) {
    console.error('SQL error (create portfolio):', err);
    res.status(500).json({ message: 'Error creating portfolio' });
  }
});

// === GET: Hent alle porteføljer for bruger (med værdi og ændring) ===
router.get('/', requireLogin, async (req, res) => {
  const userId = req.session.userId;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT p.portfolio_id, p.name, p.created_at, a.name AS account_name
        FROM PortfolioTracker.Portfolios p
        JOIN PortfolioTracker.Accounts a ON p.account_id = a.account_id
        WHERE p.user_id = @userId
        ORDER BY p.created_at DESC
      `);

    const portfolios = result.recordset;

    const enriched = await Promise.all(portfolios.map(async (p) => {
      const trades = await pool.request()
        .input('portfolioId', sql.Int, p.portfolio_id)
        .query(`
          SELECT trade_type, ticker_symbol, quantity, total_price, trade_date
          FROM PortfolioTracker.Trades
          WHERE portfolio_id = @portfolioId
        `);

      const holdings = {};
      let totalValue = 0;
      let lastTradeDate = null;
      let change24hSum = 0;
      let changeCount = 0;

      for (const trade of trades.recordset) {
        if (!holdings[trade.ticker_symbol]) {
          holdings[trade.ticker_symbol] = { quantity: 0, totalCost: 0 };
        }

        if (trade.trade_type === 'buy') {
          holdings[trade.ticker_symbol].quantity += trade.quantity;
          holdings[trade.ticker_symbol].totalCost += trade.total_price;
        } else if (trade.trade_type === 'sell') {
          holdings[trade.ticker_symbol].quantity -= trade.quantity;
        }

        if (!lastTradeDate || new Date(trade.trade_date) > new Date(lastTradeDate)) {
          lastTradeDate = trade.trade_date;
        }
      }

      for (const [symbol, h] of Object.entries(holdings)) {
        if (h.quantity > 0) {
          try {
            const current = await getCurrentStockPrice(symbol);
            const previousClose = await getPreviousClosePrice(symbol);

            totalValue += h.quantity * current.price;

            const change = ((current.price - previousClose) / previousClose) * 100;
            change24hSum += change;
            changeCount++;
          } catch (err) {
            console.warn(`Fejl ved prisopslag for ${symbol}:`, err.message);
          }
        }
      }

      return {
        portfolio_id: p.portfolio_id,
        name: p.name,
        account_name: p.account_name,
        total_value: totalValue.toFixed(2),
        last_trade: lastTradeDate,
        change24h: changeCount > 0 ? (change24hSum / changeCount).toFixed(2) : null
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error('SQL error (get enriched portfolios):', err);
    res.status(500).json({ message: 'Error fetching portfolios' });
  }
});

// === GET: Returnér aktiebeholdning i portefølje ===
router.get('/:id/stocks', async (req, res) => {
  const portfolioId = parseInt(req.params.id);
  const pool = await poolPromise;

  try {
    const result = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(`
        SELECT
          t.ticker_symbol,
          SUM(CASE WHEN t.trade_type = 'buy' THEN t.quantity ELSE 0 END) AS total_bought,
          SUM(CASE WHEN t.trade_type = 'sell' THEN t.quantity ELSE 0 END) AS total_sold,
          SUM(CASE WHEN t.trade_type = 'buy' THEN t.total_price ELSE 0 END) AS total_cost
        FROM PortfolioTracker.Trades t
        WHERE t.portfolio_id = @portfolioId
        GROUP BY t.ticker_symbol
      `);

    const holdings = result.recordset;

    const enriched = await Promise.all(holdings.map(async (h) => {
      const currentQty = h.total_bought - h.total_sold;
      if (currentQty <= 0) return null;

      const priceData = await getCurrentStockPrice(h.ticker_symbol);
      const currentPrice = priceData.price;
      const expectedValue = currentQty * currentPrice;
      const GAK = h.total_cost / h.total_bought;
      const unrealizedGain = expectedValue - (GAK * currentQty);

      return {
        ticker: h.ticker_symbol,
        quantity: currentQty,
        currentPrice: currentPrice.toFixed(2),
        GAK: GAK.toFixed(2),
        expectedValue: expectedValue.toFixed(2),
        unrealizedGain: unrealizedGain.toFixed(2)
      };
    }));

    res.json(enriched.filter(Boolean));
  } catch (err) {
    console.error('Error fetching portfolio stocks:', err);
    res.status(500).json({ message: 'Server error calculating holdings' });
  }
});

// === GET: EJS-detaljevisning ===
router.get('/:id/details', async (req, res) => {
  const portfolioId = parseInt(req.params.id);
  const pool = await poolPromise;

  try {
    const result = await pool.request()
      .input('id', sql.Int, portfolioId)
      .query('SELECT name FROM PortfolioTracker.Portfolios WHERE portfolio_id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).send('Portfolio not found');
    }

    res.render('portfolioDetails', {
      portfolioId,
      portfolioName: result.recordset[0].name
    });
  } catch (err) {
    console.error('Error loading portfolio details page:', err);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;
