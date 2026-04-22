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

// ============================================
// DOM REFERENCES
// ============================================
const createSessionForm = document.getElementById("createSessionForm");
const sessionTitleInput = document.getElementById("sessionTitle");
const sessionDateInput = document.getElementById("sessionDate");
const startTimeSelect = document.getElementById("startTime");
const maxParticipantsInput = document.getElementById("maxParticipants");
const participantsValue = document.getElementById("participantsValue");
const visibilityInput = document.getElementById("visibility");
const visibilityButtons = document.querySelectorAll(".visibility-btn");
const errorBox = document.getElementById("errorBox");
const statusPill = document.getElementById("statusPill");
const createBtn = document.getElementById("createBtn");

const heroCourseCodeEl = document.getElementById("heroCourseCode");
const heroCourseNameEl = document.getElementById("heroCourseName");

const previewTitle = document.getElementById("previewTitle");
const previewVisibility = document.getElementById("previewVisibility");
const previewDate = document.getElementById("previewDate");
const previewTime = document.getElementById("previewTime");
const previewDuration = document.getElementById("previewDuration");
const previewParticipants = document.getElementById("previewParticipants");
const previewSubtitle = document.getElementById("previewSubtitle");

const inviteModal = document.getElementById("inviteModal");
const closeInviteModalBtn = document.getElementById("closeInviteModalBtn");
const copyInviteBtn = document.getElementById("copyInviteBtn");
const inviteLinkBox = document.getElementById("inviteLinkBox");
const goToLobbyBtn = document.getElementById("goToLobbyBtn");

// ============================================
// GLOBAL STATE
// ============================================
let currentUser = null;
let courseInfo = null;
let userExistingSessions = [];
let createdSessionId = null;

// ============================================
// ENTRY POINT
// ============================================
document.addEventListener("DOMContentLoaded", bootstrap);

async function bootstrap() {
  if (!createSessionForm) return;

  // 1. Check URL params
  const params = new URLSearchParams(window.location.search);
  const uniId = params.get("uniId");
  const courseCode = params.get("courseCode");

  if (!uniId || !courseCode) {
    window.location.href = "explore.html";
    return;
  }

  // 2. Check Auth
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "auth.html";
      return;
    }

    currentUser = user;

    // 3. Load course info
    await loadCourseInfo(uniId, courseCode);

    if (!courseInfo) {
      showError("Course not found. Please go back and try again.");
      return;
    }

    // 4. Load user's existing sessions (for conflict check)
    await loadUserExistingSessions();

    // 5. Init form
    init();
  });
}

function init() {
  generateTimeOptions();
  setMinDate();
  hydrateFromQuery();
  updateParticipantsUI();
  updatePreview();
  bindEvents();
}

// ============================================
// FIREBASE FUNCTIONS
// ============================================
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

    // Update hero tags
    if (heroCourseCodeEl) heroCourseCodeEl.textContent = courseInfo.courseCode;
    if (heroCourseNameEl) heroCourseNameEl.textContent = courseInfo.courseName;

    // Update preview title
    if (previewTitle) previewTitle.textContent = `${courseInfo.courseName} Session`;

    // Update browser tab title
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
      where("hostId", "==", currentUser.uid),
      where("status", "in", ["upcoming", "live"])
    );

    const snap = await getDocs(q);
    userExistingSessions = [];

    snap.forEach((docItem) => {
      const data = docItem.data();
      if (data.startTime && data.endTime) {
        userExistingSessions.push({
          startTime: data.startTime.toDate(),
          endTime: data.endTime.toDate()
        });
      }
    });
  } catch (err) {
    console.error("Error loading user sessions:", err);
    userExistingSessions = [];
  }
}

// ============================================
// FORM INIT HELPERS
// ============================================
function bindEvents() {
  maxParticipantsInput.addEventListener("input", () => {
    updateParticipantsUI();
    updatePreview();
  });

  sessionTitleInput.addEventListener("input", updatePreview);
  sessionDateInput.addEventListener("change", updatePreview);
  startTimeSelect.addEventListener("change", updatePreview);

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

function generateTimeOptions() {
  startTimeSelect.innerHTML = `<option value="">Select a start time</option>`;

  const startMinutes = 8 * 60;
  const endMinutes = 21 * 60;

  for (let mins = startMinutes; mins <= endMinutes; mins += 15) {
    const value = minutesTo24Hour(mins);
    const label = minutesTo12Hour(mins);

    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    startTimeSelect.appendChild(option);
  }
}

function setMinDate() {
  const today = new Date();
  const formattedToday = formatDateInput(today);
  sessionDateInput.min = formattedToday;
  sessionDateInput.value = formattedToday;
}

function hydrateFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const time = params.get("time");
  const day = params.get("day");

  if (time) {
    startTimeSelect.value = time;
  }

  if (day) {
    previewSubtitle.textContent = `Creating a session for ${capitalize(day)}.`;
  }
}

function updateParticipantsUI() {
  participantsValue.textContent = maxParticipantsInput.value;
}

function updatePreview() {
  const selectedTitle = sessionTitleInput.value.trim();
  const selectedDate = sessionDateInput.value;
  const selectedTime = startTimeSelect.value;
  const selectedParticipants = maxParticipantsInput.value;
  const selectedVisibility = visibilityInput.value;

  if (selectedTitle) {
    previewTitle.textContent = selectedTitle;
  } else if (courseInfo) {
    previewTitle.textContent = `${courseInfo.courseName} Session`;
  }

  previewVisibility.textContent = capitalize(selectedVisibility);
  previewParticipants.textContent = selectedParticipants;
  previewDate.textContent = selectedDate ? formatDateFriendly(selectedDate) : "—";
  previewTime.textContent = selectedTime ? formatTime24To12(selectedTime) : "—";
  previewDuration.textContent = "60 min";

  if (selectedVisibility === "public") {
    previewSubtitle.textContent = "This session will appear in the weekly course schedule.";
  } else {
    previewSubtitle.textContent = "This session will only be accessible through an invite link.";
  }
}

