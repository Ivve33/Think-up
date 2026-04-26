// ══════════════════════════════════════════════════════════
// Course Sessions — Phase 9.5 (Hybrid redesign)
// Think-Up
// ══════════════════════════════════════════════════════════

import { db } from "../Core/firebase.js";
import {
  collection,
  query,
  where,
  getDoc,
  getDocs,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ══════════════════════════════════════════════════════════
// URL PARAMS
// ══════════════════════════════════════════════════════════
const params = new URLSearchParams(window.location.search);
const uniId = params.get("uniId");
const courseCode = params.get("courseCode");

// ══════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════
const TODAY_HOURS_INITIAL = 12;   // First load: show 12 hours from now
const TODAY_HOURS_EXTRA = 6;      // "Show more" button adds 6 more hours
const TODAY_HOURS_MAX = 24;       // Max 24 hours from now
const FUTURE_DAY_HOUR_START = 0;  // Future days start from 12 AM
const FUTURE_DAY_HOUR_END = 23;   // ... to 11 PM
const MAX_SESSIONS_PER_HOUR = 3;

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ══════════════════════════════════════════════════════════
// DOM REFERENCES
// ══════════════════════════════════════════════════════════
const courseCodeEl = document.getElementById("courseCode");
const courseNameEl = document.getElementById("courseName");

const daySelectorEl = document.getElementById("daySelector");
const selectedDayTitle = document.getElementById("selectedDayTitle");
const timelineSubtitle = document.getElementById("timelineSubtitle");
const currentTimeLabel = document.getElementById("currentTimeLabel");
const timelineGrid = document.getElementById("timelineGrid");
const upcomingOnlyToggle = document.getElementById("upcomingOnlyToggle");
const nowIndicator = document.getElementById("nowIndicator");
const emptyState = document.getElementById("emptyState");

// Quick Start
const quickStartLink = document.getElementById("quickStartLink");

// Live Now section
const liveNowSection = document.getElementById("liveNowSection");
const liveNowCount = document.getElementById("liveNowCount");
const liveCardsList = document.getElementById("liveCardsList");

// Show More
const timelineFooter = document.getElementById("timelineFooter");
const showMoreBtn = document.getElementById("showMoreBtn");

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

// ══════════════════════════════════════════════════════════
// GLOBAL STATE
// ══════════════════════════════════════════════════════════
let courseInfo = null;
let allCourseSessions = [];     // all upcoming/live sessions
let liveSessions = [];          // sessions with status === "live"
let scheduledSessions = [];     // upcoming sessions (not yet started)
let selectedDate = null;        // Date object (midnight) of the selected day
let currentSelectedSession = null;
let todayHoursShowing = TODAY_HOURS_INITIAL; // tracks "Show more" expansion

// ══════════════════════════════════════════════════════════
// ENTRY POINT
// ══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", bootstrap);

async function bootstrap() {
  if (!uniId || !courseCode) {
    window.location.href = "explore.html";
    return;
  }

  buildRollingDaySelector(); // builds 7 buttons (today + 6 days)

  await loadCourseData();
  await loadSessions();

  selectDay(0); // select today by default

  bindQuickStart();
  bindShowMoreButton();
  bindModal();
  bindUpcomingToggle();

  updateCurrentTimeLabel();

  // Auto-refresh every minute (for time label + now-indicator + past-row dimming)
  setInterval(() => {
    updateCurrentTimeLabel();
    if (isSelectedDayToday()) {
      applyUpcomingFilter();
      positionNowIndicator();
    }
  }, 60000);
}

// ══════════════════════════════════════════════════════════
// ROLLING DAY SELECTOR
// Builds 7 buttons: today, today+1, today+2, ... today+6
// ══════════════════════════════════════════════════════════
function buildRollingDaySelector() {
  daySelectorEl.innerHTML = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);

    const isToday = (offset === 0);
    const dayName = isToday ? "Today" : DAY_NAMES_SHORT[date.getDay()];
    const dateLabel = formatDayDateLabel(date, isToday);

    const btn = document.createElement("button");
    btn.className = "day-btn";
    btn.type = "button";
    if (isToday) btn.classList.add("today");
    btn.dataset.offset = String(offset);
    btn.dataset.date = formatDateISO(date);

    btn.innerHTML = `
      <span class="day-name">${dayName}</span>
      <span class="day-date">${dateLabel}</span>
    `;

    btn.addEventListener("click", () => selectDay(offset));

    daySelectorEl.appendChild(btn);
  }
}

