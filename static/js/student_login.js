import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* Firebase Config (same project as admin) */
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
  const loginBtn = document.getElementById("student-login-btn");

  // UI reset
  errorDiv.innerText = "";
  loginBtn.disabled = true;
  loginBtn.innerText = "Verifying...";

  try {
    /* 1️⃣ Firebase Email/Password login */
    const cred = await signInWithEmailAndPassword(
      auth,
      emailField.value,
      passField.value
    );

    /* 2️⃣ Get Firebase ID token */
    const token = await cred.user.getIdToken();

    /* 3️⃣ Send token to backend (student session) */
    const res = await fetch("/student/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ token }),
    });

    if (res.ok) {
      console.log("Student login successful, redirecting...");
      window.location.href = "/student";
    } else {
      const err = await res.json();
      throw new Error(err.error || "Login failed");
    }

  } catch (e) {
    console.error(e);
    errorDiv.innerText = e.message.replace("Firebase: ", "");
    loginBtn.disabled = false;
    loginBtn.innerText = "Login";
  }
}

/* Attach click handler */
window.login = login;
document
  .getElementById("student-login-btn")
  .addEventListener("click", login);
