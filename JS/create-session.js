// ══════════════════════════════════════════════════════════
// Create Session — Phase 9.5 (Hybrid redesign)
// Think-Up
// ══════════════════════════════════════════════════════════

import { auth, db } from "../Core/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  query,
  where,
  Timestamp,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ══════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════
const FIXED_DURATION_MIN = 60;        // all sessions are 60 minutes
const QUICKSTART_LEAD_MIN = 5;        // quick start sessions begin in 5 minutes
const MIN_PARTICIPANTS = 2;
const MAX_PARTICIPANTS = 6;
const DEFAULT_PARTICIPANTS = 5;       // the "sweet spot"

// ══════════════════════════════════════════════════════════
// DOM REFERENCES
// ══════════════════════════════════════════════════════════
const createSessionForm = document.getElementById("createSessionForm");

// Title + topic
const sessionTitleInput = document.getElementById("sessionTitle");
const topicNotesInput = document.getElementById("topicNotes");

// Date + time
const dateTimeRow = document.getElementById("dateTimeRow");
const sessionDateInput = document.getElementById("sessionDate");
const startTimeInput = document.getElementById("startTime");

// Quick start banner
const quickStartBanner = document.getElementById("quickStartBanner");
const qsbTimeEl = document.getElementById("qsbTime");

// Live time box
const timeLiveBox = document.getElementById("timeLiveBox");
const tlbValueEl = document.getElementById("tlbValue");
const tlbHintEl = document.getElementById("tlbHint");

// Participants slider
const maxParticipantsInput = document.getElementById("maxParticipants");
const participantsValueEl = document.getElementById("participantsValue");
const participantsHintEl = document.getElementById("participantsHint");

// Visibility
const visibilityInput = document.getElementById("visibility");
const visibilityButtons = document.querySelectorAll(".visibility-btn");

// Submit + status
const errorBox = document.getElementById("errorBox");
const statusPill = document.getElementById("statusPill");
const createBtn = document.getElementById("createBtn");
const createBtnText = document.getElementById("createBtnText");

// Hero
const heroCourseCodeEl = document.getElementById("heroCourseCode");
const heroCourseNameEl = document.getElementById("heroCourseName");
const heroBadgeEl = document.getElementById("heroBadge");
const heroTitleEl = document.getElementById("heroTitle");
const heroSubtitleEl = document.getElementById("heroSubtitle");
const modeIndicator = document.getElementById("modeIndicator");
const formHeading = document.getElementById("formHeading");
const formSubheading = document.getElementById("formSubheading");

// Preview
const previewTitle = document.getElementById("previewTitle");
const previewSubtitle = document.getElementById("previewSubtitle");
const previewVisibility = document.getElementById("previewVisibility");
const previewDate = document.getElementById("previewDate");
const previewTime = document.getElementById("previewTime");
const previewDuration = document.getElementById("previewDuration");
const previewParticipants = document.getElementById("previewParticipants");
const previewVisibilityValue = document.getElementById("previewVisibilityValue");

// Invite modal
const inviteModal = document.getElementById("inviteModal");
const closeInviteModalBtn = document.getElementById("closeInviteModalBtn");
const copyInviteBtn = document.getElementById("copyInviteBtn");
const inviteLinkBox = document.getElementById("inviteLinkBox");
const goToLobbyBtn = document.getElementById("goToLobbyBtn");
const inviteModalTitle = document.getElementById("inviteModalTitle");
const inviteModalSub = document.getElementById("inviteModalSub");
const inviteModalBadge = document.getElementById("inviteModalBadge");

// ══════════════════════════════════════════════════════════
// GLOBAL STATE
// ══════════════════════════════════════════════════════════
let currentUser = null;
let courseInfo = null;
let userExistingSessions = [];
let createdSessionId = null;
let createdInviteCode = null;
let createdVisibility = "public";

// Mode: "quickstart" | "schedule"
let mode = "schedule";

// For quickstart mode: the auto-computed start time
let quickStartTime = null; // Date object

// ══════════════════════════════════════════════════════════
// ENTRY POINT
// ══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", bootstrap);