/**
 * Format the date below the day name
 *   - For today: "Sun 26"  (full day name + date)
 *   - For others: "27" or "May 1" (date number, with month if changed)
 */
function formatDayDateLabel(date, isToday) {
  const dateNum = date.getDate();

  if (isToday) {
    const shortName = DAY_NAMES_SHORT[date.getDay()];
    return `${shortName} ${dateNum}`;
  }

  // For future days: show month if it's day 1 (month boundary)
  if (dateNum === 1) {
    return `${MONTH_NAMES_SHORT[date.getMonth()]} ${dateNum}`;
  }
  return String(dateNum);
}

function selectDay(offset) {
  // Update active button
  document.querySelectorAll(".day-btn").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.offset) === offset);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  selectedDate = new Date(today);
  selectedDate.setDate(today.getDate() + offset);

  // Reset "Show more" expansion when switching days
  todayHoursShowing = TODAY_HOURS_INITIAL;

  // Rebuild timeline for the new day
  buildTimelineGridForDay(selectedDate);

  // Render
  renderTimelineSlots();
  renderLiveNowSection();
  updateSelectedDayTitle();
  updateTimelineSubtitle();
  updateShowMoreVisibility();

  applyUpcomingFilter();
  positionNowIndicator();
}

// ══════════════════════════════════════════════════════════
// TIMELINE GRID BUILDER (DYNAMIC HOURS)
// ══════════════════════════════════════════════════════════
function buildTimelineGridForDay(date) {
  // Remove old rows (keep now-indicator)
  const existingRows = timelineGrid.querySelectorAll(".time-row");
  existingRows.forEach((row) => row.remove());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = date.getTime() === today.getTime();

  let hours; // array of hours to render

  if (isToday) {
    // Today: from current hour, for the next N hours (rolling)
    const currentHour = new Date().getHours();
    hours = [];
    for (let i = 0; i < todayHoursShowing; i++) {
      hours.push((currentHour + i) % 24);
    }
  } else {
    // Future days: show all 24 hours (or default 0 to 23)
    hours = [];
    for (let h = FUTURE_DAY_HOUR_START; h <= FUTURE_DAY_HOUR_END; h++) {
      hours.push(h);
    }
  }

  const fragment = document.createDocumentFragment();

  hours.forEach((hour, idx) => {
    const row = document.createElement("div");
    row.className = "time-row";
    row.dataset.hour = hour;
    row.dataset.position = idx; // for tracking order within the rolling window

    const label = document.createElement("div");
    label.className = "time-label";
    label.textContent = formatHourLabel(hour);

    const slot = document.createElement("div");
    slot.className = "time-slot";
    slot.dataset.hour = hour;
    slot.dataset.position = idx;

    row.appendChild(label);
    row.appendChild(slot);
    fragment.appendChild(row);
  });

  timelineGrid.insertBefore(fragment, nowIndicator);
}

function formatHourLabel(hour) {
  const period = hour >= 12 ? "PM" : "AM";
  let displayHour = hour;
  if (hour === 0) displayHour = 12;
  else if (hour > 12) displayHour = hour - 12;
  return `${displayHour}:00 ${period}`;
}

// ══════════════════════════════════════════════════════════
// FIREBASE: LOAD COURSE DATA
// ══════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════
// FIREBASE: LOAD ALL SESSIONS FOR THIS COURSE
// ══════════════════════════════════════════════════════════
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

    // Only public sessions appear in the grid
    allCourseSessions = allCourseSessions.filter(s => s.visibility === "public");

    // Split into live vs scheduled (upcoming)
    liveSessions = allCourseSessions.filter(s => s.status === "live");
    scheduledSessions = allCourseSessions.filter(s => s.status === "upcoming");
  } catch (err) {
    console.error("Error loading sessions:", err);
    allCourseSessions = [];
    liveSessions = [];
    scheduledSessions = [];
  }
}

