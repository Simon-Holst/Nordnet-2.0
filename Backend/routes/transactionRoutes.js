const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../SQL/database.js');

// Post Indsæt eller hæv beløb på konto
router.post('/', async (req, res) => {
    const { accountId, type, amount, currency } = req.body; // modtager input fra client/frontend
    const createdAt = new Date(); // gemmer datoen for transaktionen

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
// gemmer kontoen fra result (den første række)
        const account = result.recordset[0];
// if statement hvis der ingen konto er, returner 404(not found) eller hvis kontoen er lukket, returner 400(bad request)
        if (!account) return res.status(404).json({ message: "Account not found" });
        if (account.Closed_at) return res.status(400).json({ message: "Account is closed" });
// opretterer variabel til ny saldo
        let newBalance;
// hvis det er en indbetaling, lægges beløbet til saldoen - hvis det er et hævning, trækkes beløbet fra saldoen
        if (type === 'deposit') {
            newBalance = account.balance + amount;
        } else if (type === 'withdrawal') {
            newBalance = account.balance - amount;
            if (newBalance < 0) { // hvis den nye saldo er mindre end 0, returner en fejl
                return res.status(400).json({ message: "Insufficient funds" }); // send fejl (400 bad request)
            }
        } else {
            return res.status(400).json({ message: "Invalid transaction type" });
        }

        // Opdater kontoens saldo ved at sætte balance til newBalance
        await pool.request()
            .input('accountId', sql.Int, accountId)
            .input('newBalance', sql.Decimal(18, 2), newBalance)
            .query(`
                UPDATE PortfolioTracker.Accounts
                SET balance = @newBalance
                WHERE account_id = @accountId
            `);

        // Indsæt transaktionen i databasen
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

        res.status(201).json({ message: "Transaction successful", newBalance }); // sender 201(created) hvis transaktionen er oprettet

    } catch (err) {
        console.error("SQL error (create transaction):", err);
        res.status(500).json({ message: "Error processing transaction" });
    }
});
// Hent alle transaktioner for en konto
router.get('/:accountId', async (req, res) => {
    const { accountId } = req.params; // henter accountId fra URL

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('accountId', sql.Int, accountId)
        // henter alle transaktioner for den ønskede konto og sorterer dem efter created_at i faldende rækkefølge
            .query(`
                SELECT transaction_id, type, amount, currency, created_at, balance_after
                FROM PortfolioTracker.[Transaction]
                WHERE account_id = @accountId
                ORDER BY created_at DESC 
            `);

        res.json(result.recordset); //sender result.recordset (alle transaktioner) som JSON
    } catch (err) {
        console.error("SQL error (get transactions):", err);
        res.status(500).json({ message: "Error fetching transactions" });
    }
});

module.exports = router;
