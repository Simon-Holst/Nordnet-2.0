document.addEventListener('DOMContentLoaded', () => {

    loadAccounts();
    loadPortfolios();
    loadAccountsToModal();
    loadPortfoliosToModal();
  
    // === Modal handling ===
    document.getElementById('openTradeModal').addEventListener('click', () => {
      document.getElementById('tradeModal').style.display = 'block';
    });
  
    document.getElementById('closeTradeModal').addEventListener('click', () => {
      document.getElementById('tradeModal').style.display = 'none';
    });
  
    // === Autocomplete & price logic ===
    const searchInput = document.getElementById('search-stock');
    const suggestions = document.getElementById('stock-suggestions');
    const tickerInput = document.getElementById('ticker_symbol');
    const totalPriceInput = document.getElementById('total_price');
    const feeInput = document.getElementById('fee');
    const quantityInput = document.getElementById('quantity');
  
    let currentPrice = 0;
  
    if (searchInput) {
      searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) return (suggestions.innerHTML = '');
  
        try {
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
  
              const priceRes = await fetch(`/api/stocks/${stock.symbol}`);
              const priceData = await priceRes.json();
              currentPrice = priceData.price;
              updatePriceAndFee();
            });
            suggestions.appendChild(li);
          });
        } catch (err) {
          console.error('Autocomplete error:', err);
        }
      });
    }
  
    if (quantityInput) {
      quantityInput.addEventListener('input', updatePriceAndFee);
    }
  
    function updatePriceAndFee() {
      const qty = parseFloat(quantityInput.value);
      if (!qty || !currentPrice) return;
      const total = qty * currentPrice;
      const fee = total * 0.005;
      totalPriceInput.value = total.toFixed(2);
      feeInput.value = fee.toFixed(2);
    }
  
    // === Submit trade ===
    document.getElementById('tradeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const payload = {
        accountId: parseInt(document.getElementById('account').value),
        portfolioId: parseInt(document.getElementById('portfolio').value),
        trade_type: document.getElementById('trade_type').value.toLowerCase(),
        ticker_symbol: document.getElementById('ticker_symbol').value,
        security_type: document.getElementById('security_type').value,
        quantity: parseFloat(document.getElementById('quantity').value),
        total_price: parseFloat(document.getElementById('total_price').value),
        fee: parseFloat(document.getElementById('fee').value)
      };
  
      try {
        const res = await fetch('/api/trade', {
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
        alert('Noget gik galt under handlen. Prøv igen.');
      }
    });
  });
  
  // === Helpers ===
  async function loadAccounts() {
    const res = await fetch('/api/accounts');
    const accounts = await res.json();
    const select = document.getElementById('portfolioAccount');
    accounts.filter(acc => !acc.Closed_at).forEach(acc => {
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
  
  async function loadAccountsToModal() {
    const res = await fetch('/api/accounts');
    const accounts = await res.json();
    const select = document.getElementById('account');
    select.innerHTML = '';
    accounts.filter(acc => !acc.Closed_at).forEach(acc => {
      const option = document.createElement('option');
      option.value = acc.account_id;
      option.textContent = acc.name;
      select.appendChild(option);
    });
  }
  
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
  