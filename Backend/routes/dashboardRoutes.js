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
      .input('userId', sql.Int, userId) // tilføjer brugerens ID som inputparameter for sikkerhed
      .query(`
        SELECT p.portfolio_id, p.name 
        FROM PortfolioTracker.Portfolios p
        WHERE p.user_id = @userId
      `); // p er en alias – altså et kort navn for tabellen
// resultatet gemmes som portfolios
    const portfolios = portfoliosResult.recordset; // Sætter variblen portfolios til at være portfoliosResult.recordset. Altså recordset er resultatet af sql query
    let totalValueUSD = 0; // samlede værdi i USD sættes til nul
    let unrealizedProfitUSD = 0; // urealiseret profit i USD sættes til nul
    let realizedProfitUSD = 0; // samlet realiseret profit i USD sættes til nul
    const allSecurities = []; // tomt array til at gemme alle værdipapirer
// alle trades hentes fra databasen for hver portfolio
    for (const p of portfolios) { // for of loop
      const tradesResult = await pool.request() // Forbinder til databasen, genbruger eksisterende forbindelse
        .input('portfolioId', sql.Int, p.portfolio_id) // Forhindrer skadeligt sql
        .query(`
          SELECT trade_type, ticker_symbol, quantity, total_price
          FROM PortfolioTracker.Trades
          WHERE portfolio_id = @portfolioId
        `); // Med sql query selectes trade_type, ticker_symbol, quantity, total_price fra Trades hvor portefølge_id'et passer  
// tradesResult gemmes som trades 
      const trades = tradesResult.recordset; // Gemmer resultat fra query
      const holdings = {}; // holdings til at gemme hvad brugeren aktuelt ejer
        
      for (const t of trades) { // for of loop der går igennem trades
        if (!holdings[t.ticker_symbol]) { // undersøger om aktein findes i holdings
          holdings[t.ticker_symbol] = { quantity: 0, cost: 0 }; //hvis ikke opret med quantity og cost sat til 0
        }
// Hvis det er en buy trade, opdaterer holdings med quantity og cost ved at lægge trade værdierne til holdings
        if (t.trade_type === 'buy') { // Hvis det er en buy-trade
          holdings[t.ticker_symbol].quantity += t.quantity; // læg antallet til den eksisterende beholdning
          holdings[t.ticker_symbol].cost += t.total_price + (t.fee || 0); // ekstra sikkermed med || 0 
// Hvis det er en sell trade, opdaterer holdings med quantity og cost ved at trække trade værdierne fra holdings
        } else if (t.trade_type === 'sell') {
            const holding = holdings[t.ticker_symbol];
            if (holding.quantity > 0) { // tjek at der er aktier at sælge
              const averageCostPerShare = holding.cost / holding.quantity; // beregn gennemsnitskostpris per aktie GAK
          
              const saleRevenue = t.total_price - (t.fee || 0); // Beregner hvad vi fik ind for salget
              const costBasis = averageCostPerShare * t.quantity; // hvad de solgte aktier kostede
              const profitOrLoss = saleRevenue - costBasis; // forskellen er profit eller tab
          
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
    const topByValue = [...allSecurities] // kopierer securities arrayet med spread-operatoren ...
      .sort((a, b) => b.valueUSD - a.valueUSD) // sorterer efter værdi med sort
      .slice(0, 5) // tager de 5 største værdier. Slice opretter nyt arrey
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
      username: req.session.username, // sender brugernavnet fra sessionen
      totalValueDKK: totalValueDKK.toFixed(2),// samlet værdi i DKK, afrundet til 2 decimaler
      realizedProfitDKK: realizedProfitDKK.toFixed(2), // realiseret profit i DKK, afrundet
      unrealizedProfitDKK: unrealizedProfitDKK.toFixed(2), // urealiseret profit i DKK, afrundet
      topByValue, // top 5 værdipapirer efter værdi
      topByProfit // top 5 værdipapirer efter urealiseret profit
    });

  } catch (err) {
    console.error('Error in dashboard route:', err); // logger fejl til konsollen
    res.status(500).send('Servererror rendering dahsboard.');  // sender 500-fejl til klienten
  }
});

module.exports = router; // eksporterer routeren, så den kan bruges i serveren (f.eks. i app.js)
