import { auth, db } from "../Core/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ============================================
// DOM REFERENCES
// ============================================
const tabs = document.querySelectorAll(".tab-btn");
const courseSearch = document.getElementById("courseSearch");
const sortOrder = document.getElementById("sortOrder");
const sessionsList = document.getElementById("sessionsList");
const emptyState = document.getElementById("emptyState");
const resultsCountPill = document.getElementById("resultsCountPill");

const totalSessionsStat = document.getElementById("totalSessionsStat");
const hoursStudiedStat = document.getElementById("hoursStudiedStat");
const upcomingCountStat = document.getElementById("upcomingCountStat");
const hostedCountStat = document.getElementById("hostedCountStat");

const actionModal = document.getElementById("actionModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const closeModalBtn2 = document.getElementById("closeModalBtn2");
const confirmActionBtn = document.getElementById("confirmActionBtn");
const modalBadge = document.getElementById("modalBadge");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");

// ============================================
// GLOBAL STATE
// ============================================
let activeTab = "upcoming";
let pendingAction = null;
let currentUser = null;
let allSessions = [];

// ============================================
// ENTRY POINT
// ============================================
document.addEventListener("DOMContentLoaded", bootstrap);

function bootstrap() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "auth.html";
      return;
    }

    currentUser = user;
    await loadUserSessions();
    updateStats();
    bindTabs();
    bindFilters();
    bindModal();
    renderSessions();
  });
}

// ============================================
// EFFECTIVE STATUS CALCULATION
// ============================================
function getEffectiveStatus(startDate, endDate, rawStatus) {
  // Manual cancellation takes priority
  if (rawStatus === "cancelled") return "cancelled";

  const now = new Date();

  // Past end time → completed (auto)
  if (endDate && now > endDate) {
    return "completed";
  }

  // Between start and end → live
  if (startDate && now >= startDate) {
    return "live";
  }

  // Before start → upcoming
  return "upcoming";
}

function determineBucket(effectiveStatus) {
  if (effectiveStatus === "upcoming" || effectiveStatus === "live") return "upcoming";
  return "past"; // completed or cancelled
}

// ============================================
// FIREBASE: LOAD USER'S SESSIONS
// ============================================
async function loadUserSessions() {
  try {
    const sessionsRef = collection(db, "sessions");

    const q = query(
      sessionsRef,
      where("participantIds", "array-contains", currentUser.uid)
    );

    const snap = await getDocs(q);
    allSessions = [];

    snap.forEach((docItem) => {
      const data = docItem.data();
      if (!data.startTime) return;

      const startDate = data.startTime.toDate();
      const endDate = data.endTime ? data.endTime.toDate() : null;
      const isHost = data.hostId === currentUser.uid;
      const effectiveStatus = getEffectiveStatus(startDate, endDate, data.status);

      allSessions.push({
        id: docItem.id,
        title: data.title || "Untitled Session",
        courseCode: data.courseCode || "",
        courseName: data.courseName || "",
        startDate: startDate,
        endDate: endDate,
        duration: data.duration || 60,
        hostName: data.hostName || "Host",
        hostId: data.hostId,
        isHost: isHost,
        rawStatus: data.status || "upcoming",
        status: effectiveStatus,
        topicNotes: data.topicNotes || "",
        participantCount: data.participantCount || 0,
        maxParticipants: data.maxParticipants || 5,
        visibility: data.visibility || "public",
        bucket: determineBucket(effectiveStatus)
      });
    });
  } catch (err) {
    console.error("Error loading user sessions:", err);
    allSessions = [];
  }
}

// ============================================
// TABS & FILTERS
// ============================================
function bindTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((btn) => btn.classList.remove("active"));
      tab.classList.add("active");
      activeTab = tab.dataset.tab;
      renderSessions();
    });
  });
}

function bindFilters() {
  courseSearch.addEventListener("input", renderSessions);
  sortOrder.addEventListener("change", renderSessions);
}

// ============================================
// MODAL
// ============================================
function bindModal() {
  closeModalBtn.addEventListener("click", closeModal);
  closeModalBtn2.addEventListener("click", closeModal);

  actionModal.addEventListener("click", (e) => {
    if (e.target === actionModal) closeModal();
  });

  confirmActionBtn.addEventListener("click", () => {
    if (pendingAction?.type === "openLobby") {
      window.location.href = `session-room.html?id=${pendingAction.id}`;
      return;
    }

    if (pendingAction?.type === "viewSummary") {
      window.location.href = `session-summary.html?id=${pendingAction.id}`;
      return;
    }

    closeModal();
  });
}

function openModal(title, text, badge) {
  modalTitle.textContent = title;
  modalText.textContent = text;
  modalBadge.textContent = badge;
  actionModal.classList.remove("hidden");
}

function closeModal() {
  actionModal.classList.add("hidden");
}

// ============================================
// STATS
// ============================================
function updateStats() {
  const totalSessions = allSessions.length;
  const totalHours = allSessions.reduce((sum, item) => sum + (item.duration / 60), 0);
  const upcomingCount = allSessions.filter((s) => s.bucket === "upcoming").length;
  const hostedCount = allSessions.filter((s) => s.isHost).length;

  totalSessionsStat.textContent = totalSessions;
  hoursStudiedStat.textContent = totalHours.toFixed(1);
  upcomingCountStat.textContent = upcomingCount;
  hostedCountStat.textContent = hostedCount;
}