// ══════════════════════════════════════════════════════════
// 🟢 RENDER: LIVE NOW SECTION
// Shows live sessions only when viewing TODAY
// ══════════════════════════════════════════════════════════
function renderLiveNowSection() {
  liveCardsList.innerHTML = "";

  // Only show "Live Now" when viewing today
  if (!isSelectedDayToday() || liveSessions.length === 0) {
    liveNowSection.classList.add("hidden");
    return;
  }

  liveNowSection.classList.remove("hidden");
  liveNowCount.textContent = `${liveSessions.length} session${liveSessions.length === 1 ? "" : "s"}`;

  // Sort: most recently started first
  const sorted = [...liveSessions].sort((a, b) => {
    const aTime = a.startedAt?.toDate?.() || a.startDate;
    const bTime = b.startedAt?.toDate?.() || b.startDate;
    return bTime - aTime;
  });

  sorted.forEach((session) => {
    liveCardsList.appendChild(buildLiveCard(session));
  });
}

function buildLiveCard(session) {
  const card = document.createElement("div");
  card.className = "live-card";

  const hostFirstName = (session.hostName || "Host").split(" ")[0];
  const hostInitial = hostFirstName.charAt(0).toUpperCase();
  const seats = `${session.participantCount || 0} / ${session.maxParticipants || 5}`;
  const startedAgo = formatStartedAgo(session.startedAt?.toDate?.() || session.startDate);
  const isFull = (session.participantCount || 0) >= (session.maxParticipants || 5);

  card.innerHTML = `
    <div class="live-card-info">
      <div class="live-card-title">${escapeHtml(session.title || "Untitled Session")}</div>
      <div class="live-card-meta">
        <span class="live-card-host">
          <span class="live-card-avatar">${escapeHtml(hostInitial)}</span>
          ${escapeHtml(hostFirstName)}
        </span>
        <span class="live-card-time">${escapeHtml(startedAgo)}</span>
      </div>
    </div>
    <div class="live-card-action">
      <span class="live-card-seats">${seats}</span>
      <button class="live-card-join" type="button" ${isFull ? "disabled" : ""}>
        ${isFull ? "Full" : "Join"}
      </button>
    </div>
  `;

  // Click anywhere on the card opens the modal
  card.addEventListener("click", () => openSessionModal(session));

  return card;
}

function formatStartedAgo(date) {
  if (!date) return "Live";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just started";
  if (diffMin < 60) return `Started ${diffMin}m ago`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (mins === 0) return `Started ${hours}h ago`;
  return `Started ${hours}h ${mins}m ago`;
}

// ══════════════════════════════════════════════════════════
// 📅 RENDER: TIMELINE SLOTS
// Renders SCHEDULED sessions only (live sessions go to Live Now)
// ══════════════════════════════════════════════════════════
function renderTimelineSlots() {
  if (!selectedDate) return;

  // Get sessions for the selected day, scheduled only (not live)
  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23, 59, 59, 999);

  const daySessions = scheduledSessions
    .filter((s) => s.startDate >= dayStart && s.startDate <= dayEnd)
    .sort((a, b) => a.startDate - b.startDate);

  // Group sessions by hour
  const byHour = {};
  daySessions.forEach((session) => {
    const hour = session.startDate.getHours();
    if (!byHour[hour]) byHour[hour] = [];
    byHour[hour].push(session);
  });

  // Update stats (use both live + scheduled for "Total Today")
  updateQuickStats(daySessions);

  // Render each visible hour
  document.querySelectorAll(".time-slot").forEach((slot) => {
    const hour = Number(slot.dataset.hour);
    slot.innerHTML = "";

    const sessions = byHour[hour] || [];
    const container = document.createElement("div");
    container.className = "slot-container";

    if (sessions.length === 0) {
      // Fully empty: show invitation
      container.appendChild(buildEmptySlot(hour));
    } else {
      // Render existing sessions
      sessions.slice(0, MAX_SESSIONS_PER_HOUR).forEach((session) => {
        container.appendChild(buildSessionChip(session));
      });

      // Add "+ Add another" button if there's room
      if (sessions.length < MAX_SESSIONS_PER_HOUR) {
        container.appendChild(buildAddAnotherButton(hour));
      } else {
        // Slot is full
        const meta = document.createElement("div");
        meta.className = "slot-meta";
        meta.textContent = `Slot full — ${MAX_SESSIONS_PER_HOUR} sessions max`;
        container.appendChild(meta);
      }
    }

    slot.appendChild(container);
  });
}

