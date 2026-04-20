// JS/auth-ui.js
// Handles the UI interactions on the auth page:
// - Switching between Login and Sign Up tabs
// - Toggling password visibility

/* =======================
   TAB SWITCHING
======================= */
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const toLoginLink = document.getElementById("toLoginLink");
const toSignupLink = document.getElementById("toSignupLink");
const goSignupInline = document.getElementById("goSignupInline");
const goLoginInline = document.getElementById("goLoginInline");

function showLogin() {
  loginTab.classList.add("is-active");
  signupTab.classList.remove("is-active");
  loginTab.setAttribute("aria-selected", "true");
  signupTab.setAttribute("aria-selected", "false");

  loginForm.classList.add("is-visible");
  signupForm.classList.remove("is-visible");
}

function showSignup() {
  signupTab.classList.add("is-active");
  loginTab.classList.remove("is-active");
  signupTab.setAttribute("aria-selected", "true");
  loginTab.setAttribute("aria-selected", "false");

  signupForm.classList.add("is-visible");
  loginForm.classList.remove("is-visible");
}

loginTab.addEventListener("click", showLogin);
signupTab.addEventListener("click", showSignup);

toLoginLink.addEventListener("click", (e) => {
  e.preventDefault();
  showLogin();
});

toSignupLink.addEventListener("click", (e) => {
  e.preventDefault();
  showSignup();
});

goSignupInline.addEventListener("click", (e) => {
  e.preventDefault();
  showSignup();
});

goLoginInline.addEventListener("click", (e) => {
  e.preventDefault();
  showLogin();
});

/* =======================
   PASSWORD VISIBILITY TOGGLE
======================= */
function togglePw(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);

  btn.addEventListener("click", () => {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    btn.textContent = isPassword ? "Hide" : "Show";
    btn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
  });
}

togglePw("loginPassword", "toggleLoginPw");
togglePw("signupPassword", "toggleSignupPw");