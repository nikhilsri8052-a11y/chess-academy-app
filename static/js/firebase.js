import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// (Optional) Analytics — safe to remove if not needed
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAXuS_IRyEAPhsg4-qCk6mkFrsDdBB63Mo",
  authDomain: "sschessclass.firebaseapp.com",
  projectId: "sschessclass",
  storageBucket: "sschessclass.firebasestorage.app",
  messagingSenderId: "985923998522",
  appId: "1:985923998522:web:d768628884cc3dd1d0f603",
  measurementId: "G-FDZLXV3HDN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// Optional
export const analytics = getAnalytics(app);
