const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../SQL/database.js');

// Opretter ny portefølje
router.post('/', async (req, res) => {
    const { name, accountId } = req.body;
    const createdAt = new Date();

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('name', sql.VarChar(255), name)
            .input('createdAt', sql.DateTime, createdAt)
            .query(`
                INSERT INTO PortfolioTracker.Portfolios (account_id, name, created_at)
                VALUES (@accountId, @name, @createdAt)
            `);

        res.status(201).json({ message: 'Portfolio created successfully' });
    } catch (err) {
        console.error('SQL error (create portfolio):', err);
        res.status(500).json({ message: 'Error creating portfolio' });
    }
});

// Henter alle porteføljer
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT p.portfolio_id, p.name, p.created_at, a.name AS account_name
                FROM PortfolioTracker.Portfolios p
                JOIN PortfolioTracker.Accounts a ON p.account_id = a.account_id
                ORDER BY p.created_at DESC
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error('SQL error (get portfolios):', err);
        res.status(500).json({ message: 'Error fetching portfolios' });
    }
});

module.exports = router;
