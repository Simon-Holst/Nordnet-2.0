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
// Til at gemme value fra portfolio
async function snapshotPortfolioValue(portfolioId) {
    const pool = await poolPromise;
  
    const trades = await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .query(`
        SELECT trade_type, ticker_symbol, quantity
        FROM PortfolioTracker.Trades
        WHERE portfolio_id = @portfolioId
      `);
  
    const holdings = {};
    trades.recordset.forEach(t => {
      if (!holdings[t.ticker_symbol]) holdings[t.ticker_symbol] = 0;
      holdings[t.ticker_symbol] += t.trade_type === 'buy' ? t.quantity : -t.quantity;
    });
  
    let totalValue = 0;
    for (const [ticker, qty] of Object.entries(holdings)) {
      if (qty <= 0) continue;
      const { price } = await getCurrentStockPrice(ticker);
      totalValue += qty * price;
    }
  
    const today = new Date().toISOString().split('T')[0];
  
    await pool.request()
      .input('portfolioId', sql.Int, portfolioId)
      .input('date', sql.Date, today)
      .input('value', sql.Decimal(18, 2), totalValue)
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM PortfolioTracker.PortfolioSnapshots
          WHERE portfolio_id = @portfolioId AND date = @date
        )
        INSERT INTO PortfolioTracker.PortfolioSnapshots (portfolio_id, date, value)
        VALUES (@portfolioId, @date, @value)
      `);
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

// GET: EJS-detaljevisning
router.get('/:id/details', async (req, res) => {
    const portfolioId = parseInt(req.params.id);
    const pool = await poolPromise;
  
    try {
      await snapshotPortfolioValue(portfolioId); 
  
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
  

// === GET: Porteføljeværdier til pie chart ===
router.get('/values', requireLogin, async (req, res) => {
    const userId = req.session.userId;
  
    try {
      const pool = await poolPromise;
  
      // Hent brugerens porteføljer
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT p.portfolio_id, p.name
          FROM PortfolioTracker.Portfolios p
          WHERE p.user_id = @userId
        `);
  
      const portfolios = result.recordset;
  
      const enriched = await Promise.all(portfolios.map(async (p) => {
        const trades = await pool.request()
          .input('portfolioId', sql.Int, p.portfolio_id)
          .query(`
            SELECT trade_type, ticker_symbol, quantity, total_price
            FROM PortfolioTracker.Trades
            WHERE portfolio_id = @portfolioId
          `);
  
        const holdings = {};
        let totalValue = 0;
  
        for (const trade of trades.recordset) {
          if (!holdings[trade.ticker_symbol]) {
            holdings[trade.ticker_symbol] = { quantity: 0, totalCost: 0 };
          }
  
          if (trade.trade_type === 'buy') {
            holdings[trade.ticker_symbol].quantity += trade.quantity;
          } else if (trade.trade_type === 'sell') {
            holdings[trade.ticker_symbol].quantity -= trade.quantity;
          }
        }
  
        for (const [symbol, h] of Object.entries(holdings)) {
          if (h.quantity > 0) {
            try {
              const current = await getCurrentStockPrice(symbol);
              totalValue += h.quantity * current.price;
            } catch (err) {
              console.warn(`Fejl ved prisopslag for ${symbol}:`, err.message);
            }
          }
        }
  
        return {
          portfolioName: p.name,
          value: parseFloat(totalValue.toFixed(2))
        };
      }));
  
      res.json(enriched);
    } catch (err) {
      console.error('Fejl ved beregning af porteføljeværdier til graf:', err);
      res.status(500).json({ message: 'Serverfejl ved grafdata' });
    }
  });
  
  // GET: Returnér historisk snapshot-data for en portefølje
router.get('/:id/history', async (req, res) => {
    const portfolioId = parseInt(req.params.id);
    const pool = await poolPromise;
  
    try {
      const result = await pool.request()
        .input('portfolioId', sql.Int, portfolioId)
        .query(`
          SELECT date, value
          FROM PortfolioTracker.PortfolioSnapshots
          WHERE portfolio_id = @portfolioId
          ORDER BY date ASC
        `);
  
      res.json(result.recordset);
    } catch (err) {
      console.error('Fejl ved hentning af snapshot-historik:', err);
      res.status(500).json({ message: 'Fejl ved hentning af historik' });
    }
  });

module.exports = router;
