import { db, auth } from "../Core/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ===== URL PARAMS =====
const params = new URLSearchParams(window.location.search);
const uniId     = params.get("uniId");
const collegeId = params.get("collegeId");
const majorId   = params.get("majorId");

// ===== DOM =====
const levelsContainer  = document.getElementById("levelsContainer");
const electivesSection = document.getElementById("electivesSection");
const electivesGrid    = document.getElementById("electivesGrid");
const quickJump        = document.getElementById("quickJump");
const searchInput      = document.getElementById("searchInput");
const backBtn          = document.getElementById("backBtn");
const majorBadge       = document.getElementById("majorBadge");
const heroTitle        = document.getElementById("heroTitle");

// ===== BACK BUTTON =====
onAuthStateChanged(auth, (user) => {
  if (user) {
    backBtn.href = `major-details.html?uniId=${uniId}&collegeId=${collegeId}`;
  } else {
    backBtn.href = "../Home/homePage.html";
  }
});

// ===== TYPE HELPERS =====
const typeLabel = {
  university_required: "University",
  college_required:    "College",
  major_required:      "Major",
  major_elective:      "Elective",
  free_elective:       "Free",
};

const typeClass = {
  university_required: "type-university",
  college_required:    "type-college",
  major_required:      "type-major",
  major_elective:      "type-elective",
  free_elective:       "type-free",
};

// ===== RENDER COURSE CARD =====
function renderCourseCard(item, courseData) {

  // Slot card (elective/free placeholder)
  if (item.isSlot) {
    const label = item.type === "major_elective" ? "⚡ Elective Slot" : "📖 Free Elective Slot";
    return `
      <div class="course-card slot-card">
        <div class="slot-label">${label}</div>
        <div class="course-credits" style="justify-content:center; margin-top:8px;">
          <span>${item.credits}</span> Credit Hours
        </div>
      </div>`;
  }

  const code    = courseData?.code    || item.courseCode;
  const nameAr  = courseData?.name_en || item.courseCode;
  const nameEn  = courseData?.name_ar || "";
  const credits = courseData?.credits ?? "-";
  const prereqs = item.prerequisites?.length ? item.prerequisites.join(", ") : "-";
  const type    = item.type || "major_required";

  return `
    <div class="course-card">
      <div class="course-card-top">
        <div class="course-code">${code}</div>
        <div class="course-type-badge ${typeClass[type] || 'type-major'}">
          ${typeLabel[type] || type}
        </div>
      </div>
      <div class="course-name-ar">${nameAr}</div>
      <div class="course-name-en">${nameEn}</div>
      <div class="course-card-bottom">
        <div class="course-credits">⏱ <span>${credits}</span> Credit Hours</div>
        <div class="course-prereq">
          ${prereqs !== "-" ? `<strong>Pre:</strong> ${prereqs}` : ""}
        </div>
      </div>
    </div>`;
}

// ===== MAIN FETCH & RENDER =====
async function init() {
  if (!uniId || !collegeId || !majorId) {
    levelsContainer.innerHTML = `<p style="text-align:center;color:red;">Missing URL parameters.</p>`;
    return;
  }

  try {
    // 1. جيب بيانات التخصص (curriculum)
    const majorRef  = doc(db, "universities", uniId, "colleges", collegeId, "majors", majorId);
    const majorSnap = await getDoc(majorRef);

    if (!majorSnap.exists()) {
      levelsContainer.innerHTML = `<p style="text-align:center;color:red;">Major not found.</p>`;
      return;
    }

    const majorData  = majorSnap.data();
    const curriculum = majorData.curriculum || [];

    // اسم التخصص في الهيرو
    majorBadge.textContent = majorData.name_en || majorId;
    heroTitle.textContent  = majorData.name_en  || "Courses";
    document.title = `Think-Up | ${majorData.name_en || majorId}`;

    // 2. جيب كل المواد من الكتالوج مرة وحدة
    const coursesSnap = await getDocs(collection(db, "universities", uniId, "courses"));
    const coursesMap  = {};
    coursesSnap.forEach(d => { coursesMap[d.id] = d.data(); });

    // 3. قسّم الـ curriculum
    const levelMap   = {};  // level => [items]
    const electivePool = []; // level === null
    let   summerItem  = null;

    curriculum.forEach(item => {
      if (item.level === null) {
        electivePool.push(item);
      } else if (item.level === 0) {
        summerItem = item;
      } else {
        if (!levelMap[item.level]) levelMap[item.level] = [];
        levelMap[item.level].push(item);
      }
    });

    const sortedLevels = Object.keys(levelMap).map(Number).sort((a,b) => a - b);

    // 4. بنِ الـ Quick Jump
    sortedLevels.forEach(lvl => {
      const btn = document.createElement("a");
      btn.className  = "jump-btn";
      btn.textContent = `Lvl ${lvl}`;
      btn.href = `#level-${lvl}`;
      quickJump.appendChild(btn);
    });

    if (summerItem) {
      const btn = document.createElement("a");
      btn.className  = "jump-btn";
      btn.textContent = "Summer";
      btn.href = "#summer";
      quickJump.appendChild(btn);
    }

    if (electivePool.length) {
      const btn = document.createElement("a");
      btn.className  = "jump-btn";
      btn.textContent = "Electives";
      btn.href = "#electives";
      quickJump.appendChild(btn);
    }

    // 5. ارسم الـ levels
    levelsContainer.innerHTML = "";

    sortedLevels.forEach(lvl => {
      const items     = levelMap[lvl];
      const totalHrs  = items.reduce((sum, i) => {
        if (i.isSlot) return sum + (i.credits || 0);
        return sum + (coursesMap[i.courseCode]?.credits || 0);
      }, 0);

      const section = document.createElement("section");
      section.className = "level-section";
      section.id = `level-${lvl}`;

      section.innerHTML = `
        <div class="level-header">
          <div class="level-number">${lvl}</div>
          <div>
            <div class="level-title">Level ${lvl}</div>
            <div class="level-meta">${items.length} courses · ${totalHrs} credit hours</div>
          </div>
          <div class="level-divider"></div>
        </div>
        <div class="courses-grid">
          ${items.map(item => renderCourseCard(item, coursesMap[item.courseCode])).join("")}
        </div>`;

      levelsContainer.appendChild(section);
    });

    // 6. Summer Training
    if (summerItem) {
      const summerData = coursesMap[summerItem.courseCode];
      const div = document.createElement("div");
      div.id = "summer";
      div.innerHTML = `
        <div class="summer-section">
          <div class="summer-icon">☀️</div>
          <div>
            <div class="summer-title">${summerData?.name_en || "Summer Training"}</div>
            <div class="summer-meta">${summerData?.name_ar || "التدريب الصيفي"} · ${summerItem.note || "80 hours required"}</div>
          </div>
        </div>`;
      levelsContainer.appendChild(div);
    }

    // 7. Electives Pool
    if (electivePool.length) {
      electivesSection.id = "electives";
      electivesSection.style.display = "block";
      electivesGrid.innerHTML = electivePool
        .map(item => renderCourseCard(item, coursesMap[item.courseCode]))
        .join("");
    }

  } catch (err) {
    console.error("Error:", err);
    levelsContainer.innerHTML = `<p style="text-align:center;color:red;">Connection Error.</p>`;
  }
}

// ===== SEARCH =====
searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase().trim();
  document.querySelectorAll(".course-card:not(.slot-card)").forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(term) ? "" : "none";
  });
});

// ===== INIT =====
document.addEventListener("DOMContentLoaded", init);