import { db } from "../Core/firebase.js";
import {
  collection,
  query,
  where,
  getDoc,
  getDocs,
  doc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ============================================
// URL PARAMS
// ============================================
const params = new URLSearchParams(window.location.search);
const uniId = params.get("uniId");
const courseCode = params.get("courseCode");

// ============================================
// DOM REFERENCES
// ============================================
const courseCodeEl = document.getElementById("courseCode");
const courseNameEl = document.getElementById("courseName");

const dayButtons = document.querySelectorAll(".day-btn");
const selectedDayTitle = document.getElementById("selectedDayTitle");
const currentTimeLabel = document.getElementById("currentTimeLabel");
const timelineGrid = document.getElementById("timelineGrid");
const upcomingOnlyToggle = document.getElementById("upcomingOnlyToggle");
const nowIndicator = document.getElementById("nowIndicator");
const emptyState = document.getElementById("emptyState");

// Stats
const statLive = document.getElementById("statLive");
const statOpen = document.getElementById("statOpen");
const statFull = document.getElementById("statFull");
const statTotal = document.getElementById("statTotal");

// Modal
const sessionModal = document.getElementById("sessionModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const closeModalBtn2 = document.getElementById("closeModalBtn2");
const joinSessionBtn = document.getElementById("joinSessionBtn");

const modalTitle = document.getElementById("modalTitle");
const modalTime = document.getElementById("modalTime");
const modalHost = document.getElementById("modalHost");
const modalSeats = document.getElementById("modalSeats");
const modalStatus = document.getElementById("modalStatus");
const modalType = document.getElementById("modalType");
const modalCourse = document.getElementById("modalCourse");

// ============================================
// CONFIGURATION
// ============================================
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const DAY_LABELS = {
  sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed",
  thu: "Thu", fri: "Fri", sat: "Sat"
};

const DAY_FULL = {
  sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday",
  thu: "Thursday", fri: "Friday", sat: "Saturday"
};

// ============================================
// GLOBAL STATE
// ============================================
let courseInfo = null;
let allCourseSessions = [];
let selectedDate = null;
let currentSelectedSession = null;

// ============================================
// ENTRY POINT
// ============================================
document.addEventListener("DOMContentLoaded", bootstrap);

async function bootstrap() {
  if (!uniId || !courseCode) {
    window.location.href = "explore.html";
    return;
  }

  buildTimelineGrid();
  assignDatesToDayButtons();

  await loadCourseData();
  await loadSessions();

  activateTodayButton();
  renderSessionsForSelectedDay();
  updateCurrentTimeLabel();
  positionNowIndicator();
  bindDayButtons();
  bindModal();
  bindUpcomingToggle();

  // Auto-refresh every minute
  setInterval(() => {
    updateCurrentTimeLabel();
    applyUpcomingFilter();
    positionNowIndicator();
  }, 60000);
}

// ============================================
// ROLLING WEEK — DATE CALCULATION
// ============================================
function assignDatesToDayButtons() {
  const today = new Date();
  const todayDayIndex = today.getDay();

  dayButtons.forEach((btn) => {
    const dayKey = btn.dataset.day;
    const targetDayIndex = DAY_KEYS.indexOf(dayKey);

    let diff = targetDayIndex - todayDayIndex;
    if (diff < 0) diff += 7;

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    targetDate.setHours(0, 0, 0, 0);

    // Store as data attribute for easy access
    btn.dataset.date = formatDateISO(targetDate);

    // Add short date under label
    const dateNum = targetDate.getDate();
    const monthShort = targetDate.toLocaleString("en-US", { month: "short" });

    btn.innerHTML = `
      <span class="day-label-main">${DAY_LABELS[dayKey]}</span>
      <small class="day-label-date">${monthShort} ${dateNum}</small>
    `;

    if (diff === 0) {
      btn.classList.add("is-today");
    }
  });
}

function activateTodayButton() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = formatDateISO(today);

  let activated = false;
  dayButtons.forEach((btn) => {
    if (btn.dataset.date === todayISO) {
      btn.classList.add("active");
      selectedDate = new Date(today);
      activated = true;
    }
  });

  if (!activated && dayButtons.length > 0) {
    dayButtons[0].classList.add("active");
    selectedDate = new Date(dayButtons[0].dataset.date);
  }
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ============================================
// TIMELINE BUILDER
// ============================================
function buildTimelineGrid() {
  // Keep now-indicator, remove any hardcoded rows
  const existingRows = timelineGrid.querySelectorAll(".time-row");
  existingRows.forEach((row) => row.remove());

  const fragment = document.createDocumentFragment();

  for (let hour = 8; hour <= 21; hour++) {
    const row = document.createElement("div");
    row.className = "time-row";
    row.dataset.hour = hour;

    const label = document.createElement("div");
    label.className = "time-label";
    label.textContent = formatHourLabel(hour);

    const slot = document.createElement("div");
    slot.className = "time-slot";

    const inner = document.createElement("div");
    inner.className = "slot-inner";
    inner.dataset.hour = hour;

    slot.appendChild(inner);
    row.appendChild(label);
    row.appendChild(slot);

    fragment.appendChild(row);
  }

  // Insert before now-indicator
  timelineGrid.insertBefore(fragment, nowIndicator);
}

function formatHourLabel(hour) {
  const period = hour >= 12 ? "PM" : "AM";
  let displayHour = hour;
  if (hour === 0) displayHour = 12;
  else if (hour > 12) displayHour = hour - 12;
  return `${displayHour}:00 ${period}`;
}

// ============================================
// FIREBASE: LOAD COURSE DATA
// ============================================
async function loadCourseData() {
  try {
    const courseRef = doc(db, "universities", uniId, "courses", courseCode);
    const snap = await getDoc(courseRef);

    if (!snap.exists()) {
      console.warn("Course not found:", courseCode);
      return;
    }

    const data = snap.data();
    courseInfo = {
      courseCode: data.code || courseCode,
      courseName: data.name_en || "Course",
      uniId: uniId
    };

    if (courseCodeEl) courseCodeEl.textContent = courseInfo.courseCode;
    if (courseNameEl) courseNameEl.textContent = courseInfo.courseName;
    document.title = `${courseInfo.courseCode} Sessions | Think-Up`;
  } catch (err) {
    console.error("Error loading course:", err);
  }
}

// ============================================
// FIREBASE: LOAD ALL SESSIONS FOR THIS COURSE
// ============================================
async function loadSessions() {
  try {
    const sessionsRef = collection(db, "sessions");
    const q = query(
      sessionsRef,
      where("courseCode", "==", courseCode),
      where("status", "in", ["upcoming", "live"])
    );

    const snap = await getDocs(q);
    allCourseSessions = [];

    snap.forEach((docItem) => {
      const data = docItem.data();
      if (!data.startTime) return;

      allCourseSessions.push({
        id: docItem.id,
        ...data,
        startDate: data.startTime.toDate(),
        endDate: data.endTime ? data.endTime.toDate() : null
      });
    });

    // Filter out public only in the grid (private sessions don't appear)
    allCourseSessions = allCourseSessions.filter(s => s.visibility === "public");
  } catch (err) {
    console.error("Error loading sessions:", err);
    allCourseSessions = [];
  }
}

// ============================================
// RENDER SESSIONS FOR SELECTED DAY
// ============================================
function renderSessionsForSelectedDay() {
  // Clear all slot-inner contents
  document.querySelectorAll(".slot-inner").forEach((slot) => {
    slot.innerHTML = "";
    slot.classList.remove("multi-session");
  });

  if (!selectedDate) return;

  // Filter sessions for selected date
  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23, 59, 59, 999);

  const daySessions = allCourseSessions
    .filter((s) => s.startDate >= dayStart && s.startDate <= dayEnd)
    .sort((a, b) => a.startDate - b.startDate);

  // Group sessions by hour
  const byHour = {};
  daySessions.forEach((session) => {
    const hour = session.startDate.getHours();
    if (!byHour[hour]) byHour[hour] = [];
    byHour[hour].push(session);
  });

  // Render each hour (8 AM → 9 PM)
  for (let hour = 8; hour <= 21; hour++) {
    const slot = document.querySelector(`.slot-inner[data-hour="${hour}"]`);
    if (!slot) continue;

    const sessions = byHour[hour] || [];

    if (sessions.length === 0) {
      slot.appendChild(buildCreateSessionLink(hour));
    } else {
      if (sessions.length > 1) {
        slot.classList.add("multi-session");
      }

      sessions.forEach((session) => {
        slot.appendChild(buildSessionChip(session));
      });

      if (sessions.length < 3) {
        slot.appendChild(buildCreateSessionLink(hour, true));
      }
    }
  }

  updateSelectedDayTitle();
  updateQuickStats(daySessions);
  applyUpcomingFilter();
  positionNowIndicator();
}

function buildSessionChip(session) {
  const btn = document.createElement("button");

  const chipClass = getChipClass(session);
  btn.className = `session-chip ${chipClass} session-trigger`;
  btn.dataset.sessionId = session.id;

  const topSpan = document.createElement("span");
  topSpan.className = "chip-top";
  topSpan.textContent = session.title || "Untitled Session";

  const metaSpan = document.createElement("span");
  metaSpan.className = "chip-meta";
  metaSpan.textContent = buildChipMeta(session);

  btn.appendChild(topSpan);
  btn.appendChild(metaSpan);

  btn.addEventListener("click", () => openSessionModal(session));

  return btn;
}

function getChipClass(session) {
  if (session.status === "live") return "live";
  if ((session.participantCount || 0) >= (session.maxParticipants || 5)) return "full";
  return "open";
}

function buildChipMeta(session) {
  const statusLabel = getStatusLabel(session);
  const seats = `${session.participantCount || 0}/${session.maxParticipants || 5}`;
  const hostFirstName = (session.hostName || "Host").split(" ")[0];
  return `${statusLabel} • ${seats} • ${hostFirstName}`;
}

function getStatusLabel(session) {
  if (session.status === "live") return "Live";
  if ((session.participantCount || 0) >= (session.maxParticipants || 5)) return "Full";
  return "Open";
}

function buildCreateSessionLink(hour, isCompact = false) {
  const link = document.createElement("a");
  link.className = isCompact ? "empty-slot compact-empty" : "empty-slot";

  const timeStr = String(hour).padStart(2, "0") + ":00";
  const dayKey = getSelectedDayKey();
  const dateISO = formatDateISO(selectedDate);

  const urlParams = new URLSearchParams();
  urlParams.set("uniId", uniId);
  urlParams.set("courseCode", courseCode);
  urlParams.set("time", timeStr);
  urlParams.set("day", dayKey);
  urlParams.set("date", dateISO);

  link.href = `create-session.html?${urlParams.toString()}`;
  link.innerHTML = `
    <span class="empty-plus">＋</span>
    <span>Create Session</span>
  `;
  return link;
}

function getSelectedDayKey() {
  const activeBtn = document.querySelector(".day-btn.active");
  return activeBtn ? activeBtn.dataset.day : "sun";
}

// ============================================
// QUICK STATS
// ============================================
function updateQuickStats(daySessions) {
  let live = 0, open = 0, full = 0;

  daySessions.forEach((session) => {
    if (session.status === "live") {
      live++;
    } else if ((session.participantCount || 0) >= (session.maxParticipants || 5)) {
      full++;
    } else {
      open++;
    }
  });

  statLive.textContent = live;
  statOpen.textContent = open;
  statFull.textContent = full;
  statTotal.textContent = live + open + full;
}

// ============================================
// DAY BUTTONS
// ============================================
function bindDayButtons() {
  dayButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      dayButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      selectedDate = new Date(btn.dataset.date);
      renderSessionsForSelectedDay();
    });
  });
}

