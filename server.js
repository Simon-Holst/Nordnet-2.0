const express = require("express")
const app = express()
const port = 3000
const session = require("express-session")
const bodyParser = require("body-parser")

app.set("view engine", "ejs"); // Bruger EJS til at gengive HTML
app.set("views", __dirname + "/Frontend/Views");
app.use(express.static("Frontend/Public")); // Gør det muligt at hente css style fra vores public mappe 

//Middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({
    secret: "Hemmelig_nøgle",
    resave: false,
    saveUninitialized: true,
}))

// Midlertidig data brugerdatabase
const users = {
    admin: '1234',
    user: 'pass'
  };

  // Login-side
  app.get('/', (req, res) => {
    if (req.session.loggedIn) {
      res.redirect('/dashboard'); // Hvis brugeren er logget ind, send til dashboard
    } else {
      res.render('login', { error: null }); // Render login-siden
    }
  });

  // Håndter login
  app.post('/login', (req, res) => {
    const { username, password } = req.body;
  
    if (users[username] && users[username] === password) {
      req.session.loggedIn = true;
      req.session.username = username;
      res.redirect('/dashboard'); // Gå til dashboard
    } else {
      res.render('login', { error: 'Wrong username or password' });
    }
  });
  
  // Dashboard-side
  app.get('/dashboard', (req, res) => {
    if (!req.session.loggedIn) {
      return res.redirect('/'); // Send brugeren tilbage til login, hvis ikke logget ind
    }
    res.render('dashboard', { username: req.session.username });
  });
  
  // Logout
  app.get('/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });

app.listen(port, () => {
    console.log(`Serveren kører på http://localhost:${port}`);
});