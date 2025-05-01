const fetch = require('node-fetch');
require('dotenv').config();
const { sql, poolPromise } = require('../SQL/database');

const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY;

// Funktion til at hente fra API
async function fetchExchangeRateFromAPI(base, target) {
    const url = `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/pair/${base}/${target}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.result === 'success') {
        return data.conversion_rate;
    } else {
        throw new Error('Failed to fetch exchange rate');
    }
}

// Funktion til at hente fra database eller API hvis nødvendigt
async function getExchangeRate(base, target) {
    if (!base || !target) {
        throw new Error('Base and target currencies must be provided');
    }

    if (base === target) {
        return 1; // Samme valuta – ingen konvertering
    }

    const pool = await poolPromise;

    // 1. Forsøg at hente kurs fra database
    const result = await pool.request()
        .input('base_currency', sql.VarChar, base)
        .input('target_currency', sql.VarChar, target)
        .query(`
            SELECT rate
            FROM PortfolioTracker.exchange_rates
            WHERE base_currency = @base_currency AND target_currency = @target_currency
            ORDER BY timestamp DESC
            OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY
        `);

    if (result.recordset.length > 0) {
        return result.recordset[0].rate;
    } else {
        // 2. Hvis ikke fundet, hent fra API
        const rate = await fetchExchangeRateFromAPI(base, target);

        // 3. Gem i database
        await pool.request()
            .input('base_currency', sql.VarChar, base)
            .input('target_currency', sql.VarChar, target)
            .input('rate', sql.Decimal(18, 8), rate)
            .query(`
                INSERT INTO PortfolioTracker.exchange_rates (base_currency, target_currency, rate, timestamp)
                VALUES (@base_currency, @target_currency, @rate, SYSDATETIME())
            `);

        return rate;
    }
}

module.exports = {
    getExchangeRate
};
