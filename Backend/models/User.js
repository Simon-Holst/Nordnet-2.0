// models/User.js
const { poolPromise, sql } = require('../SQL/database'); // // Importerer databaseforbindelse

class User { //Constructor som indeholder attributter - Man kan kune have en constructor per klasse
  constructor(username, password, email) {
    this.username = username;
    this.password = password;
    this.email = email;
  }

  // Opretter en ny bruger i databasen
  async create() {
    try {
      const pool = await poolPromise; // Henter databaseforbindelse

      // Tjek om brugernavn eller email er taget
      const result = await pool.request() //Asynkron funktion tillader await. Opretter forespørgelse 
        .input('username', sql.VarChar, this.username) // .input forhindrer skadeligt sql, fx drop table
        .input('email', sql.VarChar, this.email)
        .query(`
          SELECT * FROM PortfolioTracker.[User]
          WHERE username = @username OR email = @email
        `); // Tjekker om username og email allerede er taget

      if (result.recordset.length > 0) { //recordset er det som kommer tilbage fra en forespørgsel
        throw new Error('Username or email already taken');
      }

      //Opret brugeren
      await pool.request() // Henter databaseforbindelse
        .input('username', sql.VarChar, this.username) // .input forhindrer skadeligt sql, fx drop table
        .input('password', sql.VarChar, this.password)
        .input('email', sql.VarChar, this.email)
        .query(`
          INSERT INTO PortfolioTracker.[User] (username, password, email)
          VALUES (@username, @password, @email)
        `); // Opretter forespørgsel på at indsætte dataen i tabellen for User

      return { message: 'User created successfully' };
    } catch (err) {
      throw new Error('User creation failed: ' + err.message);
    }
  }

  // Finder en bruger ud fra brugernavn
  static async findByUsername(username) { // Bruger static async for at finde en del af useren. Uden at oprette en tom bruger og så lede efter
    try {
      const pool = await poolPromise;// Henter databaseforbindelse
      const result = await pool.request() // Venter på databasens svar som gemmmes i result
        .input('username', sql.VarChar, username) //varChar gør, at det skal være tekst
        .query(`SELECT * FROM PortfolioTracker.[User] WHERE username = @username`); // Opretter forespørgsel og tjekker username med username

      return result.recordset[0]; // Svar fra mssql
    } catch (err) {
      throw new Error('User not found: ' + err.message); // Error besked
    }
  }

  // Validerer loginoplysninger
  static async authenticate(username, password) {  // Bruger static async som tager i mod to parametre, username og password
    try { // Try, catch blok
      const user = await User.findByUsername(username); // Bruger metoden findByUsername 
      if (user && user.password === password) {    // Tjekker om brugeren findes og om adgangskoden matcher
    return {   // Returnerer et objekt med brugerens ID, brugernavn og email hvis login er korrekt
        id: user.user_id, 
        username: user.username,
        email: user.email
      };
      } else {
        return null;       // Returnerer null hvis loginoplysningerne ikke matcher
      }
    } catch (err) {
      throw new Error('Authentication failed: ' + err.message);
    }
  }
}
module.exports = User; // Eksporterer klassen 
