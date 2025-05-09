# Portfolio tracker
Eksamen
Projektet benytter følgende teknologier:
 - Frontend (HTML, CSS og JavaScript)
 - Backend (node.js og express)
 - Database MySQL 
 - Eksterne API'er 
    - Aplha vantage (Historiske kurser)
    - Finnhub (stock priser)
    - ExchangeRate API (kurser)

Instalation
```npm install```

Kørsels vejledning 
indtast i terminalen ```node server.js```

Test
indtast i terminalen ```npm test```

VIGTIGT: 
Undgå at navigere for hurtigt mellem siderne, da det kan forårsage overskridelse af API-begrænsninger og midlertidige fejl.

I tilfælde af problmer:
- Hvis der kommer en database timeout ```ctrl c```og ```node server.js```
- Hvis handler/API forsager problemer ```ctrl c```og ```node server.js```


```Mappestruktur:
├── Backend/              
│   ├── models/           
│   │   └── User.js
│   ├── routes/           
│   │   ├── accountsRoutes.js
│   │   ├── authRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── portfoliosRoutes.js
│   │   ├── stockRoutes.js
│   │   ├── tradeRoutes.js
│   │   └── transactionRoutes.js
│   ├── services/        
│   │   ├── currencyService.js
│   │   ├── historicalPrices.js
│   │   └── stockService.js
│   └── SQL/             
│       └── database.js
│
├── Frontend/
│   ├── Public/          
│   │   ├── js/
│   │   │   ├── auth.js
│   │   │   ├── portfolio.js
│   │   │   ├── portfolioDetails.js
│   │   │   └── sidebar.js
│   │   ├── Accounts-logo.png
│   │   ├── Dashboard-logo.png
│   │   ├── Pig-logo.png
│   │   ├── Portfolios-logo.png
│   │   └── style.css
│   └── Views/            
│       ├── accounts.ejs
│       ├── dashboard.ejs
│       ├── login.ejs
│       ├── portfolioDetails.ejs
│       ├── portfolios.ejs
│       ├── register.ejs
│       └── stockDetails.ejs
│
├── Test/                
│   ├── auth.test.js
│   ├── register.test.js
│   └── stock.test.js
│
├── .env                 
├── package.json          
├── package-lock.json    
├── README.md            
└── server.js             
```