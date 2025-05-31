const sql = require('mssql'); // til database forbindelse
// config til Azure SQL database (muligvis .env fil til kode)
const config = {
    user: 'mathias-bech', 
    password: 'programmering1234!', // Kunne med fordel ligge i env, da hard coded er dårlig kode-skik
    server: 'mathias-bech.database.windows.net',
    database: 'Prog - Database',
    options : {
        encrypt: true, 
        trustServerCertificate: false 
    }
};
// esentiel del der laver et pool af forbindelser (genbrug af forbindelser)
const poolPromise = new sql.ConnectionPool(config) // sql.ConnectionPool(...) er en metode fra mssql-pakken
    .connect() // opretter forbindelse til databasen - metode inden for mssql pakken
    .then(pool => { // når forbindelsen er oprettet skrives det i consol - metode inden for mssql pakken
        console.log('Connected to Azure SQL');
        return pool; // stopper når databasen er forbundet
    })
    .catch(err => { // fanger fejl ved forbindelse
        console.error('Database connection failed:', err);
    });
// eksportere sql og poolPromise til brug i andre filer
// sql bruges til at definere typer i queries f.eks. sql.Int, sql.VarChar osv.
// poolPromise bruges til at oprette forbindelse til databasen f.eks. await poolRequest
module.exports = {
    sql,
    poolPromise
};