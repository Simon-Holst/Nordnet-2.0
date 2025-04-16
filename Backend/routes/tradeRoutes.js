const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../SQL/database.js');
const fetch = require('node-fetch');
require('dotenv').config();

console.log("traderoutes.js loaded");

router.post('/', async (req, res) => {
    const {
        accountId,
        portfolioId,
        trade_type,
        ticker_symbol,
        security_type,
        quantity
    } = req.body;

    const tradeDate = new Date();
    const isBuy = trade_type === 'buy';

    try {
        const pool = await poolPromise;

        // Tjek konto
        const result = await pool.request()
            .input('accountId', sql.Int, accountId)
            .query(`
                SELECT balance, Closed_at, currency
                FROM PortfolioTracker.Accounts
                WHERE account_id = @accountId
            `);

        const account = result.recordset[0];
        if (!account) return res.status(404).json({ message: "Account not found" });
        if (account.Closed_at) return res.status(400).json({ message: "Account is closed" });

        // Hent aktuel pris fra Alpha Vantage
        const apiUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${ticker_symbol}&interval=5min&apikey=${process.env.ALPHAVANTAGE_API_KEY}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        const timeSeries = data["Time Series (5min)"];
        if (!timeSeries) return res.status(400).json({ message: "Could not fetch stock price" });

        const latestTime = Object.keys(timeSeries)[0];
        const latestPrice = parseFloat(timeSeries[latestTime]["1. open"]);

        // Beregn pris og fee
        const parsedQuantity = parseFloat(quantity);
        const total_price = parseFloat((latestPrice * parsedQuantity).toFixed(2));
        const fee = parseFloat((total_price * 0.005).toFixed(2));
        const totalWithFee = isBuy ? total_price + fee : total_price - fee;
        const finalTransactionAmount = isBuy ? -totalWithFee : totalWithFee;

        // Tjek dækning
        if (isBuy && account.balance < totalWithFee) {
            return res.status(400).json({ message: "Insufficient funds for this trade" });
        }

        const newBalance = isBuy
            ? account.balance - totalWithFee
            : account.balance + totalWithFee;

        // Opret trade
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('portfolioId', sql.Int, portfolioId)
            .input('trade_type', sql.VarChar, trade_type)
            .input('ticker_symbol', sql.VarChar, ticker_symbol)
            .input('security_type', sql.VarChar, security_type)
            .input('quantity', sql.Decimal(18, 2), parsedQuantity)
            .input('total_price', sql.Decimal(18, 2), total_price)
            .input('fee', sql.Decimal(18, 2), fee)
            .input('trade_date', sql.DateTime, tradeDate)
            .query(`
                INSERT INTO PortfolioTracker.Trades 
                (account_id, portfolio_id, trade_type, ticker_symbol, security_type, quantity, total_price, fee, trade_date)
                VALUES (@accountId, @portfolioId, @trade_type, @ticker_symbol, @security_type, @quantity, @total_price, @fee, @trade_date)
            `);

        // Opdater saldo
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('newBalance', sql.Decimal(18, 2), newBalance)
            .query(`
                UPDATE PortfolioTracker.Accounts
                SET balance = @newBalance
                WHERE account_id = @accountId
            `);

        // Opret transaktion
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('type', sql.VarChar, trade_type)
            .input('amount', sql.Decimal(18, 2), Math.abs(finalTransactionAmount))
            .input('currency', sql.VarChar, account.currency || 'DKK')
            .input('created_at', sql.DateTime, tradeDate)
            .input('balance_after', sql.Decimal(18, 2), newBalance)
            .query(`
                INSERT INTO PortfolioTracker.[Transaction]
                (account_id, type, amount, currency, created_at, balance_after)
                VALUES (@accountId, @type, @amount, @currency, @created_at, @balance_after)
            `);

        res.status(201).json({
            message: "Trade registered successfully",
            total_price,
            fee,
            newBalance
        });

    } catch (err) {
        console.error("Error registering trade:", err);
        res.status(500).json({ message: "Error registering trade" });
    }
});

module.exports = router;