const express = require("express")
const app = express()
const port = 3000
const session = require("express-session")
const authRoutes = require("./Backend/routes/authRoutes.js")

app.set("view engine", "ejs"); // Bruger EJS til at gengive HTML
app.set("views", __dirname + "/Frontend/Views");
app.use(express.static("Frontend/Public")); // Gør det muligt at hente css style fra vores public mappe 
app.use(express.urlencoded({ extended: true })); 

//Middleware
app.use(express.json())
app.use(session({
    secret: "Hemmelig_nøgle",
    resave: false,
    saveUninitialized: true,
}))

app.use("/api/auth", authRoutes);

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