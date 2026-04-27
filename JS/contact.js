// JS/contact.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
const db = getFirestore(app);

// Elements
const form = document.getElementById("contactForm");
const successState = document.getElementById("successState");
const sendAnotherBtn = document.getElementById("sendAnotherBtn");
const submitBtn = form.querySelector(".btn-primary");

// ===== Validation =====
function validateForm(data) {
  // Names
  const namePattern = /^[A-Za-zأ-ي\s]+$/;
  if (!data.fname || data.fname.length < 2) return "First name must be at least 2 characters.";
  if (!namePattern.test(data.fname)) return "First name must contain letters only.";
  if (!data.lname || data.lname.length < 2) return "Last name must be at least 2 characters.";
  if (!namePattern.test(data.lname)) return "Last name must contain letters only.";

  // Email
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(data.email)) return "Please enter a valid email address.";

  // Saudi mobile
  const mobilePattern = /^(05|\+9665)[0-9]{8}$/;
  if (!mobilePattern.test(data.mobile)) return "Please enter a valid Saudi mobile number (e.g. 05XXXXXXXX).";

  // Date of birth
  if (!data.dob) return "Please enter your date of birth.";
  const dobDate = new Date(data.dob);
  const today = new Date();
  if (dobDate >= today) return "Date of birth cannot be in the future.";
  const age = (today - dobDate) / (1000 * 60 * 60 * 24 * 365.25);
  if (age < 13) return "You must be at least 13 years old.";
  if (age > 120) return "Please enter a valid date of birth.";

  // Selects
  if (!data.gender) return "Please select your gender.";
  if (!data.language) return "Please select your preferred language.";
  if (!data.subject) return "Please select a topic.";

  // Message
  if (!data.message || data.message.trim().length < 10) return "Message must be at least 10 characters.";
  if (data.message.length > 1000) return "Message is too long (max 1000 characters).";

  return null;
}

// Sanitize input (basic)
function sanitize(str) {
  return str.trim().replace(/<[^>]*>/g, "");
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

  // Validate
  const error = validateForm(data);
  if (error) {
    alert(error);
    return;
  }

  // Disable button while sending
  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";

  try {
    await addDoc(collection(db, "contactMessages"), {
      ...data,
      createdAt: serverTimestamp(),
      status: "new"
    });

    // Show success state
    form.style.display = "none";
    successState.style.display = "flex";
  } catch (err) {
    console.error("Error sending message:", err);
    alert("Something went wrong. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send Message";
  }
});

// ===== Reset Form =====
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