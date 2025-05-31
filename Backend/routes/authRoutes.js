// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Importer User-modellen

// Registrer en ny bruger
router.post('/register', async (req, res) => { // Laver POST, da vi sender data. 
    const { username, password, email } = req.body; // Henter data fra front end, som bliver sendt i JSON pakke
    try {
      const user = new User(username, password, email); // Skaber en ny user klasse med username, password, email 
      await user.create(); // Kalder metoden for create - den tjekker om username og email er taget 
  
      res.status(201).json({ message: 'User registered successfully' }); // Hvis succes, så kommer en succesbesked
  
    } catch (err) {
      res.status(400).json({ error: err.message }); // Hvis fejl (username eller email er taget) sendes fejlbesked
    }
  });

// Login en bruger med express-session
router.post('/login', async (req, res) => { // Laver POST, da vi sender data. 
  const { username, password } = req.body; // Henter data fra front end, som bliver sendt i JSON pakke
  try {
    const user = await User.authenticate(username, password); // Bruger metoden authenticate med parametrene username og password
    if (user) {
      req.session.loggedIn = true 
      req.session.userId = user.id; 
      req.session.username = user.username;
      req.session.email = user.email;

      res.status(200).json({ message: 'Login successful', user: req.session.user }); // Login succes
    } else {
      res.status(401).json({ error: 'Invalid credentials' });// Login failed
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router; // Eksporterer router så den kan anvendes i server.js
