document.addEventListener('DOMContentLoaded', () => {

    loadAccounts();
    loadPortfolios();
    loadAccountsToModal();
    loadPortfoliosToModal();
    drawPortfolioDonutChart(); // ← Tilføjet korrekt her
  
    // Ny portfolio visning toggle
    document.querySelector('.newPortfolio-btn')?.addEventListener('click', () => {
      const formContainer = document.getElementById('portfolioForm');
      formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
    });
  
    // Portfolio oprettelse
    const newPortfolioForm = document.getElementById('newPortfolioForm');
    if (newPortfolioForm) {
      newPortfolioForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('portfolioName').value;
        const accountId = document.getElementById('portfolioAccount').value;
  
        try {
          const res = await fetch('/api/portfolios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, accountId })
          });
  
          if (res.ok) {
            alert("Portfolio created successfully");
            newPortfolioForm.reset();
            document.getElementById('portfolioForm').style.display = 'none';
            loadPortfolios();
            loadPortfoliosToModal();
          } else {
            const result = await res.json();
            alert("Error with creating portfolio: " + (result.message || "error"));
          }
        } catch (err) {
          console.error("Portfolio creation failed:", err);
          alert("Something went wrong.");
        }
      });
    }
  
    // Modal handling
    document.getElementById('openTradeModal')?.addEventListener('click', () => {
      document.getElementById('tradeModal').style.display = 'block';
    });
  
    document.getElementById('closeTradeModal')?.addEventListener('click', () => {
      document.getElementById('tradeModal').style.display = 'none';
    });
  
    // Autocomplete og prisberegning
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
  
    // Submit trade
    document.getElementById('tradeForm')?.addEventListener('submit', async (e) => {
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
  
  // === Udenfor DOMContentLoaded ===
  
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
    const data = await res.json(); // { portfolios, totalValueUSD, totalValueDKK }
  
    const portfolios = data.portfolios;
    const totalValueDKK = data.totalValueDKK;
  
    const tableBody = document.getElementById('portfolios-table');
    tableBody.innerHTML = '';
  
    portfolios.forEach(p => {
      const change = parseFloat(p.change24h);
      const changeFormatted = isNaN(change) ? '-' : `${change.toFixed(2)}%`;
      const changeClass = change > 0 ? 'text-green' : change < 0 ? 'text-red' : 'text-neutral';
  
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><a href="/portfolios/${p.portfolio_id}/details">${p.name}</a></td>
        <td>${p.account_name}</td>
        <td class="${changeClass}">${changeFormatted}</td>
        <td>${p.last_trade ? new Date(p.last_trade).toLocaleString() : '-'}</td>
        <td>${p.total_value ? parseFloat(p.total_value).toLocaleString() + ' USD' : '-'}</td>
      `;
      tableBody.appendChild(row);
    });
  
    renderTotalValueDKK(totalValueDKK);
  }
  
  function renderTotalValueDKK(totalValueDKK) {
    const container = document.getElementById('dkkCardContainer');
  
    container.innerHTML = '';
  
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h2>Total value (DKK)</h2>
      <p>DKK ${parseFloat(totalValueDKK).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    `;
  
    container.appendChild(card);
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
    const data = await res.json();
    const portfolios = data.portfolios;
    const select = document.getElementById('portfolio');
    select.innerHTML = '';
    portfolios.forEach(p => {
      const option = document.createElement('option');
      option.value = p.portfolio_id;
      option.textContent = p.name;
      select.appendChild(option);
    });
  }
  
  // PIE CHART
  async function drawPortfolioDonutChart() {
    try {
      const res = await fetch('/portfolios/values');
      if (!res.ok) throw new Error('Failed fetching pie chart data');
      const data = await res.json();
  
      if (!data || data.length === 0) return;
  
      const total = data.reduce((sum, p) => sum + p.value, 0);
      const labels = data.map(p => p.portfolioName);
      const values = data.map(p => p.value);
      const percentages = data.map(p => ((p.value / total) * 100).toFixed(1) + '%');
  
      const ctx = document.getElementById('portfolioDonut')?.getContext('2d');
      if (!ctx) return;
  
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#9333ea'],
          }]
        },
        options: {
          responsive: true,
          cutout: '60%',
          plugins: {
            legend: {
              position: 'right',
              labels: {
                generateLabels: function(chart) {
                  return chart.data.labels.map((label, i) => ({
                    text: `${label} (${percentages[i]})`,
                    fillStyle: chart.data.datasets[0].backgroundColor[i],
                    strokeStyle: '#000',
                    lineWidth: 1
                  }));
                }
              }
            }
          }
        }
      });
    } catch (err) {
      console.error('Fejl ved hentning af porteføljeværdier:', err);
    }
  }
  