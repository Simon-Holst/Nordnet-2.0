const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../SQL/database.js');

router.post('/', async (req, res) => {
    const {
        accountId,
        portfolioId,
        trade_type,
        ticker_symbol,
        security_type,
        quantity,
        total_price,
        fee
    } = req.body;

    const tradeDate = new Date();
    const isBuy = trade_type === 'buy';
    const totalWithFee = parseFloat(total_price) + (isBuy ? parseFloat(fee) : -parseFloat(fee));
    const finalTransactionAmount = isBuy ? -totalWithFee : total_price - fee;

    try {
        const pool = await poolPromise;

        // Undersøger konto eksisterer og er åben
        const result = await pool.request()
            .input('accountId', sql.Int, accountId)
            .query(`
                SELECT balance, Closed_at
                FROM PortfolioTracker.Accounts
                WHERE account_id = @accountId
            `);

        const account = result.recordset[0];
        if (!account) return res.status(404).json({ message: "Account not found" });
        if (account.Closed_at) return res.status(400).json({ message: "Account is closed" });

        if (isBuy && account.balance < totalWithFee) {
            return res.status(400).json({ message: "Insufficient funds for this trade" });
        }

        // Opretter handlen i Trades
        const tradeInsert = await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('portfolioId', sql.Int, portfolioId)
            .input('trade_type', sql.VarChar, trade_type)
            .input('ticker_symbol', sql.VarChar, ticker_symbol)
            .input('security_type', sql.VarChar, security_type)
            .input('quantity', sql.Decimal(18, 2), quantity)
            .input('total_price', sql.Decimal(18, 2), total_price)
            .input('fee', sql.Decimal(18, 2), fee)
            .input('trade_date', sql.DateTime, tradeDate)
            .query(`
                INSERT INTO PortfolioTracker.Trades 
                (account_id, portfolio_id, trade_type, ticker_symbol, security_type, quantity, total_price, fee, trade_date)
                VALUES (@accountId, @portfolioId, @trade_type, @ticker_symbol, @security_type, @quantity, @total_price, @fee, @trade_date)
            `);

        // Beregner ny balance
        const newBalance = isBuy
            ? account.balance - totalWithFee
            : account.balance + total_price - fee;

        // Opdater kontobalance
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('newBalance', sql.Decimal(18, 2), newBalance)
            .query(`
                UPDATE PortfolioTracker.Accounts
                SET balance = @newBalance
                WHERE account_id = @accountId
            `);

        // Opret transaktion (uden balance_after i første omgang)
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('type', sql.VarChar, trade_type)
            .input('amount', sql.Decimal(18, 2), Math.abs(finalTransactionAmount))
            .input('currency', sql.VarChar, 'DKK') // eller hent fra konto
            .input('created_at', sql.DateTime, tradeDate)
            .input('balance_after', sql.Decimal(18, 2), newBalance)
            .query(`
                INSERT INTO PortfolioTracker.[Transaction]
                (account_id, type, amount, currency, created_at, balance_after)
                VALUES (@accountId, @type, @amount, @currency, @created_at, @balance_after)
            `);

        res.status(201).json({ message: "Trade registered successfully" });

    } catch (err) {
        console.error("Error registering trade:", err);
        res.status(500).json({ message: "Error registering trade" });
    }
});

module.exports = router;
