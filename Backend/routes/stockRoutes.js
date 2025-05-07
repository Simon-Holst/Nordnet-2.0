// importere nødvendige moduler
const express = require('express');
const router = express.Router(); // Bruges til at organisere router
const fetch = require('node-fetch'); //Bruges til HTTP-anmodninger fra eksterne API'er
require('dotenv').config(); // Bruges til at læse .env-filen
// Import af funktioner fra services
const { getCurrentStockPrice } = require('../services/stockService');
const { getHistoricalPrices } = require('../services/historicalPrices');

// Henter API nøgle så den ikke er hardcodet
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

// Søgning via Finnhub
router.get('/search', async (req, res) => {
  const query = req.query.q; // henter query fra URL'en (symbol)

  if (!query) { // hvis query ikke er angivet retuner fejl
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
// bygger URL'en til API'et encodeURIComponent sørger for at specialtegn bliver kodet korrekt
    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`; 
    const response = await fetch(url); 

    if (!response.ok) { // hvis fejl i anmodningen kaster fejl og går til catch
      throw new Error(`Finnhub search API returned status ${response.status}`);
    }

    const data = await response.json(); // konvertere til javascript objekt
// kun symbol og navn udtrækkes fra resultatet
    const results = (data.result || []).map(item => ({
      symbol: item.symbol,
      name: item.description
    }));
// sender form data til frontend 
    res.json(results);
  } catch (err) {
    console.error('Error fetching stock search from Finnhub:', err);
    res.status(500).json({ error: 'Could not search for stock symbols' });
  }
});

// Get til at hente aktuel aktiekurs
router.get('/:symbol', async (req, res) => {
  const symbol = req.params.symbol; // henter symbol fra URL'en
  //console.log("Fetching stock data for:", symbol);
  
  try {
    const data = await getCurrentStockPrice(symbol); // henter aktuel aktiekurs
    
    if (!data || !data.price) {
      console.log(`No stock data found for symbol: ${symbol}`);
      return res.status(500).json({ error: 'Could not fetch stock data' });
    }
    res.json(data); // retunere data 
  } catch (err) {
    console.error('Error while fetching stock data:', err.message || err);
    res.status(500).json({ error: 'Could not fetch stock data' });
  }
});


// Get til at hente historiske aktiekurser
router.get('/:ticker/history', async (req, res) => {
  try {
// når brugeren tilgår ticker/history hentes historisk data f.ekk AAPL/history
    const data = await getHistoricalPrices(req.params.ticker);
    res.json(data); // retunerer data til frontend
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch historical prices' });
  }
});

router.get('/:ticker/details', (req, res) => {
  const ticker = req.params.ticker; 
// loader en template og sender ticker med til brug af graf
  res.render('stockDetails', { tickerSymbol: ticker });
});


module.exports = router;
