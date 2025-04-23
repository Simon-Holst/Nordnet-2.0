fetch('/api/dashboard/overview')
  .then(res => res.json())
  .then(data => {
    document.getElementById('totalValue').textContent = `${parseFloat(data.totalValue).toLocaleString()} DKK`;
    document.getElementById('realizedProfit').textContent = `${parseFloat(data.realizedProfit).toLocaleString()} DKK`;
    document.getElementById('unrealizedProfit').textContent = `${parseFloat(data.unrealizedProfit).toLocaleString()} DKK`;
  });
