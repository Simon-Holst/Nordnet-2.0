const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../SQL/database.js');

// Hent alle brugerens konti
router.get('/', async (req, res) => {
    const userId = req.session.userId;
// Hvis ikke logged in, returner 401
    if (!userId) return res.status(401).json({ message: "Not logged in" });
// Hvis logged in, hent konti fra databasen som passer til user
    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('userId', sql.Int, userId) //input beskytter mod skadelig SQL
            .query(`
                SELECT account_id, name, currency, balance, bank_name, Closed_at
                FROM PortfolioTracker.Accounts
                WHERE user_id = @userId
            `);

        res.json(result.recordset); // returner alle fundende kontier til user ID
    } catch (err) {
        console.error("SQL error (get accounts):", err);
        res.status(500).json({ message: "Error fetching accounts" });
    }
});

// Opret en ny konto
router.post('/', async (req, res) => {
    const { name, currency, balance, bank_name } = req.body; // tager oplysninger fra brugerens request
    const userId = req.session.userId; // henter userId fra sessionen 
    const createdAt = new Date(); // sætter createdAt til nuværende tidspunkt

    if (!userId) return res.status(401).json({ message: "Not logged in" }); // hvis brugeren ikke er logged in, returner 401

    try { // try at oprette forbindelse til databasen
        const pool = await poolPromise; // venter på at forbindelsen til databasen er oprettet

        await pool.request() // opretter en request til databasen
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

        res.status(201).json({ message: "Account created" }); // returner 201(created) hvis kontoen er oprettet
    } catch (err) {
        console.error("SQL error (create account):", err);
        res.status(500).json({ message: "Error creating account" }); // ellers returner 500(server error) hvis der er en fejl
    }
});
// Luk eller åben med patch og if statement
//patch endpoint fx /api/accounts/1 patch bruges til at opdaterer en konto
router.patch('/:id', async (req, res) => { 
    const accountId = parseInt(req.params.id); // henter accountId fra URL og konverterer til tal
    const { status } = req.body; // henter status fra body (open/closed)

    try {
        const pool = await poolPromise;
// hvis den ønskede status er closed, opdaterer den Closed_at kolonnen i databasen med nuværende tidspunkt
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
// hvis den ønskede status er open, opdaterer den Closed_at kolonnen i databasen med null
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
            res.status(400).json({ message: "Invalid status" }); // bad request hvis status ikke er open/closed
        }

    } catch (err) {
        console.error("SQL error (PATCH /api/accounts/:id):", err);
        res.status(500).json({ message: "Error updating account status" });
    }
});
// eksporterer routeren så den kan bruges i andre filer
module.exports = router;