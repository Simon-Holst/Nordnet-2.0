document.addEventListener('DOMContentLoaded', async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
  
      // Opdater dashboard stats
      document.getElementById('totalValue').textContent = `${parseFloat(data.totalValue).toLocaleString()} DKK`;
      document.getElementById('realizedProfit').textContent = `${parseFloat(data.realizedProfit).toLocaleString()} DKK`;
      document.getElementById('unrealizedProfit').textContent = `${parseFloat(data.unrealizedProfit).toLocaleString()} DKK`;
  
      // Opdater mest værdi tabal
      const stocksTable = document.getElementById('stocks-table');
      stocksTable.innerHTML = '';
      data.topByValue.forEach(stock => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${stock.symbol}</td>
          <td>${stock.portfolio}</td>
          <td>-</td>
          <td>${parseFloat(stock.value).toLocaleString()} DKK</td>
        `;
        stocksTable.appendChild(row);
      });
  
      // Opdater profit tabel
      const profitTable = document.getElementById('profit-table');
      profitTable.innerHTML = '';
      data.topByProfit.forEach(stock => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${stock.symbol}</td>
          <td>${stock.portfolio}</td>
          <td>-</td>
          <td>${parseFloat(stock.unrealizedProfit).toLocaleString()} DKK</td>
        `;
        profitTable.appendChild(row);
      });
  
    } catch (err) {
      console.error('Fejl ved hentning af dashboard stats:', err);
    }
  });
  

 