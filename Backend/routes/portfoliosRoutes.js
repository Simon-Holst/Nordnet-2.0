const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../SQL/database.js'); // Server forbindelse
const { getCurrentStockPrice, getPreviousClosePrice } = require('../services/stockService'); //Henter funktionerne fra services, priser
const { getExchangeRate } = require('../services/currencyService'); //Henter funktionerne fra services, currency

// Middleware til loginbeskyttelse gøres anderledes grundet API kald
function requireLogin(req, res, next) { //  En middleware-funktion i Express
  if (!req.session || !req.session.userId) { // hvis man ikke er logget ind 
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next(); // Hvis brugeren er logget ind, kalder vi next()
}

// Til at gemme value fra portfolio (snapshot funktion)
async function snapshotPortfolioValue(portfolioId) {
  const pool = await poolPromise; // server 
// hent alle trades fra porteføljen
  const trades = await pool.request()
    .input('portfolioId', sql.Int, portfolioId)
    .query(`
      SELECT trade_type, ticker_symbol, quantity
      FROM PortfolioTracker.Trades
      WHERE portfolio_id = @portfolioId
    `);
// holdings til at gemme aktierne i porteføljen
  const holdings = {};
// loop igennem trades og opdater holdings
  trades.recordset.forEach(t => {
    if (!holdings[t.ticker_symbol]) holdings[t.ticker_symbol] = 0;
    holdings[t.ticker_symbol] += t.trade_type === 'buy' ? t.quantity : -t.quantity; //hvis det er buy, læg til, hvis det er sell, træk fra
  });

  let totalValue = 0; // total value til 0
// loop igennem holdings og hent aktiekurser og opdater total value
  for (const [ticker, qty] of Object.entries(holdings)) {
    if (qty <= 0) continue;
    const { price } = await getCurrentStockPrice(ticker);
    totalValue += qty * price;
  }
// finder dagens dato i formatet YYYY-MM-DD (fjerner klokkeslæt fra ISO-format) 
  const today = new Date().toISOString().split('T')[0]; // - T for tidsseparatoren
// indsætter snapshot i databasen som senere bruges til portfolios udvikling
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
    `); //ovenstående SQL sikrer, at der kun oprettes ét snapshot per dag per portefølje
}

//POST: Opret ny portefølje
router.post('/', requireLogin, async (req, res) => {
  const { name, accountId } = req.body; // henter navn og kontoId fra body
  const createdAt = new Date(); // sætter createdAt til nuværende tidspunkt
  const userId = req.session.userId; // henter userId fra sessionen

  try {
    const pool = await poolPromise;
    await pool.request()
    // sender de nødvendige data som SQL-parametre
      .input('accountId', sql.Int, accountId)
      .input('name', sql.VarChar(255), name)
      .input('createdAt', sql.DateTime, createdAt)
      .input('userId', sql.Int, userId)
      // SQL-forespørgsel: indsæt ny række i Portfolios-tabellen
      .query(`
        INSERT INTO PortfolioTracker.Portfolios (account_id, name, created_at, user_id)
        VALUES (@accountId, @name, @createdAt, @userId)
      `);

    res.status(201).json({ message: 'Portfolio created successfully' }); // returner 201(created) hvis porteføljen er oprettet
  } catch (err) {
    console.error('SQL error (create portfolio):', err); // hvis der er en fejl i databasen
    res.status(500).json({ message: 'Error creating portfolio' });// returner 500(server error) hvis der er en fejl
  }
});

// GET: Hent alle porteføljer for bruger (med værdi og ændring)
router.get('/', requireLogin, async (req, res) => { // requireLogin sikrer at brugeren er logget ind
  const userId = req.session.userId; // henter userId fra sessionen

  try {
    const pool = await poolPromise;
// Henter portfølje id, navn og oprettelsesdato fra databasen
// og navnet på konto via join. Order by så senest oprettede portfolios kommer først.
    const result = await pool.request()
      .input('userId', sql.Int, userId) // beskytter mod SQL injection og sætter parameter
      .query(`
        SELECT p.portfolio_id, p.name, p.created_at, a.name AS account_name
        FROM PortfolioTracker.Portfolios p
        JOIN PortfolioTracker.Accounts a ON p.account_id = a.account_id
        WHERE p.user_id = @userId
        ORDER BY p.created_at DESC
      `);

    const portfolios = result.recordset; // gemmer recordset i portfolios

    let totalValueUSD = 0; // til at gemme total value
// promise.all gør portfolios behandles asynkront, der bruges map til gå gennem.
    const enriched = await Promise.all(portfolios.map(async (p) => { // så for hver portfølje udvidet beregning
      const trades = await pool.request()
        .input('portfolioId', sql.Int, p.portfolio_id)
//henter alt køb og salg for den aktuelle portfolje
        .query(`
          SELECT trade_type, ticker_symbol, quantity, total_price, trade_date
          FROM PortfolioTracker.Trades
          WHERE portfolio_id = @portfolioId
        `);

      const holdings = {}; // aktier vi ejer og hvor mange
      let totalValue = 0; // total værdi for portfølje
      let lastTradeDate = null; // dato for seneste handel
      let change24hSum = 0; // Bruges til beregnings over 24 timer
      let changeCount = 0;


      for (const trade of trades.recordset) { // går gennem handler 
        if (!holdings[trade.ticker_symbol]) { // hvis ticker symbol ikke findes oprettes dette.
          holdings[trade.ticker_symbol] = { quantity: 0, totalCost: 0 };
        }
// hvis buy lægges til
        if (trade.trade_type === 'buy') {
          holdings[trade.ticker_symbol].quantity += trade.quantity;
          holdings[trade.ticker_symbol].totalCost += trade.total_price;
// hvis sell fra trækkes mængden
        } else if (trade.trade_type === 'sell') {
          holdings[trade.ticker_symbol].quantity -= trade.quantity;
        }
// hvis datoen ikke eksisterer bruges den første trade.trade_date
// hvis den datoen er nyere end den gamle opdateres lastTradeDate
        if (!lastTradeDate || new Date(trade.trade_date) > new Date(lastTradeDate)) {
          lastTradeDate = trade.trade_date;
        }
      }
// Object.entries til at gå gennem både symbol og holding data samtidig
      for (const [symbol, h] of Object.entries(holdings)) {
        if (h.quantity > 0) { // flere aktier end en
          try {
            const current = await getCurrentStockPrice(symbol); // henter nuværende pris 
            const previousClose = await getPreviousClosePrice(symbol); // henter lukke pris fra i går

            totalValue += h.quantity * current.price; // beregner værdi for aktierne 
// formel til udregning af ændring i procent ((nuværende pris - lukke pris) / lukkepris) *100)
            const change = ((current.price - previousClose) / previousClose) * 100;
            change24hSum += change; // ændringer samlet
            changeCount++; //incrementerer ændring til senere brug fo gennemsnit
          } catch (err) {
            console.warn(`Error for pricing ${symbol}:`, err.message);
          }
        }
      }
// summerer hver enkel portfolio (total value) med totalValueUSd som holder styr på den totale værdi på tværs af portfolios
      totalValueUSD += totalValue;
// retunere enriched version af portfolio
      return {
        portfolio_id: p.portfolio_id, // portfølje id
        name: p.name, // portfølje navn
        account_name: p.account_name, //konto navn
        total_value: totalValue.toFixed(2), // totalvalue 2 decimaler 
        last_trade: lastTradeDate, // last trade 
        change24h: changeCount > 0 ? (change24hSum / changeCount).toFixed(2) : null // gennemsnitslig procentændring over 24 timer
      };
    }));
// henter fra USD til DKK
    const exchangeRate = await getExchangeRate('USD', 'DKK');
    const totalValueDKK = totalValueUSD * exchangeRate; // konvertere værdi
// sender pakke til front end med liste over portfolios, totalValueUSD og totalValueDKK
    res.json({
      portfolios: enriched,
      totalValueUSD: totalValueUSD.toFixed(2),
      totalValueDKK: totalValueDKK.toFixed(2)
    });

  } catch (err) {
    console.error('SQL error (get enriched portfolios):', err);
    res.status(500).json({ message: 'Error fetching portfolios' });
  }
});

// GET: Returnér aktiebeholdning i portefølje
router.get('/:id/stocks', async (req, res) => {
    const portfolioId = parseInt(req.params.id); //henter id fra URL f.eks. /api/portfolios/5/stocks id = 5
    const pool = await poolPromise;
// henter databra databasen om handler for den pågældende portefølje
// sum burges da en portfolio kan have flere handler på samme aktie over tid
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
// gemmer resultat i holdings 
      const holdings = result.recordset;
  
      let totalValueUSD = 0; // her samler vi total USD value
// gennemgår hver aktie i holdings og laver asynkrone beregninger alle aktier på en gang 
      const enriched = await Promise.all(holdings.map(async (h) => {
        const remainingShares = h.total_bought - h.total_sold;
        if (remainingShares <= 0) return null; // hvis ingen aktier returner null (spring over)
        const priceData = await getCurrentStockPrice(h.ticker_symbol); // henter aktuel kurs for den givne aktie
        const currentPrice = priceData.price; // gemmer i currentPrice
        const expectedValue = remainingShares * currentPrice; // forventet værdi er aktier tilbage * nuværende kurs 
        const GAK = h.total_cost / h.total_bought; // gennemsnitlig anskaffelsespris OBS på rapport 
        const unrealizedGain = expectedValue - (GAK * remainingShares); // beregner om der er gevinst/tab ift gennemsnitlig anskaffelsespris
  
        totalValueUSD += expectedValue; // Lægger værdien af den ene aktie til totalValueUSD(samlet portfolio værdi)
  
        return {
          ticker: h.ticker_symbol, //ticker symbol
          quantity: remainingShares, // hvor mange aktier der er tilbage
          currentPrice: currentPrice.toFixed(2), // aktuel kurs
          GAK: GAK.toFixed(2), // gennemsnitlig anskaffelsespris
          expectedValue: expectedValue.toFixed(2), // forventet værdi
          unrealizedGain: unrealizedGain.toFixed(2) // urealiseret gevinst
        };
      }));
  
      // Hent valutakurs USD til DKK
      const exchangeRate = await getExchangeRate('USD', 'DKK');
      const totalValueDKK = totalValueUSD * exchangeRate;
  
      //sender vi både holdings OG samlet value
      res.json({
        holdings: enriched.filter(Boolean), // fjerner null værdier hvis der ingen aktier var
        totalValueUSD: totalValueUSD.toFixed(2),
        totalValueDKK: totalValueDKK.toFixed(2)
      });
    } catch (err) {
      console.error('Error fetching portfolio stocks:', err);
      res.status(500).json({ message: 'Server error calculating holdings' });
    }
  });
  

//GET: detaljevisning
router.get('/:id/details', async (req, res) => {
  const portfolioId = parseInt(req.params.id); // henter portfolio id 
  const pool = await poolPromise;

  try {
    await snapshotPortfolioValue(portfolioId); // kalder snapshotPortfolioValue for at gemme værdien i databasen
// henter navn på portfolio fra databasen
    const result = await pool.request()
      .input('id', sql.Int, portfolioId)
      .query('SELECT name FROM PortfolioTracker.Portfolios WHERE portfolio_id = @id');

    if (result.recordset.length === 0) { // hvis ingen portfolio findes 
      return res.status(404).send('Portfolio not found');
    }
//renderes ejs siden portfolioDetails og sender portfolioId og navn til front end
    res.render('portfolioDetails', {
      portfolioId,
      portfolioName: result.recordset[0].name
    });
  } catch (err) { // fanger fejl
    console.error('Error loading portfolio details page:', err);
    res.status(500).send('Internal server error');
  }
});
// GET: Porteføljeværdier til pie chart
router.get('/values', requireLogin, async (req, res) => { //sikrer login igen
    const userId = req.session.userId; // henter id
    const pool = await poolPromise;
// henter alle users portfolios fra databasen id og navn
    try {
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT p.portfolio_id, p.name
          FROM PortfolioTracker.Portfolios p
          WHERE p.user_id = @userId
        `);
  
      const portfolios = result.recordset; // gemer resultatet i portfolios
//looper asynkront gennem portfolios og henter trades for hver portfolio
      const enriched = await Promise.all(portfolios.map(async (p) => {
        const trades = await pool.request()
          .input('portfolioId', sql.Int, p.portfolio_id)
          .query(`
            SELECT trade_type, ticker_symbol, quantity, total_price
            FROM PortfolioTracker.Trades
            WHERE portfolio_id = @portfolioId
          `);
//gemmer trades i holdings
        const holdings = {};
        let totalValue = 0;
  
        for (const trade of trades.recordset) {
          if (!holdings[trade.ticker_symbol]) {
            holdings[trade.ticker_symbol] = { quantity: 0 };
          }
          if (trade.trade_type === 'buy') {
            holdings[trade.ticker_symbol].quantity += trade.quantity;
          } else if (trade.trade_type === 'sell') {
            holdings[trade.ticker_symbol].quantity -= trade.quantity;
          }
        }
// gennemgår alle akiter i holdings
        for (const [symbol, h] of Object.entries(holdings)) {
          if (h.quantity > 0) {
            try {
              const { price } = await getCurrentStockPrice(symbol); // henter aktuel pris 
              totalValue += h.quantity * price; // beregner total værdi
            } catch (err) {
              console.warn(`error finding price for ${symbol}:`, err.message);
            }
          }
        }
  // for hver portfolio retuneres navn og total værdi
        return {
          portfolioName: p.name,
          value: parseFloat(totalValue.toFixed(2))
        };
      }));
  // sender retur til front end liste over alle portfolios 
      res.json(enriched);
    } catch (err) {
      console.error('error fetching portfolio values ', err);
      res.status(500).json({ message: 'Servererror for graphdata' });
    }
  });

  router.get('/:id/history', async (req, res) => {
    const portfolioId = parseInt(req.params.id);// henter portfolio fra id fra URL
    const pool = await poolPromise;
  
    try {
// henter dato og value fra snapshot og sortere efter dato
      const result = await pool.request()
        .input('portfolioId', sql.Int, portfolioId)
        .query(`
          SELECT date, value
          FROM PortfolioTracker.PortfolioSnapshots
          WHERE portfolio_id = @portfolioId
          ORDER BY date ASC
        `);
  
      res.json(result.recordset); // Returnér kun snapshots
    } catch (err) {
      console.error('Fejl ved hentning af snapshot-historik:', err);
      res.status(500).json({ message: 'Fejl ved hentning af historik' });
    }
  });

module.exports = router;