// ============================================
// RENDER SESSIONS
// ============================================
function renderSessions() {
  const searchValue = courseSearch.value.trim().toLowerCase();
  const orderValue = sortOrder.value;

  let filtered = allSessions.filter((session) => {
    if (activeTab === "hosted") {
      if (!session.isHost) return false;
    } else if (session.bucket !== activeTab) {
      return false;
    }

    const matchesSearch =
      session.courseName.toLowerCase().includes(searchValue) ||
      session.courseCode.toLowerCase().includes(searchValue) ||
      session.title.toLowerCase().includes(searchValue);

    return matchesSearch;
  });

  filtered.sort((a, b) => {
    const aTime = a.startDate.getTime();
    const bTime = b.startDate.getTime();
    return orderValue === "newest" ? bTime - aTime : aTime - bTime;
  });

  sessionsList.innerHTML = "";
  resultsCountPill.textContent = `${filtered.length} Results`;

  if (!filtered.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  filtered.forEach((session) => {
    const card = document.createElement("article");
    card.className = "session-card";
    card.innerHTML = `
      <div class="session-main">
        <div class="session-top">
          <div class="course-badge">
            <div class="course-badge-icon">${getCourseIcon(session.courseCode)}</div>

            <div class="course-badge-text">
              <small>${session.courseCode}</small>
              <h3>${session.title}</h3>
              <div class="course-code">${session.courseName}</div>
            </div>
          </div>

          <div class="status-badge ${getStatusClass(session.status)}">${capitalizeStatus(session.status)}</div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <span>Date & Time</span>
            <b>${formatDateTime(session.startDate)}</b>
          </div>

          <div class="meta-item">
            <span>Duration</span>
            <b>${session.duration} minutes</b>
          </div>

          <div class="meta-item">
            <span>Host</span>
            <b>${session.isHost ? "You" : session.hostName}</b>
          </div>

          <div class="meta-item">
            <span>Session Type</span>
            <b>${session.isHost ? "Hosted by You" : "Joined Session"}</b>
          </div>
        </div>
      </div>

      <div class="session-actions-wrap">
        <div class="session-note">${session.topicNotes || "No additional notes."}</div>
        <div class="session-actions">
          ${renderActions(session)}
        </div>
      </div>
    `;

    sessionsList.appendChild(card);
  });

  bindActionButtons();
}

function renderActions(session) {
  const status = session.status;

  if (status === "live") {
    return `
      <button class="small-btn primary action-btn" data-action="openLobby" data-id="${session.id}">
        Join Live
      </button>
    `;
  }

  if (status === "upcoming" && !session.isHost) {
    return `
      <button class="small-btn primary action-btn" data-action="openLobby" data-id="${session.id}">
        Open Lobby
      </button>
      <button class="small-btn danger action-btn" data-action="leave" data-id="${session.id}">
        Leave
      </button>
    `;
  }

  if (status === "upcoming" && session.isHost) {
    return `
      <button class="small-btn primary action-btn" data-action="openLobby" data-id="${session.id}">
        Open Lobby
      </button>
      <button class="small-btn action-btn" data-action="edit" data-id="${session.id}">
        Edit
      </button>
      <button class="small-btn danger action-btn" data-action="cancel" data-id="${session.id}">
        Cancel
      </button>
    `;
  }

  if (status === "completed") {
    return `
      <button class="small-btn primary action-btn" data-action="viewSummary" data-id="${session.id}">
        View Summary
      </button>
    `;
  }

  if (status === "cancelled") {
    return `
      <button class="small-btn action-btn" data-action="details" data-id="${session.id}">
        View Details
      </button>
    `;
  }

  return `
    <button class="small-btn action-btn" data-action="details" data-id="${session.id}">
      View Details
    </button>
  `;
}

function bindActionButtons() {
  const actionButtons = document.querySelectorAll(".action-btn");

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      const id = button.dataset.id;

      pendingAction = { type: action, id };

      if (action === "openLobby") {
        openModal("Open Lobby", "Go to the session lobby for this study room.", "Session");
      } else if (action === "viewSummary") {
        openModal("View Summary", "Open the AI summary for this completed session.", "Completed Session");
      } else if (action === "leave") {
        openModal("Leave Session", "This will remove you from the session. (Feature coming in Phase 7)", "Participant Action");
      } else if (action === "edit") {
        openModal("Edit Session", "Session editor will be available soon.", "Host Action");
      } else if (action === "cancel") {
        openModal("Cancel Session", "Session cancellation will be available soon.", "Host Action");
      } else {
        openModal("Session Details", "Detailed view coming soon.", "Preview");
      }
    });
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function getStatusClass(status) {
  if (status === "upcoming") return "status-upcoming";
  if (status === "live") return "status-upcoming";
  if (status === "completed") return "status-completed";
  if (status === "cancelled") return "status-cancelled";
  return "";
}

function capitalizeStatus(status) {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getCourseIcon(code) {
  if (!code) return "📘";
  if (code.includes("211") || code.includes("212")) return "☕";
  if (code.includes("305") || code.includes("306")) return "🗄️";
  if (code.includes("321")) return "🧩";
  if (code.includes("371")) return "🌐";
  if (code.includes("410")) return "💻";
  if (code.includes("AI")) return "🤖";
  if (code.includes("BCSC")) return "📘";
  return "📘";
}

function formatDateTime(date) {
  if (!date) return "—";
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}