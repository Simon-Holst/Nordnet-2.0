// models/User.js
const { poolPromise, sql } = require('../SQL/database');

class User {
  constructor(username, password, email) {
    this.username = username;
    this.password = password;
    this.email = email;
  }

  // Opretter en ny bruger i databasen
  async create() {
    try {
      const pool = await poolPromise;

      // Tjek om brugernavn eller email er taget
      const result = await pool.request()
        .input('username', sql.VarChar, this.username)
        .input('email', sql.VarChar, this.email)
        .query(`
          SELECT * FROM PortfolioTracker.[User]
          WHERE username = @username OR email = @email
        `);

      if (result.recordset.length > 0) {
        throw new Error('Username or email already taken');
      }

      //Opret brugeren
      await pool.request()
        .input('username', sql.VarChar, this.username)
        .input('password', sql.VarChar, this.password)
        .input('email', sql.VarChar, this.email)
        .query(`
          INSERT INTO PortfolioTracker.[User] (username, password, email)
          VALUES (@username, @password, @email)
        `);

      return { message: 'User created successfully' };
    } catch (err) {
      throw new Error('User creation failed: ' + err.message);
    }
  }

  // Finder en bruger ud fra brugernavn
  static async findByUsername(username) {
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('username', sql.VarChar, username)
        .query(`SELECT * FROM PortfolioTracker.[User] WHERE username = @username`);

      return result.recordset[0];
    } catch (err) {
      throw new Error('User not found: ' + err.message);
    }
  }

  // Validerer loginoplysninger
  static async authenticate(username, password) {
    try {
      const user = await User.findByUsername(username);
      if (user && user.password === password) {
   
    return {
        id: user.user_id, 
        username: user.username,
        email: user.email
      };
      } else {
        return null;
      }
    } catch (err) {
      throw new Error('Authentication failed: ' + err.message);
    }
  }
}
module.exports = User;