async function bootstrap() {
  if (!createSessionForm) return;

  const params = new URLSearchParams(window.location.search);
  const uniId = params.get("uniId");
  const courseCode = params.get("courseCode");

  if (!uniId || !courseCode) {
    window.location.href = "explore.html";
    return;
  }

  // Determine mode from URL
  mode = params.get("mode") === "quickstart" ? "quickstart" : "schedule";

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "auth.html";
      return;
    }

    currentUser = user;

    await loadCourseInfo(uniId, courseCode);
    if (!courseInfo) {
      showError("Course not found. Please go back and try again.");
      return;
    }

    await loadUserExistingSessions();

    init();
  });
}

function init() {
  if (mode === "quickstart") {
    setupQuickStartMode();
  } else {
    setupScheduleMode();
  }

  updateParticipantsUI();
  updatePreview();
  bindEvents();

  // For quickstart mode, refresh the time display every 30s
  // (in case the user leaves the page open)
  if (mode === "quickstart") {
    setInterval(() => {
      if (mode === "quickstart") {
        recomputeQuickStartTime();
        updatePreview();
      }
    }, 30000);
  }
}

// ══════════════════════════════════════════════════════════
// MODE SETUP
// ══════════════════════════════════════════════════════════
function setupQuickStartMode() {
  // Compute start time = now + 5 minutes
  recomputeQuickStartTime();

  // Show banner, hide date/time row, show live time box
  quickStartBanner.classList.remove("hidden");
  dateTimeRow.classList.add("hidden");
  timeLiveBox.classList.remove("hidden");

  // Update banner text
  qsbTimeEl.textContent = formatTimeShort(quickStartTime);

  // Update hero copy
  if (heroBadgeEl) heroBadgeEl.textContent = "Quick Start Mode";
  if (heroTitleEl) heroTitleEl.innerHTML = 'Start a <span>study session now</span>';
  if (heroSubtitleEl) heroSubtitleEl.textContent =
    "Your session begins in 5 minutes. Just give it a title — invite friends with the link.";
  if (modeIndicator) modeIndicator.textContent = "⚡ Quick Start";
  if (formHeading) formHeading.textContent = "Quick Session";
  if (formSubheading) formSubheading.textContent =
    "Just a title, and you're ready to start.";

  // Update create button text
  if (createBtnText) createBtnText.textContent = "Start Session →";

  // Pre-set date/time hidden values for form submission
  sessionDateInput.value = formatDateInput(quickStartTime);
  startTimeInput.value = formatTimeInput(quickStartTime);
}

function setupScheduleMode() {
  // Show date/time row, hide quickstart banner
  quickStartBanner.classList.add("hidden");
  dateTimeRow.classList.remove("hidden");
  // Live time box stays hidden until user picks both date and time
  timeLiveBox.classList.add("hidden");

  // Set min date and default to today
  setMinDate();

  // Hydrate from URL params (if user clicked an empty slot)
  hydrateFromQuery();
}

function recomputeQuickStartTime() {
  const now = new Date();
  quickStartTime = new Date(now.getTime() + QUICKSTART_LEAD_MIN * 60 * 1000);
  // Round to the next minute
  quickStartTime.setSeconds(0, 0);

  if (qsbTimeEl) qsbTimeEl.textContent = formatTimeShort(quickStartTime);
  if (sessionDateInput) sessionDateInput.value = formatDateInput(quickStartTime);
  if (startTimeInput) startTimeInput.value = formatTimeInput(quickStartTime);
}

function setMinDate() {
  const today = new Date();
  const formattedToday = formatDateInput(today);
  sessionDateInput.min = formattedToday;
  if (!sessionDateInput.value) sessionDateInput.value = formattedToday;
}

function hydrateFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const time = params.get("time");
  const date = params.get("date");

  if (date) {
    sessionDateInput.value = date;
  }

  if (time) {
    startTimeInput.value = time;
  }
}

// ══════════════════════════════════════════════════════════
// FIREBASE
// ══════════════════════════════════════════════════════════
async function loadCourseInfo(uniId, courseCode) {
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

    if (heroCourseCodeEl) heroCourseCodeEl.textContent = courseInfo.courseCode;
    if (heroCourseNameEl) heroCourseNameEl.textContent = courseInfo.courseName;
    if (previewTitle) previewTitle.textContent = `${courseInfo.courseName} Session`;
    document.title = `Create ${courseInfo.courseCode} Session | Think-Up`;
  } catch (err) {
    console.error("Error loading course:", err);
  }
}

