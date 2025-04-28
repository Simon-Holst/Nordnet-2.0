document.addEventListener('DOMContentLoaded', async () => {
    const portfolioId = document.body.dataset.portfolioId;
  
    // Hent aktier i porteføljen
    const res = await fetch(`/api/portfolios/${portfolioId}/stocks`);
    const stocks = await res.json();
  
    const tableBody = document.getElementById('stocksTableBody');
    const chartLabels = [];
    const chartData = [];
  
    stocks.forEach(stock => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <a href="/stocks/${stock.ticker}/details?portfolioId=${portfolioId}">
            ${stock.ticker}
          </a>
        </td>
        <td>${stock.quantity} stk.</td>
        <td style="color: ${parseFloat(stock.unrealizedGain) >= 0 ? 'lightgreen' : 'red'};">
          ${((parseFloat(stock.unrealizedGain) / (stock.GAK * stock.quantity)) * 100).toFixed(2)}%
        </td>
        <td>${stock.currentPrice} USD</td>
        <td>${stock.expectedValue} USD</td>
      `;
      tableBody.appendChild(row);
  
      chartLabels.push(stock.ticker);
      chartData.push(parseFloat(stock.expectedValue));
    });
  
    // PIE CHART – aktiefordeling
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [{
          data: chartData,
          backgroundColor: ['#f39c12', '#2ecc71', '#3498db', '#e74c3c', '#9b59b6'],
          hoverOffset: 6
        }]
      },
      options: {
        plugins: {
          legend: {
            labels: { color: 'white' }
          }
        }
      }
    });
  
    // LINE CHART – historisk udvikling
    await drawPortfolioHistoryChart(portfolioId);
  });
  
  async function drawPortfolioHistoryChart(portfolioId) {
    const res = await fetch(`/api/portfolios/${portfolioId}/history`);
    const data = await res.json();
  
    if (!data.length) {
      const chartBox = document.querySelector('.chart-box');
      const message = document.createElement('p');
      message.textContent = 'Ingen historiske data endnu.';
      message.style.color = 'white';
      chartBox.appendChild(message);
      return;
    }
  
    const labels = data.map(d => d.date);
    const values = data.map(d => d.value);
  
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    new Chart(lineCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Porteføljens værdi (urealiseret)',
          data: values,
          borderColor: '#2ecc71',
          borderWidth: 2,
          tension: 0.2,
          fill: false
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: { color: 'white' }
          }
        },
        scales: {
          x: { ticks: { color: 'white' } },
          y: {
            ticks: { color: 'white' },
            beginAtZero: false
          }
        }
      }
    });
  }
  