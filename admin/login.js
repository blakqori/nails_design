const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;
  const button = loginForm.querySelector('button[type="submit"]');

  button.disabled = true;
  loginMessage.textContent = "Duke u kyçur...";

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Kyçja dështoi.");
    }

    window.location.replace("index.html");
  } catch (error) {
    loginMessage.textContent = error.message;
    button.disabled = false;
  }
});