async function loadUserExistingSessions() {
  try {
    const sessionsRef = collection(db, "sessions");
    const q = query(
      sessionsRef,
      where("participantIds", "array-contains", currentUser.uid)
    );

    const snap = await getDocs(q);
    userExistingSessions = [];

    snap.forEach((docItem) => {
      const data = docItem.data();
      if (!data.startTime || !data.endTime) return;
      if (data.status === "cancelled") return;

      const effectiveEnd = getEffectiveEndTime(data);

      userExistingSessions.push({
        startTime: data.startTime.toDate(),
        endTime: effectiveEnd
      });
    });
  } catch (err) {
    console.error("Error loading user sessions:", err);
    userExistingSessions = [];
  }
}

function getEffectiveEndTime(sessionData) {
  if (sessionData.status === "completed" && sessionData.endedAt) {
    return sessionData.endedAt.toDate();
  }
  return sessionData.endTime.toDate();
}

// ══════════════════════════════════════════════════════════
// EVENT BINDING
// ══════════════════════════════════════════════════════════
function bindEvents() {
  maxParticipantsInput.addEventListener("input", () => {
    updateParticipantsUI();
    updatePreview();
  });

  sessionTitleInput.addEventListener("input", updatePreview);
  topicNotesInput.addEventListener("input", updatePreview);

  if (mode === "schedule") {
    sessionDateInput.addEventListener("change", () => {
      updateLiveTimeBox();
      updatePreview();
    });
    startTimeInput.addEventListener("change", () => {
      updateLiveTimeBox();
      updatePreview();
    });
  }

  visibilityButtons.forEach((button) => {
    button.addEventListener("click", () => {
      visibilityButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      visibilityInput.value = button.dataset.visibility;
      updatePreview();
    });
  });

  createSessionForm.addEventListener("submit", handleCreateSession);

  closeInviteModalBtn.addEventListener("click", closeInviteModal);
  inviteModal.addEventListener("click", (e) => {
    if (e.target === inviteModal) closeInviteModal();
  });
  copyInviteBtn.addEventListener("click", copyInviteLink);
  goToLobbyBtn.addEventListener("click", () => {
    if (createdSessionId) {
      window.location.href = `session-room.html?id=${createdSessionId}`;
    }
  });
}

// ══════════════════════════════════════════════════════════
// UI UPDATES
// ══════════════════════════════════════════════════════════
function updateParticipantsUI() {
  const value = Number(maxParticipantsInput.value);
  participantsValueEl.textContent = value;

  // Update the hint based on the selected value
  if (value === DEFAULT_PARTICIPANTS) {
    participantsHintEl.innerHTML =
      `💡 <b>${value} is the sweet spot</b> — small enough to stay focused, big enough for diverse perspectives.`;
  } else if (value <= 3) {
    participantsHintEl.innerHTML =
      `💡 <b>${value} people</b> — great for tight-knit groups. Consider increasing to <b>5</b> for more diversity.`;
  } else if (value === 4) {
    participantsHintEl.innerHTML =
      `💡 <b>${value} people</b> — good size. <b>5</b> is the sweet spot if you want one more.`;
  } else if (value === 6) {
    participantsHintEl.innerHTML =
      `💡 <b>${value} people</b> — the maximum. Larger groups can get less focused; <b>5</b> is recommended.`;
  }
}

function updateLiveTimeBox() {
  if (mode === "quickstart") return; // banner handles this
  if (!sessionDateInput.value || !startTimeInput.value) {
    timeLiveBox.classList.add("hidden");
    return;
  }

  const dateTime = new Date(`${sessionDateInput.value}T${startTimeInput.value}:00`);
  if (isNaN(dateTime.getTime())) {
    timeLiveBox.classList.add("hidden");
    return;
  }

  timeLiveBox.classList.remove("hidden");

  const dateLabel = dateTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
  const timeLabel = formatTimeShort(dateTime);
  tlbValueEl.textContent = `${dateLabel} · ${timeLabel}`;

  // Hint text — show "Starts in X" if it's soon
  const diffMin = Math.round((dateTime - new Date()) / 60000);

  if (diffMin < 0) {
    tlbHintEl.textContent = "⚠️ This time is in the past — please choose a future time.";
    tlbHintEl.style.color = "var(--danger)";
  } else if (diffMin === 0) {
    tlbHintEl.textContent = "Starts in less than a minute.";
    tlbHintEl.style.color = "";
  } else if (diffMin < 60) {
    tlbHintEl.textContent = `Starts in ${diffMin} minute${diffMin === 1 ? "" : "s"}.`;
    tlbHintEl.style.color = "";
  } else if (diffMin < 60 * 24) {
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    if (mins === 0) {
      tlbHintEl.textContent = `Starts in ${hours} hour${hours === 1 ? "" : "s"}.`;
    } else {
      tlbHintEl.textContent = `Starts in ${hours}h ${mins}m.`;
    }
    tlbHintEl.style.color = "";
  } else {
    const days = Math.floor(diffMin / (60 * 24));
    tlbHintEl.textContent = `Starts in ${days} day${days === 1 ? "" : "s"}.`;
    tlbHintEl.style.color = "";
  }
}

