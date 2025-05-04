// auth.js
// Eksporteret funktion til at håndtere login
// asynkron funkttion som tager imod event som parameter
export async function handleLogin(event) {
    event.preventDefault();
// hender input fra html formularen username og password
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
//sender en fetch request til serveren med username og password
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // angiver at vi sender json data
        body: JSON.stringify({ username, password }) // konverterer data til json format
    });
// modtager svaret fra serveren
    const data = await response.json();
//hvis svaret er ok så redirecter vi til dashboard ellers viser en fejl
    if (response.ok) {
        window.location.href = '/dashboard';
    } else {
        alert(data.error || 'Login failed');
    }
}

export async function handleRegister(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password })
    });

    const data = await response.json();

    if (response.ok) {
        window.location.href = '/'; // Redirect til login
    } else {
        alert(data.error || 'Registration failed');
    }
}
