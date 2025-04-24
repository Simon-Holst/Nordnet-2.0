document.addEventListener('DOMContentLoaded', async () => {
    const portfolioId = document.body.dataset.portfolioId;
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
  
    // PIE CHART
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
  
    // MOCK LINE CHART (kan senere baseres på historik)
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [{
          label: 'Portefølje værdi',
          data: [100000, 150000, 180000, 250000, 210000, 190000, 230000],
          fill: false,
          borderColor: '#2ecc71',
          tension: 0.1
        }]
      },
      options: {
        plugins: {
          legend: {
            labels: { color: 'white' }
          }
        },
        scales: {
          x: { ticks: { color: 'white' } },
          y: { ticks: { color: 'white' } }
        }
      }
    });
  });
  