function buildSessionChip(session) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.sessionId = session.id;

  const isFull = (session.participantCount || 0) >= (session.maxParticipants || 5);
  btn.className = `session-chip ${isFull ? "full" : "open"}`;

  const seats = `${session.participantCount || 0} / ${session.maxParticipants || 5}`;
  const hostFirstName = (session.hostName || "Host").split(" ")[0];
  const visibilityIcon = session.visibility === "private" ? "🔒" : "🌐";
  const visibilityText = session.visibility === "private" ? "Private" : "Public";

  btn.innerHTML = `
    <div class="chip-info">
      <div class="chip-top">${escapeHtml(session.title || "Untitled Session")}</div>
      <div class="chip-meta">
        <span>👤 ${escapeHtml(hostFirstName)}</span>
        <span>⏱️ ${session.duration || 60} min</span>
        <span>${visibilityIcon} ${visibilityText}</span>
      </div>
    </div>
    <div class="chip-action">
      ${isFull
        ? `<span class="chip-status full">Full</span>`
        : `<span class="chip-seats">${seats}</span>`
      }
    </div>
  `;

  btn.addEventListener("click", () => openSessionModal(session));
  return btn;
}

function buildEmptySlot(hour) {
  const link = document.createElement("a");
  link.className = "empty-slot";
  link.href = buildCreateSessionUrl(hour);
  link.innerHTML = `
    <span class="empty-plus">+</span>
    <span>Be the first at ${formatHourLabel(hour)}</span>
  `;
  return link;
}

function buildAddAnotherButton(hour) {
  const link = document.createElement("a");
  link.className = "add-another";
  link.href = buildCreateSessionUrl(hour);
  link.innerHTML = `<span>+ Add another session at ${formatHourLabel(hour)}</span>`;
  return link;
}

function buildCreateSessionUrl(hour) {
  const timeStr = String(hour).padStart(2, "0") + ":00";
  const dateISO = formatDateISO(selectedDate);

  const urlParams = new URLSearchParams();
  urlParams.set("uniId", uniId);
  urlParams.set("courseCode", courseCode);
  urlParams.set("mode", "schedule");
  urlParams.set("time", timeStr);
  urlParams.set("date", dateISO);

  return `create-session.html?${urlParams.toString()}`;
}

