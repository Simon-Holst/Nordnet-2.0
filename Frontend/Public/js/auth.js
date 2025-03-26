// Authenticator til at håndtere login
export async function handleLogin(e){
    e.preventDefault();

    const formData = {
        username: document.getElementById("username").value,
        password: document.getElementById("password").value
    };

    try{
        const response = await fetch("/login",{
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
        });

        const result = await response.json();

        if(response.ok){
            window.location.href = "/dashboard"
        } else{
            alert(result.error || "Login failed")
        }
        } catch (error){
            console.log("Login Error", error);
            alert("Something went wrong");
        };
    };
// Håndterer oprettelse af bruger
export async function handleRegister(e){
    e.preventDefault();

    const formData = {
        email: document.getElementById("email").value,
        username: document.getElementById("username").value,
        password: document.getElementById("password").value
    };

    try{
        const response = await fetch("/register",{
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if(response.ok){
            window.location.href = "/"
        } else{
            alert(result.error || "Registration failed")
        }
        } catch (error){
            console.log("Register Error", error);
            alert("Something went wrong");
        };
    
    };

