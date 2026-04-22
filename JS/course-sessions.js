import { db } from "../Core/firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const uniId = params.get("uniId");
const collegeId = params.get("collegeId");
const majorId = params.get("majorId");
const courseCode = params.get("courseCode");

const courseCodeEl = document.getElementById("courseCode");
const courseNameEl = document.getElementById("courseName");
const heroTitle = document.getElementById("heroTitle");

const dayButtons = document.querySelectorAll(".day-btn");
const selectedDayTitle = document.getElementById("selectedDayTitle");
const currentTimeLabel = document.getElementById("currentTimeLabel");
const timelineGrid = document.getElementById("timelineGrid");
const upcomingOnlyToggle = document.getElementById("upcomingOnlyToggle");
const timeRows = document.querySelectorAll(".time-row");
const nowIndicator = document.getElementById("nowIndicator");

const sessionModal = document.getElementById("sessionModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const closeModalBtn2 = document.getElementById("closeModalBtn2");
const sessionTriggers = document.querySelectorAll(".session-trigger");

const modalTitle = document.getElementById("modalTitle");
const modalTime = document.getElementById("modalTime");
const modalHost = document.getElementById("modalHost");
const modalSeats = document.getElementById("modalSeats");
const modalStatus = document.getElementById("modalStatus");
const modalType = document.getElementById("modalType");

const orderedDays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const labelMap = {
  sat: "Sat",
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri"
};

const now = new Date();
const currentDayKey = orderedDays[now.getDay()];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  if (!uniId || !courseCode) {
    window.location.href = "explore.html";
    return;
  }

  await loadCourseData();
  fixCreateSessionLinks();
  activateCurrentDay();
  updateSelectedDayTitle();
  updateCurrentTimeLabel();
  markPastHours();
  applyUpcomingFilter();
  positionNowIndicator();
  bindDayButtons();
  bindModal();
}

async function loadCourseData() {
  if (!uniId || !courseCode) return;

  try {
    const coursesRef = collection(db, "universities", uniId, "courses");
    const snap = await getDocs(coursesRef);

    let foundCourse = null;

    snap.forEach((docItem) => {
      const data = docItem.data();

      if (docItem.id === courseCode || data.code === courseCode) {
        foundCourse = data;
      }
    });

    if (!foundCourse) return;

    if (courseCodeEl) courseCodeEl.textContent = foundCourse.code || courseCode;
    if (courseNameEl) courseNameEl.textContent = foundCourse.name_en || "Course";

    if (heroTitle) {
      heroTitle.innerHTML = `Find or create <span>study sessions</span>`;
    }
  } catch (err) {
    console.error("Error loading course:", err);
  }
}

function fixCreateSessionLinks() {
  const createLinks = document.querySelectorAll(".empty-slot");

  createLinks.forEach((link) => {
    const currentHref = link.getAttribute("href") || "";
    const queryStart = currentHref.indexOf("?");
    const existingQuery = queryStart >= 0 ? currentHref.substring(queryStart + 1) : "";

    const newParams = new URLSearchParams(existingQuery);
    newParams.set("uniId", uniId);
    newParams.set("courseCode", courseCode);

    link.setAttribute("href", `create-session.html?${newParams.toString()}`);
  });
}

function activateCurrentDay() {
  dayButtons.forEach((btn) => {
    if (btn.dataset.day === currentDayKey) {
      btn.classList.add("active");
    }
  });

  if (!document.querySelector(".day-btn.active")) {
    const mondayBtn = document.querySelector('.day-btn[data-day="mon"]');
    if (mondayBtn) mondayBtn.classList.add("active");
  }
}

function bindDayButtons() {
  dayButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      dayButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      updateSelectedDayTitle();
      applyUpcomingFilter();
      positionNowIndicator();
    });
  });

  upcomingOnlyToggle.addEventListener("change", () => {
    applyUpcomingFilter();
    positionNowIndicator();
  });
}

function bindModal() {
  sessionTriggers.forEach((btn) => {
    btn.addEventListener("click", () => {
      modalTitle.textContent = btn.dataset.title;
      modalTime.textContent = btn.dataset.time;
      modalHost.textContent = btn.dataset.host;
      modalSeats.textContent = btn.dataset.seats;
      modalStatus.textContent = btn.dataset.status;
      modalType.textContent = btn.dataset.type;

      sessionModal.classList.remove("hidden");
    });
  });

  closeModalBtn.addEventListener("click", closeModal);
  closeModalBtn2.addEventListener("click", closeModal);

  sessionModal.addEventListener("click", (e) => {
    if (e.target === sessionModal) closeModal();
  });
}

function closeModal() {
  sessionModal.classList.add("hidden");
}

function updateSelectedDayTitle() {
  const activeBtn = document.querySelector(".day-btn.active");
  if (!activeBtn) return;

  const activeKey = activeBtn.dataset.day;
  const activeLabel = labelMap[activeKey];

  selectedDayTitle.textContent = activeKey === currentDayKey
    ? "Today's Sessions"
    : `${activeLabel} Sessions`;
}

function updateCurrentTimeLabel() {
  const liveNow = new Date();
  let hour = liveNow.getHours();
  const minutes = String(liveNow.getMinutes()).padStart(2, "0");
  let period = "AM";

  if (hour === 0) hour = 12;
  else if (hour === 12) period = "PM";
  else if (hour > 12) {
    hour -= 12;
    period = "PM";
  }

  currentTimeLabel.textContent = `Now: ${hour}:${minutes} ${period}`;
}

function markPastHours() {
  const liveNow = new Date();
  const liveHour = liveNow.getHours();

  timeRows.forEach((row) => {
    const rowHour = Number(row.dataset.hour);

    if (rowHour < liveHour && currentDayIsSelected()) {
      row.classList.add("past");
    } else {
      row.classList.remove("past");
    }
  });
}

function applyUpcomingFilter() {
  const liveNow = new Date();
  const liveHour = liveNow.getHours();
  const showUpcomingOnly = upcomingOnlyToggle.checked;

  timeRows.forEach((row) => {
    const rowHour = Number(row.dataset.hour);
    row.classList.remove("hidden-row");

    if (showUpcomingOnly && currentDayIsSelected() && rowHour < liveHour) {
      row.classList.add("hidden-row");
    }
  });

  markPastHours();
}

function currentDayIsSelected() {
  const activeBtn = document.querySelector(".day-btn.active");
  return activeBtn && activeBtn.dataset.day === currentDayKey;
}

function positionNowIndicator() {
  if (!currentDayIsSelected() || upcomingOnlyToggle.checked) {
    nowIndicator.style.display = "none";
    return;
  }

  const liveNow = new Date();
  const liveHour = liveNow.getHours();
  const liveMinutes = liveNow.getMinutes();

  const currentRow = document.querySelector(`.time-row[data-hour="${liveHour}"]`);

  if (!currentRow) {
    nowIndicator.style.display = "none";
    return;
  }

  const slot = currentRow.querySelector(".time-slot");
  const gridRect = timelineGrid.getBoundingClientRect();
  const slotRect = slot.getBoundingClientRect();
  const rowRect = currentRow.getBoundingClientRect();

  const progress = liveMinutes / 60;
  const topOffset = (rowRect.top - gridRect.top) + (slotRect.height * progress);

  nowIndicator.style.display = "block";
  nowIndicator.style.top = `${topOffset}px`;
}

setInterval(() => {
  updateCurrentTimeLabel();
  markPastHours();
  applyUpcomingFilter();
  positionNowIndicator();
}, 60000);