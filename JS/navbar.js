import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "../Core/firebase.js";

const pages = new Set([
  "about",
  "auth",
  "contact",
  "course-details",
  "course-sessions",
  "create-session",
  "dashboard",
  "explore",
  "homePage",
  "join-session",
  "major-details",
  "session-history",
  "session-room",
  "session-summary",
  "university-details",
]);

const currentFile = window.location.pathname.split("/").pop() || "homePage.html";
const isArabic = currentFile.endsWith("-ar.html");
const suffix = isArabic ? "-ar" : "";
const labels = isArabic
  ? {
      home: "\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629",
      about: "\u0645\u0646 \u0646\u062d\u0646",
      contact: "\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627",
      auth: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 / \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628",
      profile: "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a",
      logout: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c",
      homeAria: "\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629 \u0644\u0640 Think-Up",
      navAria: "\u0627\u0644\u062a\u0646\u0642\u0644 \u0627\u0644\u0631\u0626\u064a\u0633\u064a",
    }
  : {
      home: "Home",
      about: "About",
      contact: "Contact",
      auth: "Login / Sign Up",
      profile: "Profile",
      logout: "Logout",
      homeAria: "Think-Up home",
      navAria: "Main navigation",
    };

function pageHref(page) {
  return `${page}${suffix}.html`;
}

function currentPageName() {
  return currentFile.replace("-ar.html", "").replace(".html", "");
}

function activeClass(page) {
  return currentPageName() === page ? " active" : "";
}

function createNavbarShell(existingMainNavbar) {
  const header = existingMainNavbar || document.createElement("header");
  const preservedNavPill = existingMainNavbar?.querySelector("#navPill") || document.createElement("span");

  header.className = "site-navbar navbar";
  if (existingMainNavbar?.id) header.id = existingMainNavbar.id;
  if (existingMainNavbar?.hidden) header.hidden = true;

  const container = document.createElement("div");
  container.className = "container nav-wrap";

  const logo = document.createElement("a");
  logo.className = "logo";
  logo.href = pageHref("homePage");
  logo.setAttribute("aria-label", labels.homeAria);
  logo.innerHTML = "Think-<span>Up</span>";

  const nav = document.createElement("nav");
  nav.className = "nav-links";
  nav.setAttribute("aria-label", labels.navAria);
  nav.innerHTML = `
    <a href="${pageHref("homePage")}" class="nav-link${activeClass("homePage")}">${labels.home}</a>
    <a href="${pageHref("about")}" class="nav-link${activeClass("about")}">${labels.about}</a>
    <a href="${pageHref("contact")}" class="nav-link${activeClass("contact")}">${labels.contact}</a>
    <a href="${pageHref("auth")}" class="btn-solid" id="navbarAuthLink">${labels.auth}</a>
    <div class="navbar-profile-menu is-hidden" id="navbarProfileMenu">
      <button class="btn-solid profile-link" id="navbarProfileBtn" type="button" aria-label="${labels.profile}" aria-expanded="false" aria-haspopup="true" title="${labels.profile}">\u{1F464}</button>
      <div class="profile-dropdown is-hidden" id="navbarProfileDropdown" role="menu">
        <a href="${pageHref("dashboard")}" role="menuitem">${isArabic ? "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645" : "Dashboard"}</a>
        <button class="navbar-logout" id="navbarLogoutBtn" type="button" role="menuitem">${labels.logout}</button>
      </div>
    </div>
  `;

  preservedNavPill.id = "navPill";
  preservedNavPill.className = "pill nav-pill";
  if (!preservedNavPill.textContent.trim()) preservedNavPill.textContent = "Session";
  preservedNavPill.hidden = true;

  container.append(logo, nav, preservedNavPill);
  header.replaceChildren(container);

  return header;
}

function oldNavbarElements() {
  return Array.from(document.querySelectorAll("header.navbar, nav.navbar, header.topbar"))
    .filter((element) => !element.classList.contains("site-navbar"));
}

