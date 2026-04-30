import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "../Core/firebase.js";

const currentFile = window.location.pathname.split("/").pop();
const isArabic = currentFile.endsWith("-ar.html");
const authPage = isArabic ? "auth-ar.html" : "auth.html";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace(authPage);
  }
});