const sql = require('mssql');

const config = {
    user: 'mathias-bech',
    password: 'programmering1234!',
    server: 'mathias-bech.database.windows.net',
    database: 'Prog - Database',
    options : {
        encrypt: true, 
        trustServerCertificate: false 
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