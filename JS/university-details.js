// JS/university-details.js
import { db, auth } from "../Core/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// العناصر
const uniNameEl = document.getElementById("uniName");
const uniLocationEl = document.getElementById("uniLocation");
const uniLogoEl = document.getElementById("uniLogo");
const collegesGrid = document.getElementById("collegesGrid");
const backBtn = document.getElementById("dynamicBackBtn");
const searchInput = document.getElementById("searchCollegesInput");

// عناصر التابات
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// جلب الـ ID من الرابط
const urlParams = new URLSearchParams(window.location.search);
const uniId = urlParams.get("id");

// مصفوفة لتخزين الكليات (عشان البحث)
let allColleges = [];

// 1. منطق زر الرجوع
onAuthStateChanged(auth, (user) => {
  if (user) {
    // طالب → يرجع لصفحة الاستكشاف
    backBtn.textContent = "← Back to Explore";
    backBtn.href = "explore.html";
  } else {
    // زائر → يرجع للهوم
    backBtn.textContent = "← Back to Home";
    backBtn.href = "homePage.html";
  }
});

// 2. منطق التبديل بين التابات
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    const targetId = btn.getAttribute("data-target");
    document.getElementById(targetId).classList.add("active");
  });
});

// 3. الدالة الرئيسية لجلب البيانات
async function initPage() {
  if (!uniId) {
    alert("No university selected!");
    window.location.href = "explore.html";
    return;
  }

  try {
    const docRef = doc(db, "universities", uniId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      uniNameEl.textContent = data.name;
      uniLocationEl.textContent = `📍 ${data.location}`;
      uniLogoEl.src = data.logo;
      uniLogoEl.alt = `${data.name} logo`;

      fetchColleges(uniId);
    } else {
      uniNameEl.textContent = "University Not Found";
      collegesGrid.innerHTML = `<p class="empty-msg">Invalid University ID</p>`;
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

// 4. دالة جلب الكليات
async function fetchColleges(id) {
  try {
    const colRef = collection(db, "universities", id, "colleges");
    const snapshot = await getDocs(colRef);

    collegesGrid.innerHTML = "";
    allColleges = [];

    if (snapshot.empty) {
      collegesGrid.innerHTML = `<div class="empty-msg"><p>No colleges added yet.</p></div>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      allColleges.push({ id: docSnap.id, ...docSnap.data() });
    });

    renderColleges(allColleges);

  } catch (error) {
    console.error("Error fetching colleges:", error);
    collegesGrid.innerHTML = `<p class="error-msg">Error loading colleges.</p>`;
  }
}

// 5. دالة رسم الكروت
function renderColleges(colleges) {
  collegesGrid.innerHTML = "";

  if (colleges.length === 0) {
    collegesGrid.innerHTML = `<p class="empty-msg">No matches found.</p>`;
    return;
  }

  colleges.forEach((college) => {
    // هل هي صورة أم إيموجي؟
    const iconValue = college.icon || "🎓";
    let iconContent;

    if (iconValue.startsWith("http")) {
      iconContent = `<img src="${iconValue}" alt="${college.name}" class="college-img">`;
    } else {
      iconContent = `<span class="college-emoji">${iconValue}</span>`;
    }

    // رابط مجلد Explore القديم مؤقتاً (لين ننقل major-details)
const majorUrl = `major-details.html?uniId=${uniId}&collegeId=${college.id}`;
    const card = `
      <div class="college-card" onclick="window.location.href='${majorUrl}'">
        <div class="college-icon-box">
          ${iconContent}
        </div>
        <div class="college-info">
          <h3>${college.name}</h3>
        </div>
        <div class="action-pill">View Courses →</div>
      </div>
    `;
    collegesGrid.insertAdjacentHTML("beforeend", card);
  });
}

// 6. البحث الفوري للكليات
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allColleges.filter((col) =>
      col.name.toLowerCase().includes(term)
    );
    renderColleges(filtered);
  });
}

// تشغيل الصفحة
document.addEventListener("DOMContentLoaded", initPage);