const express = require('express');
const router = express.Router(); // bruges til at lave et sæt routes som bruges til dashboard
const { sql, poolPromise } = require('../SQL/database.js'); //forbindelse til databasen
const { getCurrentStockPrice } = require('../services/stockService'); // funktion til at hente aktiekurser
const { getExchangeRate } = require('../services/currencyService'); // funktion til at hente valutakurser

// Dashboard hovedrute
router.get('/', async (req, res) => { // når bruger går til /dashboard
  if (!req.session.userId) { // hvis brugeren ikke er logget ind
    return res.redirect('/login');// send brugeren til login
  }

  const userId = req.session.userId; // henter userId fra sessionen

  try {
    const pool = await poolPromise;
// henter alle portfolios fra databasen som tilhører brugeren
    const portfoliosResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT p.portfolio_id, p.name
        FROM PortfolioTracker.Portfolios p
        WHERE p.user_id = @userId
      `);
// resultatet gemmes som portfolios
    const portfolios = portfoliosResult.recordset;
    let totalValueUSD = 0; // samlede værdi i USD
    let unrealizedProfitUSD = 0; // urealiseret profit i USD
    let realizedProfitUSD = 0; // samlet realiseret profit i USD
    const allSecurities = []; // array til at gemme alle værdipapirer
// alle trades hentes fra databasen for hver portfolio
    for (const p of portfolios) {
      const tradesResult = await pool.request()
        .input('portfolioId', sql.Int, p.portfolio_id)
        .query(`
          SELECT trade_type, ticker_symbol, quantity, total_price
          FROM PortfolioTracker.Trades
          WHERE portfolio_id = @portfolioId
        `);
// tradesResult gemmes som trades 
      const trades = tradesResult.recordset;
      const holdings = {}; // holdings til at gemme hvad brugeren aktuelt ejer
        
      for (const t of trades) {
        if (!holdings[t.ticker_symbol]) { // undersøger om aktein findes i holdings
          holdings[t.ticker_symbol] = { quantity: 0, cost: 0 }; //hvis ikke opret med quantity og cost sat til 0
        }
// Hvis det er en buy trade, opdaterer holdings med quantity og cost ved at lægge trade værdierne til holdings
        if (t.trade_type === 'buy') {
          holdings[t.ticker_symbol].quantity += t.quantity;
          holdings[t.ticker_symbol].cost += t.total_price + (t.fee || 0); // ekstra sikkermed med || 0
// Hvis det er en sell trade, opdaterer holdings med quantity og cost ved at trække trade værdierne fra holdings
        } else if (t.trade_type === 'sell') {
            const holding = holdings[t.ticker_symbol];
            if (holding.quantity > 0) {
              const averageCostPerShare = holding.cost / holding.quantity;
          
              const saleRevenue = t.total_price - (t.fee || 0); // hvad vi fik ind for salget
              const costBasis = averageCostPerShare * t.quantity; // hvad de solgte aktier kostede
              const profitOrLoss = saleRevenue - costBasis; // gevinst/tab på salget
          
              realizedProfitUSD += profitOrLoss; // opdater samlet realiseret gevinst
          
              holding.cost -= costBasis; // fjern kostpris for de solgte aktier
            }
            holding.quantity -= t.quantity; // fjern antallet af solgte aktier
          }
      }
// går gennem hvert aktie vi ejer i portføljen 
      for (const [symbol, data] of Object.entries(holdings)) {
        if (data.quantity > 0) { // tjekker om der er aktier tilbage
          try {
            const { price } = await getCurrentStockPrice(symbol); // henter aktiekursen fra Finnhub
            const expectedValueUSD = price * data.quantity; // beregner forventet værdi i USD
            // antager at alle aktier er i USD

            const unrealizedUSD = expectedValueUSD - data.cost; // forskel mellem forventet værdi og kostpris
// opdaterer total værdi og urealiseret profit til dashboard
            totalValueUSD += expectedValueUSD;
            unrealizedProfitUSD += unrealizedUSD;
// indsætter aktien i allSecurities arrayet som bruges til top 5 senere
            allSecurities.push({
              name: symbol,
              portfolio: p.name,
              valueUSD: expectedValueUSD,
              unrealizedProfitUSD: unrealizedUSD
            });
// fanger fejl hvis aktiekursen ikke kan hentes
          } catch (err) {
            console.warn(`error fetching price for ${symbol}:`, err.message);
          }
        }
      }
    }
      
// henter aktiekurs fra USD til DKK
    const exchangeRate = await getExchangeRate('USD', 'DKK');
    const totalValueDKK = totalValueUSD * exchangeRate; // total value konverteres
    const unrealizedProfitDKK = unrealizedProfitUSD * exchangeRate; // unrealized profit konverteres
    const realizedProfitDKK = realizedProfitUSD * exchangeRate; // realized profit konverteres
    

    // Top 5 sorteringer
    const topByValue = [...allSecurities] // kopiere securities arrayet
      .sort((a, b) => b.valueUSD - a.valueUSD) // sorterer efter værdi
      .slice(0, 5) // tager de 5 største værdier
      .map(s => ({ // map til at ændre hvert element i arrayet
        name: s.name, // name forbliver det samme
        portfolio: s.portfolio, // portfolio forbliver det samme
        valueDKK: (s.valueUSD * exchangeRate).toFixed(2) //value konverteres til dkk
      }));

    const topByProfit = [...allSecurities] // kopiere securities arrayet
      .sort((a, b) => b.unrealizedProfitUSD - a.unrealizedProfitUSD) // sortere efter største urealiseret profit
      .slice(0, 5) // tager de 5 største værdier
      .map(s => ({ //map til at ændre hvert element i arrayet
        name: s.name, // name forbliver det samme
        portfolio: s.portfolio, // portfolio forbliver det samme
        profitDKK: (s.unrealizedProfitUSD * exchangeRate).toFixed(2) // unrealized profit konverteres til dkk
      }));
// data sendes til dashboard view
    res.render('dashboard', {
      username: req.session.username,
      totalValueDKK: totalValueDKK.toFixed(2),
      realizedProfitDKK: realizedProfitDKK.toFixed(2),
      unrealizedProfitDKK: unrealizedProfitDKK.toFixed(2),
      topByValue,
      topByProfit
    });

  } catch (err) {
    console.error('Error in dashboard route:', err);
    res.status(500).send('Servererror rendering dahsboard.');
  }
});

module.exports = router;
