import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase Config
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

document.addEventListener('DOMContentLoaded', () => {
    // 1. Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const globalError = document.getElementById('global-error');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');

            // Clear errors
            globalError.style.display = 'none';
            globalError.textContent = '';
        });
    });

    // 2. Password Toggle Logic
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            const input = e.currentTarget.previousElementSibling;
            const icon = e.currentTarget.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // 3. Login Functions
    async function handleLogin(e, role) {
        e.preventDefault();
        globalError.style.display = 'none';
        
        const emailInput = document.getElementById(`${role}-email`);
        const passwordInput = document.getElementById(`${role}-password`);
        const submitBtn = e.target.querySelector('.btn-submit');
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showError("Please fill in all fields.");
            return;
        }

        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            // Sign in with Firebase
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const token = await cred.user.getIdToken();

            // Send to backend
            const endpoint = role === 'admin' ? '/admin/session' : '/student/session';
            const redirectUrl = role === 'admin' ? '/admin/' : '/student/dashboard';

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token })
            });

            console.log(`[${role}] Response status:`, res.status, res.ok);

            if (res.ok) {
                // Success! Add a small delay to ensure cookie is set, then redirect
                console.log(`[${role}] Redirecting to ${redirectUrl}`);
                setTimeout(() => {
                    window.location.replace(redirectUrl);
                }, 500);
            } else {
                const err = await res.json();
                console.error(`[${role}] Server error:`, err);
                throw new Error(err.error || "Login failed");
            }
        } catch (error) {
            console.error(error);
            let errorMessage = error.message.replace("Firebase: ", "").replace("auth/", "");
            
            if (error.message.includes('invalid-credential') || error.message.includes('wrong-password')) {
                errorMessage = "Invalid email or password. Please try again.";
            } else if (error.message.includes('user-not-found')) {
                errorMessage = "No account found with this email.";
            } else if (error.message.includes('too-many-requests')) {
                errorMessage = "Too many failed attempts. Please try again later.";
            } else if (error.message === "Unauthorized") {
                errorMessage = `You are not authorized to login as ${role}. Please check your credentials or select the correct tab.`;
            }

            showError(errorMessage);
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }

    function showError(message) {
        globalError.textContent = message;
        globalError.style.display = 'block';
        globalError.style.animation = 'none';
        setTimeout(() => globalError.style.animation = 'shake 0.5s ease', 10);
    }

    // Attach listeners
    document.getElementById('student-login-form').addEventListener('submit', (e) => handleLogin(e, 'student'));
    document.getElementById('admin-login-form').addEventListener('submit', (e) => handleLogin(e, 'admin'));
});
