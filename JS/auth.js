import { auth } from "../Core/firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const signupForm = document.getElementById("signupForm");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");

function getRedirectUrl() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  const isArabic = window.location.pathname.endsWith("-ar.html");
  if (redirect) {
    try {
      const url = new URL(decodeURIComponent(redirect));
      if (url.origin === window.location.origin) {
        return decodeURIComponent(redirect);
      }
    } catch (e) {
      console.warn("Invalid redirect URL, falling back to dashboard");
    }
  }
  return isArabic ? "../HTML/dashboard-ar.html" : "../HTML/dashboard.html";
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = getRedirectUrl();
    } catch (err) {
      alert(prettyAuthError(err));
      console.error(err);
    }
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fName = firstNameInput.value.trim();
    const lName = lastNameInput.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;

    const fullName = `${fName} ${lName}`;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: fullName
      });

      console.log("تم إنشاء الحساب وحفظ الاسم:", fullName);
      window.location.href = getRedirectUrl();

    } catch (err) {
      alert(prettyAuthError(err));
      console.error(err);
    }
  });
}

function prettyAuthError(err) {
  const code = err?.code || "";

  if (code.includes("auth/invalid-email"))
    return "البريد الإلكتروني غير صحيح.";

  if (code.includes("auth/user-not-found"))
    return "لا يوجد حساب بهذا البريد.";

  if (code.includes("auth/wrong-password"))
    return "كلمة المرور غير صحيحة.";

  if (code.includes("auth/email-already-in-use"))
    return "هذا البريد مستخدم مسبقًا.";

  if (code.includes("auth/weak-password"))
    return "كلمة المرور ضعيفة (على الأقل 8 أحرف).";

  if (code.includes("auth/too-many-requests"))
    return "محاولات كثيرة. حاول لاحقًا.";

  return "حدث خطأ غير متوقع: " + code;
}
