// JS/contact.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";

// Firebase config
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
const functions = getFunctions(app, "us-central1");
const submitContactMessage = httpsCallable(functions, "submitContactMessage");

// Elements
const form = document.getElementById("contactForm");
const successState = document.getElementById("successState");
const sendAnotherBtn = document.getElementById("sendAnotherBtn");
const submitBtn = form.querySelector(".btn-primary");

// ===== Frontend Validation =====
function validateForm(data) {
  const namePattern = /^[A-Za-z\u0600-\u06FF\s]+$/;
  if (!data.fname || data.fname.length < 2) return "First name must be at least 2 characters.";
  if (!namePattern.test(data.fname)) return "First name must contain letters only.";
  if (!data.lname || data.lname.length < 2) return "Last name must be at least 2 characters.";
  if (!namePattern.test(data.lname)) return "Last name must contain letters only.";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(data.email)) return "Please enter a valid email address.";

  const mobilePattern = /^(05|\+9665)[0-9]{8}$/;
  if (!mobilePattern.test(data.mobile)) return "Please enter a valid Saudi mobile number (e.g. 05XXXXXXXX).";

  if (!data.dob) return "Please enter your date of birth.";
  const dobDate = new Date(data.dob);
  const today = new Date();
  if (dobDate >= today) return "Date of birth cannot be in the future.";
  const age = (today - dobDate) / (1000 * 60 * 60 * 24 * 365.25);
  if (age < 13) return "You must be at least 13 years old.";
  if (age > 120) return "Please enter a valid date of birth.";

  if (!data.gender) return "Please select your gender.";
  if (!data.language) return "Please select your preferred language.";
  if (!data.subject) return "Please select a topic.";

  if (!data.message || data.message.trim().length < 10) return "Message must be at least 10 characters.";
  if (data.message.length > 1000) return "Message is too long (max 1000 characters).";

  return null;
}

function sanitize(str) {
  return str.trim().replace(/<[^>]*>/g, "");
}

function showMessage(text, isError = false) {
  alert(text); // تقدر تستبدلها بـ toast notification أحلى لو تبي
}

// ===== Handle Submit =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    fname: sanitize(document.getElementById("fname").value),
    lname: sanitize(document.getElementById("lname").value),
    email: sanitize(document.getElementById("email").value),
    mobile: sanitize(document.getElementById("mobile").value),
    dob: document.getElementById("dob").value,
    gender: document.querySelector('input[name="gender"]:checked')?.value || "",
    language: document.getElementById("language").value,
    subject: document.getElementById("subject").value,
    message: sanitize(document.getElementById("message").value),
  };

  // 1. Frontend validation
  const error = validateForm(data);
  if (error) {
    showMessage(error, true);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";

  try {
    // 2. Call backend (Cloud Function will validate AGAIN on the server)
    const result = await submitContactMessage(data);

    if (result.data?.success) {
      form.style.display = "none";
      successState.style.display = "flex";
    } else {
      showMessage("Something went wrong. Please try again.", true);
    }
  } catch (err) {
    console.error("Error sending message:", err);
    // Cloud Function rejection messages come through err.message
    const serverMessage = err.message || "Something went wrong. Please try again.";
    showMessage(serverMessage, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send Message";
  }
});

sendAnotherBtn.addEventListener("click", () => {
  form.reset();
  form.style.display = "block";
  successState.style.display = "none";
});

// ===== FAQ Toggle =====
document.querySelectorAll(".faq-q").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.parentElement;
    const isOpen = item.classList.contains("open");
    document.querySelectorAll(".faq-item").forEach((i) => i.classList.remove("open"));
    if (!isOpen) item.classList.add("open");
  });
});