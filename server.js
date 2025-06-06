const express = require("express")
const app = express()
const port = 3000
const session = require("express-session")  // Importerer session middleware til at håndtere brugerlogin-sessioner
require('dotenv').config(); // Indlæser fra .env-fil

// Henter alle route filer
const authRoutes = require("./Backend/routes/authRoutes.js")
const accountRoutes = require('./Backend/routes/accountsRoutes');
const transactionRoutes = require('./Backend/routes/transactionRoutes.js');
const portfoliosRoutes = require('./Backend/routes/portfoliosRoutes.js');
const tradeRoutes = require('./Backend/routes/tradeRoutes.js');
const stockRoutes = require('./Backend/routes/stockRoutes.js');
const dashboardRoutes = require('./Backend/routes/dashboardRoutes.js');

app.set("view engine", "ejs"); // Bruger EJS til at gengive HTML
app.set("views", __dirname + "/Frontend/Views"); // fortæller for express finder ejs filer i views mappen
app.use(express.static("Frontend/Public")); // Gør det muligt at hente css style fra vores public mappe 
app.use(express.urlencoded({ extended: true })); // Gør det muligt at læse data fra formularer

//opret session middleware
app.use(session({
    secret: "Hemmelig_nøgle", // Bruges til at signere session-cookie
    resave: false, // Gem ikke sessionen igen i databasen, hvis der ikke er sket nogen ændringer under requesten
    saveUninitialized: true, // Gem en ny session, selvom du ikke har lagt noget data i den endnu
    cookie: { secure: false } // Virker, selvom vi ikke bruger lås (HTTPS). Sat til undefined som udgangspunkt
}))

app.use(express.json())
//API endpoints
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/portfolios", portfoliosRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/stocks", stockRoutes);
//Page routes
app.use("/portfolios", portfoliosRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/stocks", stockRoutes);
app.use("/dashboard", dashboardRoutes);



  // Login-side redirigerer til dashboard hvis brugeren er logget ind
  app.get('/', (req, res) => {
    if (req.session.loggedIn) {
      res.redirect('/dashboard');
    } else {
      res.render('login', { error: null });
    }
  });

// render register siden
  app.get("/register", (req, res) => {
    res.render("register", { error: null });
});
// render portfolio siden
  app.get("/portfolios/view", (req, res) => {
    res.render("portfolios", { error: null });
});
// render accounts siden
app.get("/accounts", (req, res) => {
  res.render("accounts", { error: null });
});

  // Logout destroyerer sessionen og sender brugeren til login siden
  app.get('/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });

  module.exports = app; // Eksporterer app til test

// lytter på port 3000
app.listen(port, () => {
    console.log(`Serveren kører på http://localhost:${port}`);
});