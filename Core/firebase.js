// Core/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyDtT_1OOTx6s_BRPteYMFt8ubf1EvQLj_s",
  authDomain: "think-up-2d78d.firebaseapp.com",
  projectId: "think-up-2d78d",
  storageBucket: "think-up-2d78d.firebasestorage.app",
  messagingSenderId: "478598839291",
  appId: "1:478598839291:web:71767aee00aa40ab3de95e",
  measurementId: "G-HWQSKL58GE"
};

const app = initializeApp(firebaseConfig);

// تفعيل الخدمات وتصديرها
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1"); // المنطقة لازم تطابق منطقة الـ deploy