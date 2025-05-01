const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../SQL/database.js');

// LOGIN via post 
router.post('/login', async (req, res) => {
    const { username, password } = req.body; // tager username og password fra body

    try { // establisher forbindelse til databasen
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.VarChar, username)
            .input('password', sql.VarChar, password)
            .query(`
                SELECT * FROM [PortfolioTracker].[User]
                WHERE username = @username AND password = @password
            `);
// hvis der er en bruger med det username og password logges brugeren ind
        if (result.recordset.length > 0) { 
            const user = result.recordset[0];
            req.session.loggedIn = true;
            req.session.username = user.username;
            req.session.userId = user.user_id;
            res.json({ message: "Login successful" });
        } else { //ellers returneres en fejl
            res.status(401).json({ error: 'Wrong username or password' }); //401 er unauthorized
        }
    } catch (err) { //hvis der er en fejl i databasen
        console.error('SQL error (login)', err);
        res.status(500).json({ error: 'Database error' }); //500 er server error
    }
});

// REGISTER via post
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const pool = await poolPromise;

        // Tjek for eksisterende bruger
        const existing = await pool.request()
            .input('username', sql.VarChar, username)
            .input('email', sql.VarChar, email)
            .query(`
                SELECT * FROM [PortfolioTracker].[User]
                WHERE username = @username OR email = @email
            `);
// hvis der er en eksisterende bruger med det username eller email returneres en fejl
        if (existing.recordset.length > 0) {
            return res.status(400).json({ error: "Username or email already taken" }); //400 er bad request
        }

        // Opret ny bruger hvis ledig ved at indsætte i databasen
        await pool.request()
            .input('email', sql.VarChar, email)
            .input('username', sql.VarChar, username)
            .input('password', sql.VarChar, password)
            .query(`
                INSERT INTO [PortfolioTracker].[User] (email, username, password)
                VALUES (@email, @username, @password)
            `);

        res.status(201).json({ message: "User registered successfully" }); //201 er created

    } catch (err) { //hvis der er en fejl i databasen
        console.error('SQL error (register)', err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
