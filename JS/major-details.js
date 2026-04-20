// JS/major-details.js

import { db, auth } from "../Core/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ── URL Params ──
const params = new URLSearchParams(window.location.search);
const uniId = params.get("uniId");
const collegeId = params.get("collegeId");

// ── DOM Elements ──
const backBtn = document.getElementById("backBtn");
const collegeNameEl = document.getElementById("collegeName");
const uniNameSubEl = document.getElementById("uniNameSub");
const collegeIconEl = document.getElementById("collegeIcon");
const majorsGrid = document.getElementById("majorsGrid");
const searchInput = document.getElementById("searchMajorsInput");

// ── Back Button ──
onAuthStateChanged(auth, (user) => {
  backBtn.href = `university-details.html?id=${uniId}`;
});

// ── صور التخصصات من Media ──
const majorImages = {
  "computer-science":        "../Media/computer-science.jpg",
  "software-engineering":    "../Media/software-engineering.jpg",
  "computer-engineering":    "../Media/computer-engineering.jpg",
  "data-science":            "../Media/data-science.jpg",
  "cybersecurity":           "../Media/cybersecurity.jpg",
  "artificial-intelligence": "../Media/artificial-intelligence.jpg"
};

// ── بيانات ثابتة للتخصصات ──
const majorMeta = {
  "computer-science":        { code: "CS", hours: "149" },
  "software-engineering":    { code: "SE", hours: "152" },
  "computer-engineering":    { code: "CE", hours: "150" },
  "data-science":            { code: "DS", hours: "148" },
  "cybersecurity":           { code: "CY", hours: "147" },
  "artificial-intelligence": { code: "AI", hours: "149" }
};

let allMajors = [];

// ── Init ──
async function initPage() {
  if (!uniId || !collegeId) {
    window.location.href = "explore.html";
    return;
  }

  try {
    // 1. جلب اسم الجامعة
    const uniSnap = await getDoc(doc(db, "universities", uniId));
    if (uniSnap.exists()) {
      uniNameSubEl.textContent = uniSnap.data().name;
    }

    // 2. جلب بيانات الكلية
    const collegeSnap = await getDoc(
      doc(db, "universities", uniId, "colleges", collegeId)
    );
    if (collegeSnap.exists()) {
      const data = collegeSnap.data();
      collegeNameEl.textContent = data.name || collegeId;

      // أيقونة الكلية
      const icon = data.icon || "🎓";
      if (icon.startsWith("http")) {
        collegeIconEl.innerHTML = `<img src="${icon}" alt="${data.name} logo">`;
      } else {
        collegeIconEl.textContent = icon;
      }
    }

    // 3. جلب التخصصات
    await fetchMajors();

  } catch (err) {
    console.error("Error:", err);
    majorsGrid.innerHTML = `<p class="error-msg">Error loading data.</p>`;
  }
}

// ── Fetch Majors ──
async function fetchMajors() {
  try {
    const snap = await getDocs(
      collection(db, "universities", uniId, "colleges", collegeId, "majors")
    );

    majorsGrid.innerHTML = "";
    allMajors = [];

    if (snap.empty) {
      majorsGrid.innerHTML = `<div class="empty-msg"><p>No majors found.</p></div>`;
      return;
    }

    snap.forEach((d) => allMajors.push({ id: d.id, ...d.data() }));

    // ترتيب التخصصات (SE يطلع أول)
    allMajors.sort((a, b) => (a.order || 0) - (b.order || 0));
    renderMajors(allMajors);

  } catch (err) {
    console.error("Fetch majors error:", err);
    majorsGrid.innerHTML = `<p class="error-msg">Error loading majors.</p>`;
  }
}

// ── Render Majors ──
function renderMajors(majors) {
  majorsGrid.innerHTML = "";

  if (!majors.length) {
    majorsGrid.innerHTML = `<div class="empty-msg"><p>No matches found.</p></div>`;
    return;
  }

  majors.forEach((major, i) => {
    const meta = majorMeta[major.id] || { code: "–", hours: "–" };
    const code = major.code || meta.code;
    const hours = major.totalCreditHours || meta.hours;
    const imgSrc = majorImages[major.id] || "";
    const nameAr = major.name_ar || "";

    const card = document.createElement("div");
    card.className = "major-card";
    card.style.animationDelay = `${i * 0.07}s`;

    card.innerHTML = `
      <div class="major-img-box">
        <img src="${imgSrc}" alt="${major.name}" class="major-img">
      </div>
      <div class="major-code">${code}</div>
      <div class="major-info">
        <h3>${major.name || major.id}</h3>
        ${nameAr ? `<p>${nameAr}</p>` : ""}
      </div>
      <div class="major-hours">⏱ ${hours} Credit Hours</div>
      <div class="action-pill">View Courses →</div>
    `;

    card.addEventListener("click", () => {
      window.location.href =
        `course-details.html?uniId=${uniId}&collegeId=${collegeId}&majorId=${major.id}`;
    });

    majorsGrid.appendChild(card);
  });
}

// ── Search ──
searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = allMajors.filter((m) =>
    (m.name || "").toLowerCase().includes(term) ||
    (m.name_ar || "").toLowerCase().includes(term) ||
    (m.code || "").toLowerCase().includes(term)
  );
  renderMajors(filtered);
});

// ── Start ──
document.addEventListener("DOMContentLoaded", initPage);