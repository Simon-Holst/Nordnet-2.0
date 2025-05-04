// Når hele DOM'en er indlæst starter scriptet
document.addEventListener('DOMContentLoaded', () => {

    loadAccounts();
    loadPortfolios();
    loadAccountsToModal();
    loadPortfoliosToModal();
    drawPortfolioDonutChart();
  
    // Ny portfolio visning toggle når knap trykkes ændres til at vise eller skjule formularen
    document.querySelector('.newPortfolio-btn')?.addEventListener('click', () => {
      const formContainer = document.getElementById('portfolioForm');
      formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
    });
  
    // Portfolio oprettelse med POST
    const newPortfolioForm = document.getElementById('newPortfolioForm'); //Henter portfolio formularen
    if (newPortfolioForm) { // sikrer at formularen eksisterer
    // asynkron funktion som håndterer submit event fra formularen
      newPortfolioForm.addEventListener('submit', async (e) => {
        e.preventDefault();
    // henter værdier fra formularen navn og accountId
        const name = document.getElementById('portfolioName').value;
        const accountId = document.getElementById('portfolioAccount').value;
    // HTTP post til backend for at oprette en ny portfolio
        try {
          const res = await fetch('/api/portfolios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ name, accountId })
          });
  // hvis svaret er ok så viser en succes besked og nulstiller formularen og sætter display til none
          if (res.ok) {
            alert("Portfolio created successfully");
            newPortfolioForm.reset();
            document.getElementById('portfolioForm').style.display = 'none';
            loadPortfolios(); // opdaterer porteføljevisningen ved at kalde de andre funktioner
            loadPortfoliosToModal();
          } else {
            const result = await res.json();  // hvis der er en fejl i svaret vis det en fejlbesked fall back error hvis der ikke er en fejl
            alert("Error with creating portfolio: " + (result.message || "error"));
          }
        } catch (err) { // hvis der er en fejl i anmodningen vis en fejlbesked
          console.error("Portfolio creation failed:", err);
          alert("Something went wrong.");
        }
      });
    }
  
    // Modal handling simpel (forståelse for basal DOM-manipulation)
    document.getElementById('openTradeModal')?.addEventListener('click', () => {
      document.getElementById('tradeModal').style.display = 'block';
    });
  
    document.getElementById('closeTradeModal')?.addEventListener('click', () => {
      document.getElementById('tradeModal').style.display = 'none';
    });
  
    // Autocomplete og prisberegning
    // Henter elementer fra HTML 
    const searchInput = document.getElementById('search-stock');
    const suggestions = document.getElementById('stock-suggestions');
    const tickerInput = document.getElementById('ticker_symbol');
    const totalPriceInput = document.getElementById('total_price');
    const feeInput = document.getElementById('fee');
    const quantityInput = document.getElementById('quantity');
  // variabel til at gemme aktiekursen bruges til at beregne total pris og gebyr
    let currentPrice = 0;
  // lytter efter input i søgefeltet og sender en anmodning til serveren for at hente aktier
    if (searchInput) {
      searchInput.addEventListener('input', async (e) => {
  // Trimmer for mellemrum hjælper med brugervenlighed og undgår unødvendige anmodninger
        const query = e.target.value.trim();
        if (query.length < 2) return (suggestions.innerHTML = '');
  // kalder backend api der viser aktier der mather søgning (query)
        try {
          const res = await fetch(`/api/stocks/search?q=${query}`);
          const matches = await res.json();
          suggestions.innerHTML = ''; // listen rydes før de nye resultater tilføjes 
  // går gennem resultaterne og opretter liste elementer der viser aktienavn og symbol
          matches.forEach(stock => {
            const li = document.createElement('li');
            li.textContent = `${stock.name} (${stock.symbol})`;
  // Når brugeren klikker på en aktie indsættes info i inputfeltet og tickerInput
            li.addEventListener('click', async () => {
              searchInput.value = `${stock.name} (${stock.symbol})`;
              tickerInput.value = stock.symbol;
              suggestions.innerHTML = ''; // rydder listen
  // Henter aktuel aktiekurs fra serveren og opdaterer total pris og gebyr
              const priceRes = await fetch(`/api/stocks/${stock.symbol}`);
              const priceData = await priceRes.json();
              currentPrice = priceData.price;
              updatePriceAndFee(); // opdaterer pris og gebyr
            });
            suggestions.appendChild(li); // tilføjer liste elementet til listen
          });
        } catch (err) { // hvis der er en fejl i anmodningen vis en fejlbesked
          console.error('Autocomplete error:', err);
        }
      });
    }
  // når brugeren indtaster mængde opdateres total pris og gebyr
    if (quantityInput) {
      quantityInput.addEventListener('input', updatePriceAndFee);
    }
  // funktion til at opdatere total pris og gebyr
    function updatePriceAndFee() {
      const qty = parseFloat(quantityInput.value);
      if (!qty || !currentPrice) return; // hvis der ikke er nogen mængde eller aktiekurs slutter funktionen
      const total = qty * currentPrice; // beregner total pris
      const fee = total * 0.005; // gebyr er 0.5% af total pris
      totalPriceInput.value = total.toFixed(2); // viser total pris med 2 decimaler
      feeInput.value = fee.toFixed(2); // viser gebyr med 2 decimaler
    }
  
    // Submit trade forhinder reload og lytter efter submit event fra formularen
    document.getElementById('tradeForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
    // samler data fra formularen i payload objektet (skal sendes til backend)
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
    // Sender datapakken payload til serveren via POST anmodning i json format
      try {
        const res = await fetch('/api/trade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
    // viser besked fra backend hvis anmodningen lykkedes eller fejlede
        const result = await res.json();
        alert(result.message);
    // hvis anmodningen lykkedes så lukker modal og genindlæser siden
        if (res.ok) {
          document.getElementById('tradeModal').style.display = 'none';
          location.reload();
        }
      } catch (err) { // hvis der er en fejl i anmodningen vis en fejlbesked
        console.error('Trade error:', err);
        alert('Transaction error try again.');
      }
    });
  
  });
  
  // Udenfor DOMContentLoaded
