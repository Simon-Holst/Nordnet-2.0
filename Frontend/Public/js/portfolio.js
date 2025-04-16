// Vis formular
document.querySelector('.newPortfolio-btn').addEventListener('click', () => {
    const form = document.getElementById('portfolioForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
});

// Opret ny portfolio
document.getElementById('newPortfolioForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('portfolioName').value;
    const accountId = parseInt(document.getElementById('portfolioAccount').value);

    try {
        const res = await fetch('/api/portfolios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, accountId })
        });

        const result = await res.json();
        alert(result.message);
        if (res.ok) location.reload();
    } catch (err) {
        console.error(err);
        alert('Error creating portfolio.');
    }
});

async function loadAccounts() {
    const res = await fetch('/api/accounts');
    const accounts = await res.json();
    const select = document.getElementById('portfolioAccount');
    accounts
        .filter(acc => !acc.Closed_at)
        .forEach(acc => {
            const option = document.createElement('option');
            option.value = acc.account_id;
            option.textContent = acc.name;
            select.appendChild(option);
        });
}

async function loadPortfolios() {
    const res = await fetch('/api/portfolios');
    const portfolios = await res.json();
    const tableBody = document.getElementById('portfolios-table');
    tableBody.innerHTML = '';
    portfolios.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.name}</td>
            <td>${p.account_name}</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
        `;
        tableBody.appendChild(row);
    });
}

// Indlæs konti til trade-modal
async function loadAccountsToModal() {
    const res = await fetch('/api/accounts');
    const accounts = await res.json();
    const select = document.getElementById('account');
    select.innerHTML = '';
    accounts
        .filter(acc => !acc.Closed_at)
        .forEach(acc => {
            const option = document.createElement('option');
            option.value = acc.account_id;
            option.textContent = acc.name;
            select.appendChild(option);
        });
}

// Indlæs porteføljer til trade-modal
async function loadPortfoliosToModal() {
    const res = await fetch('/api/portfolios');
    const portfolios = await res.json();
    const select = document.getElementById('portfolio');
    select.innerHTML = '';
    portfolios.forEach(p => {
        const option = document.createElement('option');
        option.value = p.portfolio_id;
        option.textContent = p.name;
        select.appendChild(option);
    });
}

// Modal: åbn
document.getElementById('openTradeModal').addEventListener('click', () => {
    document.getElementById('tradeModal').style.display = 'block';
});

// Modal: luk
document.getElementById('closeTradeModal').addEventListener('click', () => {
    document.getElementById('tradeModal').style.display = 'none';
});

// Submit trade
document.getElementById('tradeForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        accountId: parseInt(document.getElementById('account').value),
        portfolioId: parseInt(document.getElementById('portfolio').value),
        trade_type: document.getElementById('trade_type').value,
        ticker_symbol: document.getElementById('ticker_symbol').value,
        security_type: document.getElementById('security_type').value,
        quantity: parseFloat(document.getElementById('quantity').value),
        total_price: parseFloat(document.getElementById('total_price').value),
        fee: parseFloat(document.getElementById('fee').value),
    };

    try {
        const res = await fetch('/api/trades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        alert(result.message);
        if (res.ok) {
            document.getElementById('tradeModal').style.display = 'none';
            location.reload();
        }
    } catch (err) {
        console.error('Trade error:', err);
        alert('Something went wrong submitting the trade.');
    }
});


document.addEventListener('DOMContentLoaded', () => {
    loadAccounts();
    loadPortfolios();
    loadAccountsToModal();
    loadPortfoliosToModal();
});

const searchInput = document.getElementById('search-stock');
const suggestions = document.getElementById('stock-suggestions');
const tickerInput = document.getElementById('ticker_symbol');

searchInput.addEventListener('input', async (e) => {
  const query = e.target.value.trim();
  if (query.length < 2) return (suggestions.innerHTML = '');

  const res = await fetch(`/api/stocks/search?q=${query}`);
  const matches = await res.json();

  suggestions.innerHTML = '';
  matches.forEach(stock => {
    const li = document.createElement('li');
    li.textContent = `${stock.name} (${stock.symbol})`;
    li.addEventListener('click', async () => {
      searchInput.value = `${stock.name} (${stock.symbol})`;
      tickerInput.value = stock.symbol;
      suggestions.innerHTML = '';

      // Hent aktuel pris og sæt i total_price input
      const priceRes = await fetch(`/api/stocks/${stock.symbol}`);
      const priceData = await priceRes.json();
      document.getElementById('total_price').value = priceData.price;
    });
    suggestions.appendChild(li);
  });
});