function updatePreview() {
  const title = sessionTitleInput.value.trim();
  const visibility = visibilityInput.value;
  const participants = maxParticipantsInput.value;

  // Title
  if (title) {
    previewTitle.textContent = title;
  } else if (courseInfo) {
    previewTitle.textContent = `${courseInfo.courseName} Session`;
  }

  // Subtitle
  if (mode === "quickstart") {
    previewSubtitle.textContent = "Quick Start — your session begins in 5 minutes.";
  } else if (visibility === "public") {
    previewSubtitle.textContent = "This session will appear in your major's weekly schedule.";
  } else {
    previewSubtitle.textContent = "This session is private — only people with the invite link can join.";
  }

  // Visibility badge + text
  previewVisibility.textContent = capitalize(visibility);
  previewVisibilityValue.textContent =
    visibility === "public" ? "Public + invite link" : "Private (invite link only)";

  // Date + time
  let dateForPreview, timeForPreview;
  if (mode === "quickstart" && quickStartTime) {
    dateForPreview = quickStartTime.toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric"
    });
    timeForPreview = formatTimeShort(quickStartTime);
  } else if (sessionDateInput.value && startTimeInput.value) {
    const dt = new Date(`${sessionDateInput.value}T${startTimeInput.value}:00`);
    dateForPreview = dt.toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric"
    });
    timeForPreview = formatTimeShort(dt);
  } else {
    dateForPreview = "—";
    timeForPreview = "—";
  }

  previewDate.textContent = dateForPreview;
  previewTime.textContent = timeForPreview;
  previewDuration.textContent = `${FIXED_DURATION_MIN} min`;
  previewParticipants.textContent = `${participants} people`;
}

// ══════════════════════════════════════════════════════════
// SUBMIT HANDLER
// ══════════════════════════════════════════════════════════
async function handleCreateSession(e) {
  e.preventDefault();
  clearError();

  const formData = new FormData(createSessionForm);
  const title = formData.get("sessionTitle")?.trim();
  const maxParticipants = Number(formData.get("maxParticipants"));
  const visibility = formData.get("visibility");
  const topicNotes = formData.get("topicNotes")?.trim() || "";
  const hostConsent = formData.get("hostConsent");

  // ─── Determine start time based on mode ───
  let startDateTime;
  if (mode === "quickstart") {
    // Recompute right before submit (user might have lingered on the page)
    recomputeQuickStartTime();
    startDateTime = quickStartTime;
  } else {
    const sessionDate = formData.get("sessionDate");
    const startTime = formData.get("startTime");

    if (!sessionDate || !startTime) {
      showError("Please select both a date and a start time.");
      return;
    }

    startDateTime = new Date(`${sessionDate}T${startTime}:00`);
    if (isNaN(startDateTime.getTime())) {
      showError("Invalid date or time. Please try again.");
      return;
    }
  }

  // ─── Frontend validation ───
  if (!title) {
    showError("Please enter a session title.");
    sessionTitleInput.focus();
    return;
  }
  if (title.length < 3) {
    showError("Session title must be at least 3 characters long.");
    sessionTitleInput.focus();
    return;
  }
  if (!maxParticipants || maxParticipants < MIN_PARTICIPANTS || maxParticipants > MAX_PARTICIPANTS) {
    showError(`Max participants must be between ${MIN_PARTICIPANTS} and ${MAX_PARTICIPANTS}.`);
    return;
  }
  if (!hostConsent) {
    showError("Please confirm host responsibility before creating the session.");
    return;
  }
  if (startDateTime < new Date()) {
    showError("The session start time is in the past. Please choose a future time.");
    return;
  }
  if (hasUserConflict(startDateTime, FIXED_DURATION_MIN)) {
    showError("This time conflicts with another session you're currently in. Leave that session first, then try again.");
    return;
  }

  // ─── Build payload ───
  const endDateTime = new Date(startDateTime.getTime() + FIXED_DURATION_MIN * 60 * 1000);
  const inviteCode = generateInviteCode();

  const sessionData = {
    courseCode: courseInfo.courseCode,
    courseName: courseInfo.courseName,
    uniId: courseInfo.uniId,

    hostId: currentUser.uid,
    hostName: currentUser.displayName || currentUser.email || "Host",
    hostMajor: null,

    title: title,
    topicNotes: topicNotes,

    startTime: Timestamp.fromDate(startDateTime),
    duration: FIXED_DURATION_MIN,
    endTime: Timestamp.fromDate(endDateTime),

    maxParticipants: maxParticipants,
    visibility: visibility,
    status: "upcoming",

    participantIds: [currentUser.uid],
    participants: {
      [currentUser.uid]: {
        name: currentUser.displayName || currentUser.email || "Host",
        major: null,
        joinedAt: Timestamp.now()
      }
    },
    participantCount: 1,
    participantHistory: [],

    dailyRoomUrl: null,
    summaryText: null,

    inviteCode: inviteCode,

    createdAt: serverTimestamp(),
    startedAt: null,
    endedAt: null,

    // Track creation mode (useful for analytics later)
    createdViaQuickStart: mode === "quickstart"
  };

  // ─── Save ───
  try {
    setLoadingState(true);

    const docRef = await addDoc(collection(db, "sessions"), sessionData);
    createdSessionId = docRef.id;
    createdInviteCode = inviteCode;
    createdVisibility = visibility;

    statusPill.textContent = "✓ Session created";

    // Show invite modal for ALL sessions (public + private)
    showInviteModal();
  } catch (err) {
    console.error("Error creating session:", err);
    showError("Failed to create session. Please try again.");
    setLoadingState(false);
  }
}

