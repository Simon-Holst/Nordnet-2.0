// koden venter på at DOM'en er indlæst, før den kører
document.addEventListener('DOMContentLoaded', async () => {
// henter portfolioId fra body elementet bruges til hente portføljens aktier 
    const portfolioId = document.body.dataset.portfolioId;
  
    // Hent aktier + total value i porteføljen
    const res = await fetch(`/api/portfolios/${portfolioId}/stocks`); 
    const data = await res.json(); // retunerer holdings og totalValueUSD og totalValueDKK
  
    // udtrækker aktierne og total værdierne fra data
    const stocks = data.holdings;
    const totalValueDKK = data.totalValueDKK;
  
    // Vis samlet værdi i kort 
    const dkkCard = document.getElementById('dkkValueCard');
    if (dkkCard) {
      dkkCard.innerHTML = `DKK ${parseFloat(totalValueDKK).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    // Indsæt aktier i tabel ved at finde table body elementet og tilføje rækker
    const tableBody = document.getElementById('stocksTableBody');
    const chartLabels = []; // labels til pie chart
    const chartData = []; // data til pie chart
    // loop gennem aktierne og tilføj dem til tabellen (viser urealiseret gevinst i %)
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
  // tilføj aktien til pie chart labels og data
      chartLabels.push(stock.ticker);
      chartData.push(parseFloat(stock.expectedValue));
    });
  
    // PIE CHART – aktiefordeling finder pie chart canvas elementet og opretter en ny Chart (? sikre mod fejl)
    const pieCtx = document.getElementById('pieChart')?.getContext('2d');
    if (pieCtx) {
      new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: chartLabels, // labels til pie chart
          datasets: [{
            data: chartData, // data til pie chart
            backgroundColor: ['#f39c12', '#2ecc71', '#3498db', '#e74c3c', '#9b59b6'],
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
    }
    //LINE CHART – historisk udvikling 
    await drawPortfolioHistoryChart(portfolioId);
  });
  
  async function drawPortfolioHistoryChart(portfolioId) {
// henter historiske data fra API'et med portfolioId
    const res = await fetch(`/api/portfolios/${portfolioId}/history`);
    const data = await res.json(); 
// hvis der ingen data er, vis besked i grafen forhindrer i at vise tom eller ødelagt graf
    if (!data.length) {
      const chartBox = document.querySelector('.chart-box');
      const message = document.createElement('p');
      message.textContent = 'No history data yet.';
      message.style.color = 'white';
      chartBox.appendChild(message);
      return;
    }
  
    // labels til x-aksen med formattering til dansk datoformat
    const labels = data.map(d => new Date(d.date).toLocaleDateString('da-DK', { }));
    const values = data.map(d => d.value); // y-aksen værdierne
// finder line chart canvas elementet og opretter en ny Chart
    const lineCtx = document.getElementById('lineChart')?.getContext('2d');
    if (lineCtx) {
      new Chart(lineCtx, {
        type: 'line',
        data: {
          labels, // x-aksen labels
          datasets: [{
            label: 'Portfolio value (USD)', // label til grafen
            data: values, // y-aksen værdierne
            borderColor: '#2ecc71', // farven på linjen
            borderWidth: 2, // tykkelsen på linjen
            tension: 0.2, // glathed på linjen for at undgå knæk
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
  }
  