const fetch = require('node-fetch');
require('dotenv').config();
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
// asynkron funktion til at hente historiske aktiekurser fra AlphaVantage tager ticker som parameter
async function getHistoricalPrices(ticker) {
  try {
// bygger URL'en til API'et
    const res = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol=${ticker}&outputsize=compact&apikey=${API_KEY}`);
    const json = await res.json(); // konverterer til javascript objekt

    // Fejl fra AlphaVantage viser sig i json-responsen
    if (json['Error Message']) {
      throw new Error(`AlphaVantage API-error: ${json['Error Message']}`);
    }
    // Rate limit overskridelse
    if (json['Note']) {
      throw new Error(`AlphaVantage rate limit: ${json['Note']}`);
    }
    // Gemmer kurs data i variabel series
    const series = json['Weekly Adjusted Time Series'];
    // Hvis der ikke er nogen data, kastes fejl
    if (!series) {
      throw new Error('Kursdata ikke tilgængelig');
    }

    return Object.entries(series) // konverterer objektet til en array af arrays
      .slice(0, 52) // begrænser til nyeste 52 uger (ca et år)
      .reverse() // vender rækkefølgen om, så den går fra ældste til nyeste
      .map(([date, value]) => ({ // mapper data til det ønskede format
        date,
        price: parseFloat(value['4. close']) // "4. close" er lukkekursen for ugen
      }));
  } catch (err) {
    console.error(`AlphaVantage fejl for ${ticker}:`, err.message);
    return [];
  }
}

module.exports = { getHistoricalPrices };
