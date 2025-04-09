const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../SQL/database.js')

// LOGIN
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.VarChar, username)
            .input('password', sql.VarChar, password)
            .query('SELECT * FROM Users WHERE username = @username AND password = @password');

        if (result.recordset.length > 0) {
            req.session.loggedIn = true;
            req.session.username = username;
            res.json({ message: "Login successful" });
        } else {
            res.status(401).json({ error: 'Wrong username or password' });
        }
    } catch (err) {
        console.error('SQL error (login)', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// REGISTER
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const pool = await poolPromise;

        // Tjek om brugernavn eller email findes
        const existing = await pool.request()
            .input('username', sql.VarChar, username)
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Users WHERE username = @username OR email = @email');

        if (existing.recordset.length > 0) {
            return res.status(400).json({ error: "Username or email already taken" });
        }

        // Opret ny bruger
        await pool.request()
            .input('username', sql.VarChar, username)
            .input('email', sql.VarChar, email)
            .input('password', sql.VarChar, password)
            .query('INSERT INTO Users (username, email, password) VALUES (@username, @email, @password)');

        res.status(201).json({ message: "User registered successfully" });

    } catch (err) {
        console.error('SQL error (register)', err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