// ══════════════════════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════════════════════
function hasUserConflict(startDateTime, durationMinutes) {
  const newStart = startDateTime;
  const newEnd = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

  return userExistingSessions.some((session) => {
    return newStart < session.endTime && newEnd > session.startTime;
  });
}

// ══════════════════════════════════════════════════════════
// INVITE MODAL
// ══════════════════════════════════════════════════════════
function showInviteModal() {
  // Build invite link
  const origin = window.location.origin;
  const inviteUrl = `${origin}/HTML/join-session.html?id=${createdSessionId}&code=${createdInviteCode}`;
  inviteLinkBox.textContent = inviteUrl;

  // Adjust copy based on visibility
  if (createdVisibility === "private") {
    inviteModalBadge.textContent = "🔒 Private Session Created";
    inviteModalTitle.textContent = "Your invite link is ready";
    inviteModalSub.textContent =
      "Share this link with the people you want. Without it, no one can find your session.";
  } else {
    inviteModalBadge.textContent = "🌐 Public Session Created";
    inviteModalTitle.textContent = "Your session is live in the schedule";
    inviteModalSub.textContent =
      "Anyone in your major can join from the schedule, or you can share this link directly.";
  }

  inviteModal.classList.remove("hidden");
  setLoadingState(false);
}

function closeInviteModal() {
  inviteModal.classList.add("hidden");
  if (createdSessionId) {
    window.location.href = `session-room.html?id=${createdSessionId}`;
  }
}

function copyInviteLink() {
  const text = inviteLinkBox.textContent.trim();

  navigator.clipboard.writeText(text).then(() => {
    copyInviteBtn.textContent = "✓ Copied";
    setTimeout(() => {
      copyInviteBtn.textContent = "Copy Link";
    }, 1500);
  }).catch((err) => {
    console.error("Copy failed:", err);
    copyInviteBtn.textContent = "Copy failed";
  });
}

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════
function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function setLoadingState(isLoading) {
  if (isLoading) {
    createBtn.disabled = true;
    createBtnText.textContent = mode === "quickstart" ? "Starting..." : "Creating...";
    statusPill.textContent = "Saving...";
  } else {
    createBtn.disabled = false;
    createBtnText.textContent = mode === "quickstart" ? "Start Session →" : "Create Session";
    statusPill.textContent = "Ready to create";
  }
}

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTimeInput(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function formatTimeShort(date) {
  let hour = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hour >= 12 ? "PM" : "AM";

  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;

  return `${hour}:${minutes} ${period}`;
}

function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}