// ============================================
// MAIN SUBMIT HANDLER
// ============================================
async function handleCreateSession(e) {
  e.preventDefault();
  clearError();

  const formData = new FormData(createSessionForm);
  const title = formData.get("sessionTitle")?.trim();
  const sessionDate = formData.get("sessionDate");
  const startTime = formData.get("startTime");
  const duration = Number(formData.get("duration"));
  const maxParticipants = Number(formData.get("maxParticipants"));
  const visibility = formData.get("visibility");
  const topicNotes = formData.get("topicNotes")?.trim() || "";
  const hostConsent = formData.get("hostConsent");

  // ---- Frontend Validation ----
  if (!title || !sessionDate || !startTime || !duration || !maxParticipants) {
    showError("Please complete all required fields before creating the session.");
    return;
  }

  if (title.length < 3) {
    showError("Session title must be at least 3 characters long.");
    return;
  }

  if (!hostConsent) {
    showError("You must confirm host responsibility before creating the session.");
    return;
  }

  if (isBeforeNow(sessionDate, startTime)) {
    showError("You cannot create a session before the current time.");
    return;
  }

  if (hasUserConflict(sessionDate, startTime, duration)) {
    showError("This time conflicts with another session you already have scheduled.");
    return;
  }

  // ---- Build Firestore payload ----
  const startDateTime = new Date(`${sessionDate}T${startTime}:00`);
  const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

  const inviteCode = generateInviteCode();

  const sessionData = {
    // Course info
    courseCode: courseInfo.courseCode,
    courseName: courseInfo.courseName,
    uniId: courseInfo.uniId,

    // Host info
    hostId: currentUser.uid,
    hostName: currentUser.displayName || currentUser.email || "Host",
    hostMajor: null,

    // Session info
    title: title,
    topicNotes: topicNotes,

    // Timing
    startTime: Timestamp.fromDate(startDateTime),
    duration: duration,
    endTime: Timestamp.fromDate(endDateTime),

    // Settings
    maxParticipants: maxParticipants,
    visibility: visibility,
    status: "upcoming",

    // Participants (Dual Pattern - host is first participant)
    participantIds: [currentUser.uid],
    participants: {
      [currentUser.uid]: {
        name: currentUser.displayName || currentUser.email || "Host",
        major: null,
        joinedAt: Timestamp.now()
      }
    },
    participantCount: 1,

    // Video & AI (placeholders)
    dailyRoomUrl: null,
    summaryText: null,

    // Invite
    inviteCode: inviteCode,

    // System timestamps
    createdAt: serverTimestamp(),
    startedAt: null,
    endedAt: null
  };

  // ---- Save to Firestore ----
  try {
    setLoadingState(true);

    const docRef = await addDoc(collection(db, "sessions"), sessionData);
    createdSessionId = docRef.id;

    statusPill.textContent = "Session created ✓";

    // Redirect or show invite modal
    if (visibility === "public") {
      window.location.href = `session-room.html?id=${createdSessionId}`;
    } else {
      const origin = window.location.origin;
      inviteLinkBox.textContent = `${origin}/HTML/join-session.html?code=${inviteCode}`;
      inviteModal.classList.remove("hidden");
      setLoadingState(false);
    }
  } catch (err) {
    console.error("Error creating session:", err);
    showError("Failed to create session. Please try again.");
    setLoadingState(false);
  }
}

// ============================================
// VALIDATION HELPERS
// ============================================
function isBeforeNow(dateStr, timeStr) {
  const chosen = new Date(`${dateStr}T${timeStr}:00`);
  return chosen < new Date();
}

function hasUserConflict(dateStr, startTime, durationMinutes) {
  const newStart = new Date(`${dateStr}T${startTime}:00`);
  const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);

  return userExistingSessions.some((session) => {
    return newStart < session.endTime && newEnd > session.startTime;
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
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
    createBtn.textContent = "Creating...";
    statusPill.textContent = "Saving...";
  } else {
    createBtn.disabled = false;
    createBtn.textContent = "Create Session";
    statusPill.textContent = "Ready to create";
  }
}

function minutesTo24Hour(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function minutesTo12Hour(totalMinutes) {
  let hours = Math.floor(totalMinutes / 60);
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";

  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;

  return `${hours}:${minutes} ${period}`;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateFriendly(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatTime24To12(time24) {
  const [hourStr, minuteStr] = time24.split(":");
  let hour = Number(hourStr);
  const minute = minuteStr;
  const period = hour >= 12 ? "PM" : "AM";

  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;

  return `${hour}:${minute} ${period}`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  // Scroll to error
  errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function closeInviteModal() {
  inviteModal.classList.add("hidden");
  // After closing private modal, redirect to lobby
  if (createdSessionId) {
    window.location.href = `session-room.html?id=${createdSessionId}`;
  }
}

function copyInviteLink() {
  const text = inviteLinkBox.textContent.trim();

  navigator.clipboard.writeText(text).then(() => {
    copyInviteBtn.textContent = "Copied ✓";
    setTimeout(() => {
      copyInviteBtn.textContent = "Copy Link";
    }, 1200);
  });
}