// asynkron funktion til at hente konti og opdatere dropdown menuen
  async function loadAccounts() {
    const res = await fetch('/api/accounts'); // henter konti fra serveren
    const accounts = await res.json(); // svarer fra serveren konverteres til json og gemmet i accounts
    const select = document.getElementById('portfolioAccount'); // henter select elementet fra html
    accounts.filter(acc => !acc.Closed_at).forEach(acc => { // filtrerer konti der ikke er lukket
      const option = document.createElement('option'); // opretter et nyt option element
      option.value = acc.account_id; // sætter værdien til account_id
      option.textContent = acc.name; // sætter teksten til kontonavn
      select.appendChild(option); // tilføjer option elementet til select
    });
  }
// asynkron funktion til at hente porteføljer og opdatere tabellen
  async function loadPortfolios() {
    const res = await fetch('/api/portfolios'); // henter porteføljer fra serveren
    const data = await res.json(); // gemmer svar i data variabel { portfolios, totalValueUSD, totalValueDKK }
// splitter objektet op i 2 variable portfolios og totalValueDKK
    const portfolios = data.portfolios;
    const totalValueDKK = data.totalValueDKK;
// henter tabellen fra html og nulstiller så den kan opdateres 
    const tableBody = document.getElementById('portfolios-table');
    tableBody.innerHTML = '';
// går gennem hver portfolio først findes ændringerne i 24 timer og formaterer dem til procent
    portfolios.forEach(p => {
      const change = parseFloat(p.change24h);
      const changeFormatted = isNaN(change) ? '-' : `${change.toFixed(2)}%`;
// Hvis værdien er positiv så farven bliver grøn, hvis negativ så rød og neutral hvis ingen ændring
      const changeClass = change > 0 ? 'text-green' : change < 0 ? 'text-red' : 'text-neutral';
// opretter et nyt række element og tilføjer data til det med reference på portfølje id så man kan tilgå portfolioDetails.ejs
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
// renderer den samlede værdi i DKK til vores card
    renderTotalValueDKK(totalValueDKK);
  }

// funktion til at vise den samlede værdi i DKK i cardet
  function renderTotalValueDKK(totalValueDKK) {
// finder card containeret i html og nulstiller det
    const container = document.getElementById('dkkCardContainer');
    container.innerHTML = '';
// opretter et nyt div element og tilføjer klassen card
    const card = document.createElement('div');
    card.className = 'card';
// tilføjer indhold til cardet med den samlede værdi i DKK
    card.innerHTML = `
      <h2>Total value (DKK)</h2>
      <p>DKK ${parseFloat(totalValueDKK).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    `;
// tilføjer det færdige kort til containeret
    container.appendChild(card);
  }
// asynkron funktion til at hente konti og opdatere modal dropdown menuen
  async function loadAccountsToModal() {
// henter konti fra serveren og gemmer dem i accounts
    const res = await fetch('/api/accounts');
    const accounts = await res.json();
// finder select elementet i modal og nulstiller det
    const select = document.getElementById('account');
    select.innerHTML = '';
// går gennem konti og tilføjer dem til select elementet hvis de ikke er lukket
    accounts.filter(acc => !acc.Closed_at).forEach(acc => {
      const option = document.createElement('option');
      option.value = acc.account_id;
      option.textContent = acc.name;
      select.appendChild(option);
    });
  }
// asynkron funktion til at hente porteføljer og opdatere modal dropdown menuen
  async function loadPortfoliosToModal() {
// henter porteføljer fra serveren og gemmer dem i portfolios
    const res = await fetch('/api/portfolios');
    const data = await res.json();
    const portfolios = data.portfolios; //Henter kun portfolios fra data f.eks. { portfolios, totalValueUSD, totalValueDKK }
    const select = document.getElementById('portfolio');
    select.innerHTML = ''; // nulstiller select elementet
// for hver portfølje opretter et option element og tilføjer det til select elementet
    portfolios.forEach(p => {
      const option = document.createElement('option');
      option.value = p.portfolio_id;
      option.textContent = p.name;
      select.appendChild(option);
    });
  }
  
  // Doughnut CHART asynkron funktion til at hente portefølje værdier og tegne donut chart
  async function drawPortfolioDonutChart() {
    try {
  // henter portefølje værdier via endpoint /portfolios/values hvis fetch fejler så vis fejlbesked
      const res = await fetch('/portfolios/values');
      if (!res.ok) throw new Error('Failed fetching pie chart data');
      const data = await res.json();
  // hvis der ikke er nogen data så afsluttes funktionen
      if (!data || data.length === 0) return;
  // lægger værdien af alle portføljer sammen for at kunne beregne procentfordeling 
      const total = data.reduce((sum, p) => sum + p.value, 0);
      const labels = data.map(p => p.portfolioName); // henter portfølje navne
      const values = data.map(p => p.value); // henter portfølje værdier
      const percentages = data.map(p => ((p.value / total) * 100).toFixed(1) + '%'); // beregner procentfordeling
  // finder canvas elementet i html og henter konteksten til at tegne på 
      const ctx = document.getElementById('portfolioDonut')?.getContext('2d');
      if (!ctx) return; // hvis konteksten ikke findes så afsluttes funktionen
  //initialiserer chart.js og opretter et nyt donut chart med data og indstillinger
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
          responsive: true, // gør chart responsiv
          cutout: '60%', // skaber donut effekt
          plugins: {
            legend: {
              position: 'right', //forklaringsboksen placeres til højre
              labels: {
                generateLabels: function(chart) {
                  return chart.data.labels.map((label, i) => ({
                    text: `${label} (${percentages[i]})`, // teksten
                    fillStyle: chart.data.datasets[0].backgroundColor[i], //angiver farven som matcher chart farven
                    strokeStyle: '#000', // angiver kantfarven
                    lineWidth: 1 // angiver tykkelsen på kanten
                  }));
                }
              }
            }
          }
        }
      });
    } catch (err) { // hvis der er en fejl i anmodningen vis en fejlbesked
      console.error('error fetching portfolio values:', err);
    }
  }
  