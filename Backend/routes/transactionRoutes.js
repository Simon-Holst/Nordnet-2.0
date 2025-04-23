const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../SQL/database.js');

// Indsæt eller hæv beløb på konto
router.post('/', async (req, res) => {
    const { accountId, type, amount, currency } = req.body;
    const createdAt = new Date();

    try {
        const pool = await poolPromise;

        // Hent konto og status
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

        let newBalance;

        if (type === 'deposit') {
            newBalance = account.balance + amount;
        } else if (type === 'withdrawal') {
            newBalance = account.balance - amount;
            if (newBalance < 0) {
                return res.status(400).json({ message: "Insufficient funds" });
            }
        } else {
            return res.status(400).json({ message: "Invalid transaction type" });
        }

        // Opdater kontoens saldo
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('newBalance', sql.Decimal(18, 2), newBalance)
            .query(`
                UPDATE PortfolioTracker.Accounts
                SET balance = @newBalance
                WHERE account_id = @accountId
            `);

        // Indsæt transaktionen
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('type', sql.VarChar, type)
            .input('amount', sql.Decimal(18, 2), amount)
            .input('currency', sql.VarChar, currency)
            .input('created_at', sql.DateTime, createdAt)
            .input('balance_after', sql.Decimal(18, 2), newBalance)
            .query(`
                INSERT INTO PortfolioTracker.[Transaction]
                (account_id, type, amount, currency, created_at, balance_after)
                VALUES (@accountId, @type, @amount, @currency, @created_at, @balance_after)
            `);

        res.status(201).json({ message: "Transaction successful", newBalance });

    } catch (err) {
        console.error("SQL error (create transaction):", err);
        res.status(500).json({ message: "Error processing transaction" });
    }
});
// Hent alle transaktioner for en konto
router.get('/:accountId', async (req, res) => {
    const { accountId } = req.params;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('accountId', sql.Int, accountId)
            .query(`
                SELECT transaction_id, type, amount, currency, created_at, balance_after
                FROM PortfolioTracker.[Transaction]
                WHERE account_id = @accountId
                ORDER BY created_at DESC
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error("SQL error (get transactions):", err);
        res.status(500).json({ message: "Error fetching transactions" });
    }
});

module.exports = router;
