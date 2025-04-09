const sql = require('mssql');

const config = {
    user: 'mathias-bech',
    password: 'programmering123',
    server: 'myserver.database.windows.net',
    database: 'mydatabase',
    options : {
        encrypt: true, // For Azure
        trustServerCertificate: false // For Azure
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Connected to Azure SQL');
        return pool;
    })
    .catch(err => {
        console.error('Database connection failed:', err);
    });

module.exports = {
    sql,
    poolPromise
};