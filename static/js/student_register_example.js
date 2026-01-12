import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ---------- FIREBASE ---------- */
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId:"", 
  appId: ""
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* ---------- REGISTER ---------- */
document.getElementById("register-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const errorBox = document.getElementById("error");
  const successBox = document.getElementById("success");
  const btn = document.getElementById("register-btn");

  errorBox.style.display = "none";
  successBox.style.display = "none";

  const originalText = btn.innerHTML;
  btn.innerHTML = "Creating Account...";
  btn.disabled = true;

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const phone = document.getElementById("phone").value.replace(/\D/g, "");
  const age = parseInt(document.getElementById("age").value);
  const parent_name = document.getElementById("parent_name").value.trim();
  const ratingRaw = document.getElementById("rating").value;

  /* ---------- VALIDATION ---------- */
  if (!name || name.length < 2) {
    showError("Invalid name"); return reset();
  }

  if (!email.includes("@")) {
    showError("Invalid email"); return reset();
  }

  if (password.length < 8) {
    showError("Password too short"); return reset();
  }

  if (phone.length !== 10) {
    showError("Phone must be 10 digits"); return reset();
  }

  if (isNaN(age) || age < 5 || age > 25) {
    showError("Age must be between 5 and 25"); return reset();
  }

  if (!parent_name) {
    showError("Parent name required"); return reset();
  }

  const rating = ratingRaw ? Number(ratingRaw) : null;

  try {
    /* ---------- FIREBASE ---------- */
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();

    /* ---------- BACKEND ---------- */
    const res = await fetch("/student/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        name,
        email,
        phone,
        age,
        parent_name,
        rating,
        firebase_uid: cred.user.uid
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Server error");

    successBox.innerText = "Registration successful! Redirecting to payment...";
    successBox.style.display = "block";

    setTimeout(() => {
      window.location.href = "/student/payment";
    }, 2000);

  } catch (err) {
    showError(err.message);
    reset();
  }

  function showError(msg) {
    errorBox.innerText = msg;
    errorBox.style.display = "block";
  }

  function reset() {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});
