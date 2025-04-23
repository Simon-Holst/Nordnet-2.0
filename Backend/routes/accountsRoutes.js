const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../SQL/database.js');

// Hent alle brugerens konti
router.get('/', async (req, res) => {
    const userId = req.session.userId;

    if (!userId) return res.status(401).json({ message: "Not logged in" });

    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT account_id, name, currency, balance, bank_name, Closed_at
                FROM PortfolioTracker.Accounts
                WHERE user_id = @userId
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error("SQL error (get accounts):", err);
        res.status(500).json({ message: "Error fetching accounts" });
    }
});

// Opret en ny konto
router.post('/', async (req, res) => {
    const { name, currency, balance, bank_name } = req.body;
    const userId = req.session.userId;
    const createdAt = new Date();

    if (!userId) return res.status(401).json({ message: "Not logged in" });

    try {
        const pool = await poolPromise;

        await pool.request()
            .input('userId', sql.Int, userId)
            .input('name', sql.VarChar, name)
            .input('currency', sql.VarChar, currency)
            .input('balance', sql.Decimal(18, 2), balance)
            .input('bank_name', sql.VarChar, bank_name)
            .input('created_at', sql.DateTime, createdAt)
            .query(`
                INSERT INTO PortfolioTracker.Accounts 
                (user_id, name, currency, balance, bank_name, created_at)
                VALUES (@userId, @name, @currency, @balance, @bank_name, @created_at)
            `);

        res.status(201).json({ message: "Account created" });
    } catch (err) {
        console.error("SQL error (create account):", err);
        res.status(500).json({ message: "Error creating account" });
    }
});
// Luk eller åben med patch og if statement
router.patch('/:id', async (req, res) => {
    const accountId = parseInt(req.params.id);
    const { status } = req.body;

    try {
        const pool = await poolPromise;

        if (status === 'closed') {
            await pool.request()
                .input('accountId', sql.Int, accountId)
                .input('closedAt', sql.DateTime, new Date())
                .query(`
                    UPDATE PortfolioTracker.Accounts
                    SET Closed_at = @closedAt
                    WHERE account_id = @accountId
                `);
            res.json({ message: "Account closed" });

        } else if (status === 'open') {
            await pool.request()
                .input('accountId', sql.Int, accountId)
                .query(`
                    UPDATE PortfolioTracker.Accounts
                    SET Closed_at = NULL
                    WHERE account_id = @accountId
                `);
            res.json({ message: "Account reopened" });

        } else {
            res.status(400).json({ message: "Invalid status" });
        }

    } catch (err) {
        console.error("SQL error (PATCH /api/accounts/:id):", err);
        res.status(500).json({ message: "Error updating account status" });
    }
});

module.exports = router;