function removeOldNavbars() {
  const mainNavbar = document.getElementById("mainNavbar");
  const elements = oldNavbarElements();

  elements.forEach((element) => {
    if (element === mainNavbar) return;

    const wrapper = element.parentElement;
    if (
      wrapper &&
      wrapper.parentElement === document.body &&
      wrapper.classList.contains("container") &&
      wrapper.classList.contains("nav-wrap")
    ) {
      wrapper.remove();
      return;
    }

    element.remove();
  });
}

function insertNavbar(header) {
  const switcher = document.querySelector("[data-lang-switch='true']");
  if (header.parentElement) return;

  if (switcher?.parentElement === document.body) {
    switcher.insertAdjacentElement("afterend", header);
    return;
  }

  document.body.prepend(header);
}

function updateAuthControls(user) {
  const authLink = document.getElementById("navbarAuthLink");
  const profileMenu = document.getElementById("navbarProfileMenu");
  const profileBtn = document.getElementById("navbarProfileBtn");
  const profileDropdown = document.getElementById("navbarProfileDropdown");
  const logoutBtn = document.getElementById("navbarLogoutBtn");
  if (!authLink || !profileMenu || !profileBtn || !profileDropdown || !logoutBtn) return;

  if (!user) {
    authLink.classList.remove("is-hidden");
    authLink.href = pageHref("auth");
    authLink.textContent = labels.auth;
    authLink.setAttribute("aria-label", labels.auth);

    profileMenu.classList.add("is-hidden");
    profileMenu.setAttribute("aria-hidden", "true");
    profileBtn.tabIndex = -1;
    profileBtn.setAttribute("aria-expanded", "false");
    profileDropdown.classList.add("is-hidden");

    logoutBtn.disabled = false;
    return;
  }

  authLink.classList.add("is-hidden");

  profileMenu.classList.remove("is-hidden");
  profileMenu.removeAttribute("aria-hidden");
  profileBtn.removeAttribute("tabindex");
  profileBtn.setAttribute("aria-label", labels.profile);
  profileBtn.title = labels.profile;
  logoutBtn.disabled = false;
}

function toggleProfileDropdown() {
  if (!auth.currentUser) {
    updateAuthControls(null);
    window.location.href = pageHref("auth");
    return;
  }

  const profileBtn = document.getElementById("navbarProfileBtn");
  const profileDropdown = document.getElementById("navbarProfileDropdown");
  if (!profileBtn || !profileDropdown) return;

  const isOpen = !profileDropdown.classList.contains("is-hidden");
  profileDropdown.classList.toggle("is-hidden", isOpen);
  profileBtn.setAttribute("aria-expanded", String(!isOpen));
}

function closeProfileDropdown(event) {
  const profileMenu = document.getElementById("navbarProfileMenu");
  const profileBtn = document.getElementById("navbarProfileBtn");
  const profileDropdown = document.getElementById("navbarProfileDropdown");
  if (!profileMenu || !profileBtn || !profileDropdown) return;
  if (event && profileMenu.contains(event.target)) return;

  profileDropdown.classList.add("is-hidden");
  profileBtn.setAttribute("aria-expanded", "false");
}

async function handleLogout() {
  const logoutBtn = document.getElementById("navbarLogoutBtn");
  if (logoutBtn) logoutBtn.disabled = true;

  try {
    await signOut(auth);
    updateAuthControls(null);
    closeProfileDropdown();
    window.location.href = pageHref("homePage");
  } catch (error) {
    console.error("Error signing out:", error);
    if (logoutBtn) logoutBtn.disabled = false;
  }
}

function initNavbar() {
  if (!pages.has(currentPageName())) return;

  const mainNavbar = document.getElementById("mainNavbar");
  const header = createNavbarShell(mainNavbar);

  removeOldNavbars();
  insertNavbar(header);
  updateAuthControls(null);

  document.getElementById("navbarProfileBtn")?.addEventListener("click", toggleProfileDropdown);
  document.getElementById("navbarLogoutBtn")?.addEventListener("click", handleLogout);
  document.addEventListener("click", closeProfileDropdown);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeProfileDropdown();
  });

  onAuthStateChanged(auth, updateAuthControls);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNavbar, { once: true });
} else {
  initNavbar();
}
