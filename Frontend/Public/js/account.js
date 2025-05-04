// Når HTML er loaded kaldes alle funktioner
document.addEventListener('DOMContentLoaded', () => {
    initModals(); // gør det muligt at åbne og lukke modals
    initAccountFormHandler(); //håndterer opretning af ny konto
    initTransactionFormHandler(); //håndterer opretning af ny transaktion
    initStatusToggleHandler(); //håndterer lukning og genåbning af konto
    initAccountSelectHandler(); //håndterer ændring af konto i dropdown
  
    loadAccounts(); //henter alle konti fra databasen og viser dem i tabellen
    populateAccountDropdown(); //henter konti til dropdown menuen
  });
  
  //Modal handling
  function initModals() {
    //modal kaldes to gange 1 til transaktion og 1 til konto
    setupModal('toggleAccountForm', 'accountFormModal', 'closeAccountFormModalBtn');
    setupModal('toggleTransactionHistory', 'transactionsModal', 'closeTransactionsModalBtn');
  }
  
  function setupModal(openId, modalId, closeId) {
    //henter knapperne og modal
    const openBtn = document.getElementById(openId);
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(closeId);
  
//sikrer at knapperne og modal er tilstede
    if (!openBtn || !modal || !closeBtn) return;
  // åbner modal når knappen trykkes og lukker modal når knappen trykkes
    openBtn.addEventListener("click", () => modal.style.display = "block");
    closeBtn.addEventListener("click", () => modal.style.display = "none");
  // lukker modal når der klikkes udenfor modal
    window.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
  }
  
  // Account form for funktion
  function initAccountFormHandler() {
    const form = document.getElementById('newAccountForm'); //henter formularen
    if (!form) return; // hvis formularen ikke findes, stop funktionen
  // tilføjer event listener til formularen med e.preventDefault() for at forhindre siden i at reloade
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  // alle felter i formularen hentes og gemmes i en variabel data
      const data = {
        name: form.name.value,
        currency: form.currency.value,
        balance: parseFloat(form.balance.value), // sikrer at det er et tal resten er string
        bank_name: form.bank_name.value,
      };
  
      try {
// fetch bruges til at sende data til serveren med POST
        const res = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }, // angiver at data er i JSON format
          body: JSON.stringify(data) //strinify data, da fetch ikke kan håndtere objekter
        });
  
        const result = await res.json(); // henter svaret fra serveren
        alert(result.message); // viser besked til brugeren f.eks. account created
        if (res.ok) location.reload();
      } catch (err) { //hvis der er en fejl, log den i console og vis en alert
        console.error(err);
        alert('Error creating account.');
      }
    });
  }
  
  // funktion til at hente konti
  async function loadAccounts() {
    try {
    // sender GET request til serveren for at hente konti
      const res = await fetch('/api/accounts');
    // afventer svaret og konverterer det til JSON
      const accounts = await res.json();
  // finder tabellen i HTML og sletter indholdet så accounts ikke bliver tilføjet flere gange
      const table = document.getElementById('accountsTableBody');
      table.innerHTML = "";
  // looper gennem alle konti og tilføjer dem til tabellen
  // Hvis Closed_at er null, så er kontoen åben, ellers er den lukket
  //
      accounts.forEach(acc => {
        table.innerHTML += `
          <tr>
            <td>${acc.name}</td>
            <td>${acc.currency}</td>
            <td>${acc.balance.toFixed(2)}</td> 
            <td>${acc.bank_name}</td>
            <td>${acc.Closed_at ? "Closed" : "Open"}</td>
            <td>
              <button 
                class="toggle-status-btn ${acc.Closed_at ? 'reopen' : 'close'}" 
                data-id="${acc.account_id}" 
                data-status="${acc.Closed_at ? 'closed' : 'open'}">
                ${acc.Closed_at ? 'Reopen' : 'Close'}
              </button>
            </td>
          </tr>`;
      });
    } catch (err) { // hvis der er en fejl, log den i console og vis en alert
      console.error('Failed to load accounts:', err);
    }
  }
  
  // Funktion til at håndtere lukning og genåbning af konto
  function initStatusToggleHandler() {
    // tilføjer event listener til hele dokumentet, så den kan fange klik på knapperne
    document.addEventListener('click', async (e) => {
    // tjekker om knappen der blev klikket på er en toggle-status-btn hvis ikke gør funktionen ingenting
      if (!e.target.classList.contains('toggle-status-btn')) return;
  // henter værdien af data_id f.eks. class = toggle-status-btn data-id = 1
      const accountId = e.target.dataset.id;
//Henter værdien af data status attributten, som er enten open eller closed
      const status = e.target.dataset.status;
  
      try {
    // sender PATCH request til serveren for at opdatere kontoen
        const res = await fetch(`/api/accounts/${accountId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }, // angiver at data er i JSON format
          body: JSON.stringify({ status: status === 'open' ? 'closed' : 'open' }) // sender status som enten closed eller open
        });
  // afventer svaret og konverterer det til JSON og viser en alert med besked
        const result = await res.json();
        alert(result.message);
        if (res.ok) location.reload();
      } catch (err) { // hvis der er en fejl, log den i console og vis en alert
        console.error(err);
        alert("Failed to update account status.");
      }
    });
  }
  
  //Funktion til at hente konti til dropdown menuen
  async function populateAccountDropdown() {
    try {
// sender GET request til serveren for at hente konti
      const res = await fetch('/api/accounts');
//gemmer svaret i en variabel accounts og konverterer det til JSON
      const accounts = await res.json();
  //finder select elementet i HTML og sletter indholdet så konti ikke bliver tilføjet flere gange
      const select = document.getElementById('account');
      select.innerHTML = '';
  // looper gennem alle konti og tilføjer dem der ikke er lukkede til dropdown menuen 
      accounts
        .filter(acc => !acc.Closed_at)
        .forEach(acc => {
          const option = document.createElement('option'); // opretter et nyt option element
          option.value = acc.account_id; // sætter værdien til account_id
          option.textContent = acc.name; // sætter teksten til kontonavn
          select.appendChild(option); // tilføjer option til select elementet
        });
  // hvis der er konti i dropdown menuen og der er valgt en konto, så indlæses transaktioner for den valgte konto
  // på den måde loaderes der automatisk en konto
      if (accounts.length > 0 && select.value) {
        loadTransactions(parseInt(select.value));
      }
    } catch (err) {
      console.error('Error loading accounts:', err); // hvis der er en fejl, log den i console og vis en alert
    }
  }
  
  // Funktion til at håndtere oprettelse af transaktioner
  function initTransactionFormHandler() {
// henter formularen fra HTML, hvis ikke findes, så stop funktionen
    const form = document.getElementById('transactionForm');
    if (!form) return;
// når formularen bliver sendt, så forhindre siden i at reloade
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
// henter værdierne fra formularen og gemmer dem i en variabel data som kan kan sendes til serveren
      const data = {
        accountId: parseInt(form.account.value), //formateres til helt tal
        type: form.type.value, // typen af transaktion (indbetaling eller hævning)
        amount: parseFloat(form.amount.value), //formateres til kommatal
        currency: form.currency.value, // valutaen for transaktionen
      };
// sender data til serveren med fetch
      try {
        const res = await fetch('/api/transactions', {
          method: 'POST', // POST request til serveren
          headers: { 'Content-Type': 'application/json' }, // angiver at data er i JSON format
          body: JSON.stringify(data) // sender data pakken til serveren
        });
// afventer svaret og konverterer det til JSON og viser en alert med besked
        const result = await res.json();
        alert(result.message);
        if (res.ok) { // hvis svaret er ok, så opdateres transaktioner
          loadTransactions(data.accountId);
        }
      } catch (err) { // hvis der er en fejl, log den i console og vis en alert
        console.error(err);
        alert('Transaction failed.');
      }
    });
  }
  
  // Funktion til at hente transaktioner for en konto
  async function loadTransactions(accountId) {
    try {
// sender GET request til serveren for at hente transaktioner for konto med ønskede accountId
      const res = await fetch(`/api/transactions/${accountId}`);
// gemmer svaret i en variabel transactions og konverterer det til JSON
      const transactions = await res.json(); 
//finder tbody elementet i HTML med id transactionTable og sletter indholdet så transaktioner ikke bliver tilføjet flere gange
      const table = document.querySelector("#transactionTable tbody");
      table.innerHTML = "";
// looper gennem alle transaktioner (tx) og tilføjer dem til tabellen
// der oprettes 5 kolonner i tabellen med type, amount, currency, created_at og balance_after
      transactions.forEach(tx => {
        table.innerHTML += `
          <tr>
            <td>${tx.type}</td>
            <td>${tx.amount.toFixed(2)}</td>
            <td>${tx.currency}</td>
            <td>${new Date(tx.created_at).toLocaleString()}</td>
            <td>${tx.balance_after.toFixed(2)}</td>
          </tr>`;
      });
    } catch (err) { // hvis der er en fejl, log den i console og vis en alert
      console.error("Error loading transactions:", err);
    }
  }
  
  //funktion til at håndtere ændring af konto i dropdown menuen
  function initAccountSelectHandler() {
// henter select elementet fra HTML med id account, hvis ikke findes, så stop funktionen
    const select = document.getElementById('account');
    if (!select) return;
// tilføjer event listener til select elementet, så når der vælges en konto, så indlæses transaktioner for den valgte konto
    select.addEventListener('change', (e) => {
      const accountId = parseInt(e.target.value);
      if (!isNaN(accountId)) { // hvis accountId er et tal
        loadTransactions(accountId); 
      }
    });
  }
  