// ══════════════════════════════════════════════════════════
// QUICK STATS
// ══════════════════════════════════════════════════════════
function updateQuickStats(daySessions) {
  let live = 0, open = 0, full = 0;

  // Count live sessions for today
  if (isSelectedDayToday()) {
    live = liveSessions.length;
  }

  // Count scheduled sessions for the selected day
  daySessions.forEach((session) => {
    if ((session.participantCount || 0) >= (session.maxParticipants || 5)) {
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

// ══════════════════════════════════════════════════════════
// QUICK START LINK
// ══════════════════════════════════════════════════════════
function bindQuickStart() {
  if (!quickStartLink) return;

  quickStartLink.href = buildQuickStartUrl();
  // Also bind the inner button (just in case)
  const innerButton = quickStartLink.querySelector(".qs-button");
  if (innerButton) {
    innerButton.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = buildQuickStartUrl();
    });
  }
}

function buildQuickStartUrl() {
  const urlParams = new URLSearchParams();
  urlParams.set("uniId", uniId);
  urlParams.set("courseCode", courseCode);
  urlParams.set("mode", "quickstart");
  return `create-session.html?${urlParams.toString()}`;
}

// ══════════════════════════════════════════════════════════
// SHOW MORE BUTTON (Today only)
// ══════════════════════════════════════════════════════════
function bindShowMoreButton() {
  if (!showMoreBtn) return;

  showMoreBtn.addEventListener("click", () => {
    todayHoursShowing = Math.min(todayHoursShowing + TODAY_HOURS_EXTRA, TODAY_HOURS_MAX);
    buildTimelineGridForDay(selectedDate);
    renderTimelineSlots();
    updateShowMoreVisibility();
    applyUpcomingFilter();
    positionNowIndicator();
  });
}

function updateShowMoreVisibility() {
  if (!timelineFooter || !showMoreBtn) return;

  // Only show "Show more" on today, and only if there's still room to expand
  if (isSelectedDayToday() && todayHoursShowing < TODAY_HOURS_MAX) {
    timelineFooter.classList.remove("hidden");
    const remaining = TODAY_HOURS_MAX - todayHoursShowing;
    const next = Math.min(TODAY_HOURS_EXTRA, remaining);
    showMoreBtn.textContent = `Show ${next} more hour${next === 1 ? "" : "s"} →`;
  } else {
    timelineFooter.classList.add("hidden");
  }
}

// ══════════════════════════════════════════════════════════
// HEADER UPDATES
// ══════════════════════════════════════════════════════════
function updateSelectedDayTitle() {
  if (!selectedDate) return;

  if (isSelectedDayToday()) {
    selectedDayTitle.textContent = "Today's Sessions";
  } else {
    const dayName = DAY_NAMES_FULL[selectedDate.getDay()];
    const dateStr = `${MONTH_NAMES_SHORT[selectedDate.getMonth()]} ${selectedDate.getDate()}`;
    selectedDayTitle.textContent = `${dayName}, ${dateStr}`;
  }
}

function updateTimelineSubtitle() {
  if (!timelineSubtitle) return;

  if (isSelectedDayToday()) {
    timelineSubtitle.textContent = `Showing the next ${todayHoursShowing} hour${todayHoursShowing === 1 ? "" : "s"}. Each hour can host up to ${MAX_SESSIONS_PER_HOUR} sessions.`;
  } else {
    timelineSubtitle.textContent = `All 24 hours available. Each hour can host up to ${MAX_SESSIONS_PER_HOUR} sessions.`;
  }
}

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

// ══════════════════════════════════════════════════════════
// UPCOMING FILTER + PAST DIMMING
// ══════════════════════════════════════════════════════════
function bindUpcomingToggle() {
  upcomingOnlyToggle.addEventListener("change", () => {
    applyUpcomingFilter();
    positionNowIndicator();
  });
}

function applyUpcomingFilter() {
  // The "past" dimming only applies when viewing today, and only
  // when the rendered hour has already passed within the same day.
  // (Note: the timeline rolls from the current hour, so most "past"
  // logic is already handled by the rolling start point.)
  const showUpcomingOnly = upcomingOnlyToggle.checked;
  const isToday = isSelectedDayToday();
  const currentHour = new Date().getHours();

  document.querySelectorAll(".time-row").forEach((row) => {
    row.classList.remove("hidden-row", "past");

    if (!isToday) return;

    const rowHour = Number(row.dataset.hour);
    const position = Number(row.dataset.position);

    // A row is "past" only if its position is 0 AND the actual minute has passed
    // — but since we start the timeline AT the current hour, position 0 is "now",
    // not past. Only mark as past if user has the toggle on and somehow there
    // are rows before now (shouldn't happen in normal flow).
    // For now, we just hide rows when they wrap to the next day
    // and the user toggles "Upcoming only".
    if (showUpcomingOnly && position === 0 && rowHour === currentHour) {
      // This is "now" — keep it visible
      row.classList.remove("hidden-row");
    }
  });
}

function isSelectedDayToday() {
  if (!selectedDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate.getTime() === today.getTime();
}

// ══════════════════════════════════════════════════════════
// NOW INDICATOR
// ══════════════════════════════════════════════════════════
function positionNowIndicator() {
  if (!isSelectedDayToday()) {
    nowIndicator.style.display = "none";
    return;
  }

  const now = new Date();
  const liveHour = now.getHours();
  const liveMinutes = now.getMinutes();

  // Find the row at position 0 (the first one — should be the current hour)
  const currentRow = document.querySelector(`.time-row[data-position="0"]`);

  if (!currentRow) {
    nowIndicator.style.display = "none";
    return;
  }

  // Make sure it's actually the current hour
  if (Number(currentRow.dataset.hour) !== liveHour) {
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

// ══════════════════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════════════════
function bindModal() {
  closeModalBtn.addEventListener("click", closeModal);
  closeModalBtn2.addEventListener("click", closeModal);

  sessionModal.addEventListener("click", (e) => {
    if (e.target === sessionModal) closeModal();
  });

  joinSessionBtn.addEventListener("click", () => {
    if (currentSelectedSession) {
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
  modalCourse.textContent = `${session.courseCode} — ${session.courseName || ""}`;

  // Status badge
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

// ══════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════
function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}