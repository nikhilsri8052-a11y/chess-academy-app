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

// Display current time
function updateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('current-time').textContent = `${dateString} • ${timeString}`;
}

// Password visibility toggle
function setupPasswordToggle() {
  const toggleBtn = document.getElementById('password-toggle');
  const passwordInput = document.getElementById('password');
  const eyeIcon = toggleBtn.querySelector('i');
  
  toggleBtn.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    eyeIcon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
  });
}

// Form validation
function validateForm(email, password) {
  const errorDiv = document.getElementById('error');
  
  if (!email || !email.includes('@')) {
    errorDiv.textContent = 'Please enter a valid email address';
    return false;
  }
  
  if (!password || password.length < 6) {
    errorDiv.textContent = 'Password must be at least 6 characters';
    return false;
  }
  
  errorDiv.textContent = '';
  return true;
}

// Login function
async function login() {
  const emailField = document.getElementById("email");
  const passField = document.getElementById("password");
  const errorDiv = document.getElementById("error");
  const loginBtn = document.getElementById("admin-login-btn");
  const rememberMe = document.getElementById("remember-me");

  // Validate inputs
  if (!validateForm(emailField.value, passField.value)) {
    return;
  }

  // UI updates
  errorDiv.textContent = "";
  loginBtn.classList.add("loading");
  loginBtn.disabled = true;

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

    if (res.ok) {
      // Success animation
      loginBtn.classList.remove("loading");
      loginBtn.classList.add("login-success");
      loginBtn.innerHTML = '<span class="btn-text"><i class="fas fa-check-circle"></i> Login Successful!</span>';
      
      // Brief delay for animation
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Redirect to dashboard
      window.location.href = "/admin";
    } else {
      const err = await res.json();
      throw new Error(err.error || "Login failed");
    }
  } catch (e) {
    console.error(e);
    
    // Clean up error message
    let errorMessage = e.message.replace("Firebase: ", "").replace("auth/", "");
    errorMessage = errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1);
    
    // Specific error messages
    if (e.message.includes('invalid-credential') || e.message.includes('wrong-password')) {
      errorMessage = "Invalid email or password. Please try again.";
    } else if (e.message.includes('user-not-found')) {
      errorMessage = "No account found with this email.";
    } else if (e.message.includes('too-many-requests')) {
      errorMessage = "Too many failed attempts. Please try again later.";
    }
    
    errorDiv.textContent = errorMessage;
    
    // Shake animation for error
    errorDiv.style.animation = 'none';
    setTimeout(() => {
      errorDiv.style.animation = 'shake 0.5s ease';
    }, 10);
    
    // Reset button
    loginBtn.classList.remove("loading");
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span class="btn-text">Login to Dashboard</span><span class="btn-icon"><i class="fas fa-arrow-right"></i></span><div class="loading-spinner"></div>';
  }
}

// Enter key support
function setupEnterKey() {
  const form = document.getElementById('login-form');
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      login();
    }
  });
}

// Initialize everything when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  // Update time initially and every minute
  updateTime();
  setInterval(updateTime, 60000);
  
  // Setup event listeners
  setupPasswordToggle();
  setupEnterKey();
  
  // Attach login function to button
  document.getElementById('admin-login-btn').addEventListener('click', login);
  
  // Focus on email field
  document.getElementById('email').focus();
  
  // Check for saved email
  const savedEmail = localStorage.getItem('admin-email');
  const rememberMe = document.getElementById('remember-me');
  
  if (savedEmail) {
    document.getElementById('email').value = savedEmail;
    rememberMe.checked = true;
  }
  
  // Save email if remember me is checked
  rememberMe.addEventListener('change', function() {
    if (!this.checked) {
      localStorage.removeItem('admin-email');
    }
  });
  
  // Save email on successful login
  window.addEventListener('beforeunload', () => {
    const email = document.getElementById('email').value;
    if (rememberMe.checked && email) {
      localStorage.setItem('admin-email', email);
    }
  });
});

// Expose login function globally
window.login = login;