import { auth, db } from "../Core/firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ============================================
// DOM REFERENCES
// ============================================
const userNameElement = document.getElementById("userName");
const userLabelElement = document.getElementById("userLabel");
const logoutBtn = document.getElementById("logoutBtn");

const statUpcoming = document.getElementById("statUpcoming");
const statSummaries = document.getElementById("statSummaries");

const upcomingSessionsList = document.getElementById("upcomingSessionsList");
const upcomingEmpty = document.getElementById("upcomingEmpty");

const recentActivityList = document.getElementById("recentActivityList");
const recentEmpty = document.getElementById("recentEmpty");

// ============================================
// GLOBAL STATE
// ============================================
let currentUser = null;

// ============================================
// ENTRY POINT
// ============================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "auth.html";
    return;
  }

  currentUser = user;

  // Display user name
  let displayName = user.displayName;
  if (!displayName) {
    displayName = user.email.split("@")[0];
  }

  if (userNameElement) userNameElement.textContent = displayName;
  if (userLabelElement) userLabelElement.textContent = displayName;

  // Load dashboard data
  await loadDashboardData();
});

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      window.location.href = "homePage.html";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  });
}

// ============================================
// EFFECTIVE STATUS (same as session-history)
// ============================================
function getEffectiveStatus(startDate, endDate, rawStatus) {
  if (rawStatus === "cancelled") return "cancelled";

  const now = new Date();
  if (endDate && now > endDate) return "completed";
  if (startDate && now >= startDate) return "live";
  return "upcoming";
}

// ============================================
// LOAD DASHBOARD DATA
// ============================================
async function loadDashboardData() {
  try {
    const sessionsRef = collection(db, "sessions");
    const q = query(
      sessionsRef,
      where("participantIds", "array-contains", currentUser.uid)
    );

    const snap = await getDocs(q);
    const allSessions = [];

    snap.forEach((docItem) => {
      const data = docItem.data();
      if (!data.startTime) return;

      const startDate = data.startTime.toDate();
      const endDate = data.endTime ? data.endTime.toDate() : null;
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
        isHost: data.hostId === currentUser.uid,
        status: effectiveStatus,
        topicNotes: data.topicNotes || "",
        participantCount: data.participantCount || 0,
        maxParticipants: data.maxParticipants || 5,
        summaryText: data.summaryText || null
      });
    });

    updateStats(allSessions);
    renderUpcomingSessions(allSessions);
    renderRecentActivity(allSessions);
  } catch (err) {
    console.error("Error loading dashboard data:", err);
    showEmptyStates();
  }
}

function showEmptyStates() {
  if (upcomingEmpty) upcomingEmpty.classList.remove("hidden");
  if (recentEmpty) recentEmpty.classList.remove("hidden");
}

// ============================================
// STATS
// ============================================
function updateStats(allSessions) {
  const upcoming = allSessions.filter(
    (s) => s.status === "upcoming" || s.status === "live"
  ).length;

  const summaries = allSessions.filter(
    (s) => s.status === "completed"
  ).length;

  if (statUpcoming) statUpcoming.textContent = upcoming;
  if (statSummaries) statSummaries.textContent = summaries;
}

// ============================================
// UPCOMING SESSIONS LIST
// ============================================
function renderUpcomingSessions(allSessions) {
  if (!upcomingSessionsList) return;

  const upcoming = allSessions
    .filter((s) => s.status === "upcoming" || s.status === "live")
    .sort((a, b) => a.startDate - b.startDate)
    .slice(0, 3);

  upcomingSessionsList.innerHTML = "";

  if (upcoming.length === 0) {
    if (upcomingEmpty) upcomingEmpty.classList.remove("hidden");
    return;
  }

  if (upcomingEmpty) upcomingEmpty.classList.add("hidden");

  upcoming.forEach((session) => {
    const card = document.createElement("div");
    card.className = "dashboard-session-card";
    card.innerHTML = `
      <div class="dsc-main">
        <div class="dsc-icon">${getCourseIcon(session.courseCode)}</div>
        <div class="dsc-text">
          <small>${escapeHtml(session.courseCode)} • ${session.isHost ? "Hosted by You" : "Joined"}</small>
          <h3>${escapeHtml(session.title)}</h3>
          <p>${formatDateTime(session.startDate)} • ${session.duration} min</p>
        </div>
      </div>
      <div class="dsc-actions">
        <span class="dsc-badge ${session.status === "live" ? "live" : "upcoming"}">
          ${session.status === "live" ? "Live Now" : "Upcoming"}
        </span>
        <button class="btn btn-outline dsc-join" data-id="${session.id}">
          ${session.status === "live" ? "Join" : "Open Lobby"}
        </button>
      </div>
    `;
    upcomingSessionsList.appendChild(card);
  });

  // Bind join buttons
  document.querySelectorAll(".dsc-join").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      window.location.href = `session-room.html?id=${id}`;
    });
  });
}

// ============================================
// RECENT ACTIVITY
// ============================================
function renderRecentActivity(allSessions) {
  if (!recentActivityList) return;

  // Sort by date (newest first), show last 3 sessions
  const recent = [...allSessions]
    .sort((a, b) => b.startDate - a.startDate)
    .slice(0, 3);

  recentActivityList.innerHTML = "";

  if (recent.length === 0) {
    if (recentEmpty) recentEmpty.classList.remove("hidden");
    return;
  }

  if (recentEmpty) recentEmpty.classList.add("hidden");

  recent.forEach((session) => {
    const item = document.createElement("div");
    item.className = "activity-item";
    item.innerHTML = `
      <div class="activity-dot ${session.status}"></div>
      <div class="activity-content">
        <b>${escapeHtml(session.title)}</b>
        <small>${escapeHtml(session.courseCode)} • ${capitalizeStatus(session.status)}</small>
        <p class="muted">${formatDateRelative(session.startDate)}</p>
      </div>
    `;
    recentActivityList.appendChild(item);
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function getCourseIcon(code) {
  if (!code) return "📘";
  if (code.includes("AI")) return "🤖";
  if (code.includes("BCSC")) return "📘";
  if (code.includes("211") || code.includes("212")) return "☕";
  if (code.includes("305")) return "🗄️";
  if (code.includes("321")) return "🧩";
  if (code.includes("371")) return "🌐";
  if (code.includes("410")) return "💻";
  return "📘";
}

function capitalizeStatus(status) {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
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

function formatDateRelative(date) {
  if (!date) return "—";

  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    // Future
    const future = Math.abs(diffMs);
    const futureDays = Math.floor(future / (1000 * 60 * 60 * 24));
    const futureHours = Math.floor(future / (1000 * 60 * 60));
    if (futureDays > 0) return `In ${futureDays} day${futureDays > 1 ? "s" : ""}`;
    if (futureHours > 0) return `In ${futureHours} hour${futureHours > 1 ? "s" : ""}`;
    return "Starting soon";
  }

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}