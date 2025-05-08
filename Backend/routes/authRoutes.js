// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Importer User-modellen

// Registrer en ny bruger
router.post('/register', async (req, res) => {
    const { username, password, email } = req.body;
    try {
      const user = new User(username, password, email);
      await user.create();
  
      res.status(201).json({ message: 'User registered successfully' });
  
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

// Login en bruger med express-session
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.authenticate(username, password);
    if (user) {
      req.session.loggedIn = true
      req.session.userId = user.id; 
      req.session.username = user.username;
      req.session.email = user.email;

      res.status(200).json({ message: 'Login successful', user: req.session.user });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
