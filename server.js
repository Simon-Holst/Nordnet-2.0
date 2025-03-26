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
app.use(express.json())
app.use(session({
    secret: "Hemmelig_nøgle",
    resave: false,
    saveUninitialized: true,
}))

// Midlertidig data brugerdatabase
const users = {
    admin: {email: "admin@gmail.com", password: '1234'},
    user: {email: "user@gmail.com", password: 'pass'}
  };

  // Login-side
  app.get('/', (req, res) => {
    if (req.session.loggedIn) {
      res.redirect('/dashboard');
    } else {
      res.render('login', { error: null });
    }
  });

  app.get("/register", (req, res) => {
    res.render("register", { error: null });
});


  //Håndterer bruger oprettelse 
  app.post("/register", (req, res) => {
    const { username, email, password } = req.body;

    // Tjek om brugeren allerede findes
    if (users[username]) {
      return res.status(400).json({ error: "Username taken" });
    }
    // Tjek om email allerede findes
    for (let user in users) {
        if (users[user].email === email) {
          return res.status(400).json({ error: "E-mail taken" });
        }
    }

    // Gem den nye bruger
    users[username] = { email, password };
    console.log("Ny bruger oprettet:", users);
    
    res.json({ message: "User registered" });
});


  // Håndter login
  app.post('/login', (req, res) => {
    const { username, password } = req.body;
  
    if (users[username] && users[username].password === password) {
      req.session.loggedIn = true;
      req.session.username = username;
      res.json({ message: "Login successful" });
    } else {
      res.status(401).json({ error: 'Wrong username or password' });
    }
  });
  
  // Dashboard-side
  app.get('/dashboard', (req, res) => {
    if (!req.session.loggedIn) {
      return res.redirect('/'); // Send brugeren tilbage til login, hvis ikke logget ind
    }
    res.render('dashboard', { username: req.session.username });
  });
  
  app.get("/portfolios", (req, res) => {
    res.render("portfolios", { error: null });
});

app.get("/accounts", (req, res) => {
  res.render("accounts", { error: null });
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