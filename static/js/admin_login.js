import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// !!! IMPORTANT: Replace with your actual Firebase Project Config !!!
const firebaseConfig = {
  apiKey: "AIzaSyAXuS_IRyEAPhsg4-qCk6mkFrsDdBB63Mo",
  authDomain: "sschessclass.firebaseapp.com",
  projectId: "sschessclass",
  storageBucket: "sschessclass.firebasestorage.app",
  messagingSenderId: "985923998522",
  appId: "1:985923998522:web:d768628884cc3dd1d0f603",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function login() {
  const emailField = document.getElementById("email");
  const passField = document.getElementById("password");
  const errorDiv = document.getElementById("error");
  const loginBtn = document.getElementById("admin-login-btn");

  // Basic UI Reset
  errorDiv.innerText = "";
  loginBtn.disabled = true;
  loginBtn.innerText = "Verifying...";

  try {
    // 1. Client-side Login
    const cred = await signInWithEmailAndPassword(auth, emailField.value, passField.value);
    
    // 2. Get ID Token
    const token = await cred.user.getIdToken();

    // 3. Send to backend to swap for Session Cookie
    const res = await fetch("/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ token })
    });

    // inside the login() function
    if (res.ok) {
      console.log("Login successful, redirecting to dashboard..."); // <--- Check console for this
      window.location.href = "/admin";
    } else {
      const err = await res.json();
      throw new Error(err.error || "Login failed");
    }
  } catch (e) {
    console.error(e);
    errorDiv.innerText = e.message.replace("Firebase: ", ""); // Clean up error message
    loginBtn.disabled = false;
    loginBtn.innerText = "Login";
  }
}

// Attach to window so HTML button can call it, or use event listener
window.login = login;
document.getElementById("admin-login-btn").addEventListener("click", login);