function updateSelectedDayTitle() {
  if (!selectedDate) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = selectedDate.getTime() === today.getTime();

  if (isToday) {
    selectedDayTitle.textContent = "Today's Sessions";
  } else {
    const dayName = selectedDate.toLocaleString("en-US", { weekday: "long" });
    const dateStr = selectedDate.toLocaleString("en-US", { month: "short", day: "numeric" });
    selectedDayTitle.textContent = `${dayName}, ${dateStr} Sessions`;
  }
}

// ============================================
// TIME LABEL + UPCOMING FILTER
// ============================================
function updateCurrentTimeLabel() {
  const now = new Date();
  let hour = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  let period = "AM";

  if (hour === 0) hour = 12;
  else if (hour === 12) period = "PM";
  else if (hour > 12) { hour -= 12; period = "PM"; }

  currentTimeLabel.textContent = `Now: ${hour}:${minutes} ${period}`;
}

function bindUpcomingToggle() {
  upcomingOnlyToggle.addEventListener("change", () => {
    applyUpcomingFilter();
    positionNowIndicator();
  });
}

function applyUpcomingFilter() {
  const now = new Date();
  const liveHour = now.getHours();
  const showUpcomingOnly = upcomingOnlyToggle.checked;
  const isToday = currentDayIsSelected();

  document.querySelectorAll(".time-row").forEach((row) => {
    const rowHour = Number(row.dataset.hour);
    row.classList.remove("hidden-row", "past");

    if (isToday && rowHour < liveHour) {
      row.classList.add("past");
      if (showUpcomingOnly) row.classList.add("hidden-row");
    }
  });
}

