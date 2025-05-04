const fetch = require('node-fetch');
require('dotenv').config();

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
// funktion til at hente aktuel aktiekurs fra Finnhub
async function getCurrentStockPrice(ticker) {
  try {
// bygger URL'en til API'et
    const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url);
// tjekker om anmodningen var succesfuld
    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data = await response.json(); // konverterer til javascript objekt
// returnerer data i det ønskede format data.c er current price
    return {
      symbol: ticker,
      price: data.c,
      time: new Date(data.t * 1000).toISOString() // konverterer til ISO format (læsbar dato)
    };
  } catch (error) { // hvis der opstår fejl under anmodningen
    console.error('Error fetching stock price:', error.message);
    throw error;
  }
}
// samme funktion som kun returnerer den tidligere lukkekurs
async function getPreviousClosePrice(ticker) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Finnhub error: ${response.status}`);
  const data = await response.json();
  return data.pc; // 'pc' = previous close
}


// eksportere funktionerne så de kan bruges i andre filer
module.exports = {
  getCurrentStockPrice,
  getPreviousClosePrice
};
