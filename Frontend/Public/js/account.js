// Visning af formular
document.addEventListener("DOMContentLoaded", () => {
    const openBtn = document.getElementById("toggleAccountForm");
    const modal = document.getElementById("accountFormModal");
    const closeBtn = document.getElementById("closeAccountFormModalBtn");
  
    if (openBtn && modal && closeBtn) {
      openBtn.addEventListener("click", () => {
        modal.style.display = "block";
      });
  
      closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
      });
  
      window.addEventListener("click", (event) => {
        if (event.target === modal) {
          modal.style.display = "none";
        }
      });
    }
  });
  
// Visning af historik
document.addEventListener("DOMContentLoaded", function () {
    const toggleBtn = document.getElementById("toggleTransactionHistory");
    const closeBtn = document.getElementById("closeTransactionsModalBtn");
    const transactionsModal = document.getElementById("transactionsModal");
  
    if (toggleBtn && closeBtn && transactionsModal) {
      toggleBtn.addEventListener("click", () => {
        transactionsModal.style.display = "block";
      });
  
      closeBtn.addEventListener("click", () => {
        transactionsModal.style.display = "none";
      });
  
      window.addEventListener("click", (event) => {
        if (event.target === transactionsModal) {
          transactionsModal.style.display = "none";
        }
      });
    }
  });


// Send formdata til serveren
document.getElementById('newAccountForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const currency = document.getElementById('currency').value;
    const balance = parseFloat(document.getElementById('balance').value);
    const bank_name = document.getElementById('bank_name').value;

    try {
        const res = await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, currency, balance, bank_name })
        });

        const result = await res.json();
        alert(result.message);
        if (res.ok) location.reload();
    } catch (err) {
        console.error(err);
        alert('Something went wrong while creating account.');
    }
});

// Hent og vis alle konti
async function loadAccounts() {
    try {
        const res = await fetch('/api/accounts');
        const accounts = await res.json();

        const tableBody = document.getElementById('accountsTableBody');
        accounts.forEach(acc => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${acc.name}</td>
                <td>${acc.currency}</td>
                <td>${acc.balance.toFixed(2)}</td>
                <td>${acc.bank_name}</td>
                <td>${acc.Closed_at ? "Closed" : "Open"}</td>
                <td>
               <button 
            class="toggle-status-btn ${acc.Closed_at ? 'reopen' : 'close'}" 
            data-id="${acc.account_id}" 
            data-status="${acc.Closed_at ? 'closed' : 'open'}"
            >
            ${acc.Closed_at ? 'Reopen' : 'Close'}
        </button>
                </td>`
        
            tableBody.appendChild(row);
        });
    } catch (err) {
        console.error(err);
    }
}

//Account status toggle 
//OBS evt. domstatus så det fungerer uden reload
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('toggle-status-btn')) {
        const accountId = e.target.dataset.id;
        const status = e.target.dataset.status;

        try {
            const res = await fetch(`/api/accounts/${accountId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    status: status === 'open' ? 'closed' : 'open'
                })
            });

            const result = await res.json();
            alert(result.message);
            if (res.ok) location.reload();
        } catch (err) {
            console.error(err);
            alert("Something went wrong while updating account status.");
        }
    }
});

async function populateAccountDropdown() {
    try {
        const res = await fetch('/api/accounts', { credentials: 'include' });
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

        // Indlæs historik for første konto i listen
        if (accounts.length > 0 && select.value) {
            loadTransactions(parseInt(select.value));
        }

    } catch (err) {
        console.error('Error loading accounts for dropdown:', err);
    }
}

// Sender transaktion til serveren
document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const accountId = parseInt(document.getElementById('account').value);
    const type = document.getElementById('type').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const currency = document.querySelector('#transactionForm #currency').value; //*


    try {
        const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ accountId, type, amount, currency })
        });

        const result = await res.json();
        alert(result.message);
        if (res.ok) {
            loadTransactions(accountId); // opdater historik live
        }
    } catch (err) {
        console.error(err);
        alert('Transaction failed.');
    }
});

// Henter transaktionshistorik for en konto
async function loadTransactions(accountId) {
    try {
        const res = await fetch(`/api/transactions/${accountId}`, {
            credentials: 'include'
        });
        const transactions = await res.json();

        const table = document.querySelector("#transactionTable tbody");
        table.innerHTML = "";

        transactions.forEach(tx => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${tx.type}</td>
                <td>${tx.amount.toFixed(2)}</td>
                <td>${tx.currency}</td>
                <td>${new Date(tx.created_at).toLocaleString()}</td>
                <td>${tx.balance_after.toFixed(2)}</td>
            `;
            table.appendChild(row);
        });
    } catch (err) {
        console.error("Error loading transactions:", err);
    }
}

// Når konto vælges i dropdown hent historik
document.getElementById('account').addEventListener('change', (e) => {
    const accountId = parseInt(e.target.value);
    if (!isNaN(accountId)) {
        loadTransactions(accountId);
    }
});


document.addEventListener('DOMContentLoaded', () => {
    loadAccounts();
    populateAccountDropdown();
  });
