// JS/explore.js
import { db, auth } from "../Core/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const gridElement = document.getElementById("universitiesGrid");
const searchInput = document.getElementById("searchInput");
const backBtn = document.getElementById("dynamicBackBtn");

let allUniversities = [];

// التحكم في زر الرجوع
onAuthStateChanged(auth, (user) => {
  if (user) {
    // طالب → يرجع للداشبورد
    backBtn.textContent = "Back to Dashboard";
    backBtn.href = "dashboard.html";
  } else {
    // زائر → يرجع للهوم
    backBtn.textContent = "Back to Home";
    backBtn.href = "homePage.html";
  }
});

async function initExplorer() {
  try {
    const q = query(
      collection(db, "universities"),
      where("isVisible", "==", true)
    );
    const querySnapshot = await getDocs(q);

    allUniversities = [];
    querySnapshot.forEach((doc) => {
      allUniversities.push({ id: doc.id, ...doc.data() });
    });

    renderCards(allUniversities);

  } catch (error) {
    console.error("Error:", error);
    gridElement.innerHTML = `<p class="error-msg">Connection Error.</p>`;
  }
}

function renderCards(universities) {
  gridElement.innerHTML = "";

  if (universities.length === 0) {
    gridElement.innerHTML = `<p class="empty-msg">No universities found.</p>`;
    return;
  }

  universities.forEach((uni) => {
    const card = `
      <a href="university-details.html?id=${uni.id}" class="uni-card">
        <div class="logo-container">
          <img src="${uni.logo}" alt="${uni.name} logo" class="uni-logo" loading="lazy">
        </div>
        <h3 class="uni-name">${uni.name}</h3>
        <p class="uni-location">📍 ${uni.location}</p>
        <div class="card-action">View Colleges →</div>
      </a>
    `;
    gridElement.insertAdjacentHTML("beforeend", card);
  });
}

searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = allUniversities.filter(
    (uni) =>
      uni.name.toLowerCase().includes(term) ||
      uni.location.toLowerCase().includes(term)
  );
  renderCards(filtered);
});

document.addEventListener("DOMContentLoaded", initExplorer);