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

loadAccounts();
loadPortfolios();
