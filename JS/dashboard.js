// JS/dashboard.js
import { auth } from "../Core/firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const userNameElement = document.getElementById("userName");
const userLabelElement = document.getElementById("userLabel");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is signed in:", user.email);

    let displayName = user.displayName;
    if (!displayName) {
      displayName = user.email.split("@")[0];
    }

    if (userNameElement) userNameElement.textContent = displayName;
    if (userLabelElement) userLabelElement.textContent = displayName;

  } else {
    window.location.href = "../HTML/auth.html";
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      window.location.href = "../HTML/homePage.html";
    } catch (error) {
      console.error("Error signing out:", error);
      alert("حدث خطأ أثناء تسجيل الخروج");
    }
  });
}