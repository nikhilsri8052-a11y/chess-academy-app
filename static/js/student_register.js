import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAXuS_IRyEAPhsg4-qCk6mkFrsDdBB63Mo",
    authDomain: "sschessclass.firebaseapp.com",
    projectId: "sschessclass",
    storageBucket: "sschessclass.firebasestorage.app",
    messagingSenderId: "985923998522",
    appId: "1:985923998522:web:d768628884cc3dd1d0f603"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const form = document.getElementById('register-form');
const btn = document.getElementById('register-btn');
const btnText = document.getElementById('btn-text');
const spinner = document.getElementById('btn-spinner');
const errorBox = document.getElementById('error-box');
const successBox = document.getElementById('success-box');

// --- INTERACTIVE UI HELPERS ---

// Phone Masking - ONLY if phone input exists
const phoneInput = document.getElementById('phone');
if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
        if (x) {
            e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
        }
    });
}

// Password Strength - ONLY if password input exists
const passwordInput = document.getElementById('password');
if (passwordInput) {
    passwordInput.addEventListener('input', (e) => {
        const pass = e.target.value;
        const bar = document.getElementById('password-strength');
        const label = document.getElementById('strength-label');
        
        // Only run if strength elements exist
        if (bar && label) {
            let strength = 0;
            if (pass.length > 7) strength++;
            if (/[A-Z]/.test(pass)) strength++;
            if (/[0-9]/.test(pass)) strength++;
            if (/[^A-Za-z0-9]/.test(pass)) strength++;
            
            const colors = ['#ddd', '#ff4d4d', '#ffa500', '#2ecc71', '#27ae60'];
            const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
            
            bar.style.width = (strength * 25) + '%';
            bar.style.backgroundColor = colors[strength];
            label.innerText = labels[strength];
            label.style.color = colors[strength];
        }
    });
}

// --- FORM SUBMISSION (FIREBASE + BACKEND) ---

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Reset UI
        if (errorBox) errorBox.style.display = 'none';
        if (successBox) successBox.style.display = 'none';
        document.querySelectorAll('input').forEach(i => i.classList.remove('input-error'));

        // Gather Values
        const name = document.getElementById('name')?.value.trim();
        const email = document.getElementById('email')?.value.trim().toLowerCase();
        const password = document.getElementById('password')?.value;
        const phone = document.getElementById('phone')?.value.replace(/\D/g, "");
        const age = parseInt(document.getElementById('age')?.value);
        const parent_name = document.getElementById('parent_name')?.value.trim();
        const ratingRaw = document.getElementById('rating')?.value;
        const rating = ratingRaw ? Number(ratingRaw) : null;

        // Validation
        if (!name || name.length < 2) return showError("Invalid name", document.getElementById('name'));
        if (!email || !email.includes("@")) return showError("Invalid email", document.getElementById('email'));
        if (!password || password.length < 8) return showError("Password too short", document.getElementById('password'));
        if (!phone || phone.length !== 10) return showError("Phone must be 10 digits", document.getElementById('phone'));
        if (isNaN(age) || age < 5 || age > 25) return showError("Age must be between 5 and 25", document.getElementById('age'));
        if (!parent_name) return showError("Parent name required", document.getElementById('parent_name'));

        setLoading(true);

        try {
            // 1. FIREBASE AUTH
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const token = await cred.user.getIdToken();

            // 2. BACKEND API CALL
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

            // 3. SUCCESS UI
            if (successBox) {
                successBox.innerText = "Registration successful! Redirecting to payment...";
                successBox.style.display = "block";
            }
            
            window.scrollTo({ top: 0, behavior: 'smooth' });

            setTimeout(() => {
                window.location.href = "/student/payment";
            }, 2000);

        } catch (err) {
            showError(err.message);
            setLoading(false);
        }
    });
}

function showError(msg, element = null) {
    if (errorBox) {
        errorBox.innerText = msg;
        errorBox.style.display = 'block';
    }
    
    if (element) {
        element.classList.add('input-error');
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setLoading(isLoading) {
    if (btn) btn.disabled = isLoading;
    if (spinner) spinner.style.display = isLoading ? 'block' : 'none';
    if (btnText) btnText.innerText = isLoading ? "Creating Account..." : "Create Account";
}