function currentDayIsSelected() {
  if (!selectedDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate.getTime() === today.getTime();
}

function positionNowIndicator() {
  if (!currentDayIsSelected() || upcomingOnlyToggle.checked) {
    nowIndicator.style.display = "none";
    return;
  }

  const now = new Date();
  const liveHour = now.getHours();
  const liveMinutes = now.getMinutes();

  const currentRow = document.querySelector(`.time-row[data-hour="${liveHour}"]`);

  if (!currentRow) {
    nowIndicator.style.display = "none";
    return;
  }

  const slot = currentRow.querySelector(".time-slot");
  if (!slot) return;

  const gridRect = timelineGrid.getBoundingClientRect();
  const slotRect = slot.getBoundingClientRect();
  const rowRect = currentRow.getBoundingClientRect();

  const progress = liveMinutes / 60;
  const topOffset = (rowRect.top - gridRect.top) + (slotRect.height * progress);

  nowIndicator.style.display = "block";
  nowIndicator.style.top = `${topOffset}px`;
}

// ============================================
// MODAL
// ============================================
function bindModal() {
  closeModalBtn.addEventListener("click", closeModal);
  closeModalBtn2.addEventListener("click", closeModal);

  sessionModal.addEventListener("click", (e) => {
    if (e.target === sessionModal) closeModal();
  });

  joinSessionBtn.addEventListener("click", () => {
    if (currentSelectedSession) {
      // Placeholder for Phase 6 - just go to session room for now
      window.location.href = `session-room.html?id=${currentSelectedSession.id}`;
    }
  });
}

function openSessionModal(session) {
  currentSelectedSession = session;

  modalTitle.textContent = session.title || "Untitled Session";
  modalType.textContent = session.topicNotes || "Study Session";
  modalTime.textContent = formatSessionTimeRange(session);
  modalHost.textContent = session.hostName || "—";
  modalSeats.textContent = `${session.participantCount || 0} / ${session.maxParticipants || 5}`;
  modalStatus.textContent = getStatusLabel(session);
  modalCourse.textContent = `${session.courseCode} — ${session.courseName || ""}`;

  // Badge color based on status
  modalStatus.className = "badge-live";
  if (session.status === "live") {
    modalStatus.textContent = "Live";
  } else if ((session.participantCount || 0) >= (session.maxParticipants || 5)) {
    modalStatus.textContent = "Full";
  } else {
    modalStatus.textContent = "Open";
  }

  sessionModal.classList.remove("hidden");
}

function closeModal() {
  sessionModal.classList.add("hidden");
  currentSelectedSession = null;
}

function formatSessionTimeRange(session) {
  if (!session.startDate || !session.endDate) return "—";
  const startStr = session.startDate.toLocaleString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true
  });
  const endStr = session.endDate.toLocaleString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true
  });
  return `${startStr} - ${endStr}`;
}