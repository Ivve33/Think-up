// ══════════════════════════════════════════════════════════
// Session Room — Phase 6
// Think-Up
// ══════════════════════════════════════════════════════════

import { auth, db, functions } from "../Core/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  runTransaction,
  arrayUnion,
  arrayRemove,
  deleteField,
  increment,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// 🎥 Daily.co video integration (Phase 9)
import {
  initDailyCall,
  toggleMic,
  toggleCamera,
  toggleScreenShare,
  leaveDailyCall,
  isCallActive
} from "./session-room-video.js";
// ══════════════════════════════════════════════════════════
// CONSTANTS & CONFIG
// ══════════════════════════════════════════════════════════
const STATE_CHECK_INTERVAL_MS = 30 * 1000; // 30s — auto-detect endTime crossed
const COUNTDOWN_INTERVAL_MS = 1000;
const LIVE_TIMER_INTERVAL_MS = 1000;

// ══════════════════════════════════════════════════════════
// DOM REFERENCES
// ══════════════════════════════════════════════════════════

// Screens
const loadingScreen = document.getElementById("loadingScreen");
const mainNavbar = document.getElementById("mainNavbar");
const navPill = document.getElementById("navPill");
const lobbyState = document.getElementById("lobbyState");
const liveState = document.getElementById("liveState");
const endedState = document.getElementById("endedState");
const cancelledState = document.getElementById("cancelledState");
const errorScreen = document.getElementById("errorScreen");

// Lobby
const lobbyCourseCode = document.getElementById("lobbyCourseCode");
const lobbyCourseName = document.getElementById("lobbyCourseName");
const lobbyTitle = document.getElementById("lobbyTitle");
const lobbyHostName = document.getElementById("lobbyHostName");
const countdownLabel = document.getElementById("countdownLabel");
const countdownDigits = document.getElementById("countdownDigits");
const countdownScheduled = document.getElementById("countdownScheduled");
const lobbyCount = document.getElementById("lobbyCount");
const lobbyMax = document.getElementById("lobbyMax");
const participantsGrid = document.getElementById("participantsGrid");
const startSessionBtn = document.getElementById("startSessionBtn");
const startBtnText = document.getElementById("startBtnText");
const lobbyLeaveBtn = document.getElementById("lobbyLeaveBtn");
const lobbyHostNote = document.getElementById("lobbyHostNote");
const lobbyParticipantNote = document.getElementById("lobbyParticipantNote");

// Live
const liveTitle = document.getElementById("liveTitle");
const liveCourse = document.getElementById("liveCourse");
const liveElapsed = document.getElementById("liveElapsed");
const liveTotal = document.getElementById("liveTotal");
const liveLeaveBtn = document.getElementById("liveLeaveBtn");
const endSessionBtn = document.getElementById("endSessionBtn");
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
const videoGrid = document.getElementById("videoGrid");
const shareScreenBtn = document.getElementById("shareScreenBtn");
const liveSidebar = document.getElementById("liveSidebar");
const liveCount = document.getElementById("liveCount");
const liveMax = document.getElementById("liveMax");
const sidebarList = document.getElementById("sidebarList");

// Ended
const endedTitle = document.getElementById("endedTitle");
const endedDuration = document.getElementById("endedDuration");
const endedParticipantsNum = document.getElementById("endedParticipantsNum");
const endedRecorded = document.getElementById("endedRecorded");
const summaryDescription = document.getElementById("summaryDescription");
const viewSummaryBtn = document.getElementById("viewSummaryBtn");

// Cancelled
const cancelledText = document.getElementById("cancelledText");

// Error screen
const errorIconBox = document.getElementById("errorIconBox");
const errorIcon = document.getElementById("errorIcon");
const errorTitle = document.getElementById("errorTitle");
const errorText = document.getElementById("errorText");
const errorPrimaryBtn = document.getElementById("errorPrimaryBtn");
const errorSecondaryBtn = document.getElementById("errorSecondaryBtn");
const errorHint = document.getElementById("errorHint");

// Modals
const consentModal = document.getElementById("consentModal");
const consentAgreeBtn = document.getElementById("consentAgreeBtn");
const consentDeclineBtn = document.getElementById("consentDeclineBtn");

const kickModal = document.getElementById("kickModal");
const kickTargetName = document.getElementById("kickTargetName");
const kickCancelBtn = document.getElementById("kickCancelBtn");
const kickConfirmBtn = document.getElementById("kickConfirmBtn");

const hostLeaveModal = document.getElementById("hostLeaveModal");
const newHostName = document.getElementById("newHostName");
const hostLeaveCancelBtn = document.getElementById("hostLeaveCancelBtn");
const hostLeaveConfirmBtn = document.getElementById("hostLeaveConfirmBtn");

const hostLeaveAloneModal = document.getElementById("hostLeaveAloneModal");
const hostAloneCancelBtn = document.getElementById("hostAloneCancelBtn");
const hostAloneConfirmBtn = document.getElementById("hostAloneConfirmBtn");

const endModal = document.getElementById("endModal");
const endCancelBtn = document.getElementById("endCancelBtn");
const endConfirmBtn = document.getElementById("endConfirmBtn");

const kickedOverlay = document.getElementById("kickedOverlay");

// ══════════════════════════════════════════════════════════
// GLOBAL STATE
// ══════════════════════════════════════════════════════════
let sessionId = null;
let currentUser = null;
let sessionRef = null;
let sessionData = null;
let currentUIState = null;    // "lobby" | "live" | "ended" | "cancelled" | "error"
let unsubscribeListener = null;
let countdownInterval = null;
let liveInterval = null;
let stateCheckInterval = null;
let wasJoined = false;        // true after user has been added to participants
let pendingKickTarget = null; // uid being kicked

// 🎥 Phase 9 — Daily.co integration
let videoInitStarted = false;       // prevents double-init when snapshot fires multiple times
let createRoomCallable = null;
let getTokenCallable = null;
let endRoomCallable = null;
// ══════════════════════════════════════════════════════════
// 🎥 PHASE 9 — Cloud Function callables (lazy-init)
// ══════════════════════════════════════════════════════════
function getCreateRoomCallable() {
  if (!createRoomCallable) {
    createRoomCallable = httpsCallable(functions, "createDailyRoom");
  }
  return createRoomCallable;
}

function getTokenCallableFn() {
  if (!getTokenCallable) {
    getTokenCallable = httpsCallable(functions, "getDailyToken");
  }
  return getTokenCallable;
}

function getEndRoomCallable() {
  if (!endRoomCallable) {
    endRoomCallable = httpsCallable(functions, "endDailyRoom");
  }
  return endRoomCallable;
}

/**
 * Show a non-fatal error in the shell-info-panel (replaces the loader).
 * Used when Daily fails but we want the user to keep seeing the session.
 */
function showVideoError(message) {
  const wrap = document.getElementById("dailyFrameWrap");
  const panel = document.getElementById("shellInfoPanel");
  const text = document.getElementById("shellInfoText");

  if (wrap) wrap.hidden = true;
  if (text) text.textContent = message || "Video service is unavailable. Please refresh.";
  if (panel) panel.hidden = false;

  console.error("[session-room] Video error:", message);
}
// ══════════════════════════════════════════════════════════
// ENTRY POINT
// ══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", bootstrap);

async function bootstrap() {
  // 1. Read session ID from URL
  const params = new URLSearchParams(window.location.search);
  sessionId = params.get("id");

  if (!sessionId) {
    showErrorScreen("not_found");
    return;
  }

  // 2. Wire up all event handlers once (even before we know user/session)
  bindEventHandlers();

  // 3. Auth guard
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "auth.html";
      return;
    }
    currentUser = user;

    // 4. Load session & begin access flow
    sessionRef = doc(db, "sessions", sessionId);
    await initializeSession();
  });
}

// ══════════════════════════════════════════════════════════
// SESSION LOADING & ACCESS CONTROL
// ══════════════════════════════════════════════════════════
async function initializeSession() {
  try {
    const snap = await getDoc(sessionRef);

    if (!snap.exists()) {
      showErrorScreen("not_found");
      return;
    }

    sessionData = snap.data();
    const state = computeState(sessionData, new Date());
    const access = determineAccess(sessionData, currentUser.uid, state);

    if (!access.allowed) {
      if (access.reason === "needs_consent") {
        showConsentModal();
        return;
      }
      showErrorScreen(access.reason);
      return;
    }

    // User is participant → enter room directly
    wasJoined = true;
    enterRoom();
  } catch (err) {
    console.error("Error initializing session:", err);
    showErrorScreen("not_found");
  }
}

/**
 * Compute the effective UI state from session data.
 * Priority: cancelled > completed > auto-end by time > live > lobby
 */
function computeState(data, now) {
  if (data.status === "cancelled") return "cancelled";
  if (data.status === "completed") return "ended";
  if (data.endTime && now > data.endTime.toDate()) return "ended"; // auto-end
  if (data.status === "live") return "live";
  return "lobby"; // "upcoming"
}

/**
 * Access Control Matrix
 * Returns { allowed: bool, reason?: "private" | "full" | "past_denied" | "needs_consent" }
 */
function determineAccess(data, userId, state) {
  const isParticipant = (data.participantIds || []).includes(userId);
  const isFull = (data.participantCount || 0) >= (data.maxParticipants || 5);
  const isPrivate = data.visibility === "private";

  // Active sessions (lobby / live)
  if (state === "lobby" || state === "live") {
    if (isParticipant) return { allowed: true };
    if (isPrivate) return { allowed: false, reason: "private" };
    if (isFull) return { allowed: false, reason: "full" };
    return { allowed: false, reason: "needs_consent" };
  }

  // Past sessions (ended / cancelled)
  if (state === "ended" || state === "cancelled") {
    if (isParticipant) return { allowed: true };
    return { allowed: false, reason: "past_denied" };
  }

  return { allowed: false, reason: "unknown" };
}

// ══════════════════════════════════════════════════════════
// AUTO-JOIN FLOW (with consent)
// ══════════════════════════════════════════════════════════
function showConsentModal() {
  hideAllScreens();
  loadingScreen.hidden = true;
  consentModal.hidden = false;
}

async function handleConsentAgree() {
  consentModal.hidden = true;
  loadingScreen.hidden = false;

  const result = await attemptAutoJoin();
  if (!result.success) {
    showErrorScreen(result.reason || "not_found");
    return;
  }

  wasJoined = true;
  // Reload session data before entering (so we have fresh state)
  try {
    const snap = await getDoc(sessionRef);
    sessionData = snap.data();
  } catch (err) {
    console.error("Reload failed after join:", err);
  }
  enterRoom();
}

function handleConsentDecline() {
  window.location.href = "dashboard.html";
}

/**
 * Transaction-based auto-join.
 * Prevents race conditions for the "full" check.
 */
async function attemptAutoJoin() {
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(sessionRef);
      if (!snap.exists()) throw new Error("not_found");

      const data = snap.data();
      const now = new Date();

      // Idempotent: already in
      if ((data.participantIds || []).includes(currentUser.uid)) return;

      // Session ended or cancelled
      if (data.status === "cancelled") throw new Error("past_denied");
      if (data.status === "completed") throw new Error("past_denied");
      if (data.endTime && now > data.endTime.toDate()) throw new Error("past_denied");

      // Private without invite
      if (data.visibility === "private") throw new Error("private");

      // Full
      const count = data.participantCount || 0;
      const max = data.maxParticipants || 5;
      if (count >= max) throw new Error("full");

      // Safe to join
      transaction.update(sessionRef, {
        participantIds: arrayUnion(currentUser.uid),
        [`participants.${currentUser.uid}`]: {
          name: currentUser.displayName || currentUser.email || "Student",
          major: null,
          joinedAt: Timestamp.now()
        },
        participantCount: increment(1)
      });
    });
    return { success: true };
  } catch (err) {
    console.error("Auto-join failed:", err);
    return { success: false, reason: err.message };
  }
}

// ══════════════════════════════════════════════════════════
// ENTER ROOM (set up listener + timers)
// ══════════════════════════════════════════════════════════
function enterRoom() {
  setupRealtimeListener();
  startStateCheckInterval();
}

function setupRealtimeListener() {
  if (unsubscribeListener) unsubscribeListener();

  unsubscribeListener = onSnapshot(
    sessionRef,
    (snap) => {
      if (!snap.exists()) {
        showErrorScreen("not_found");
        return;
      }

      const prevData = sessionData;
      sessionData = snap.data();

      // Kick detection
      if (wasJoined && !(sessionData.participantIds || []).includes(currentUser.uid)) {
        // Only treat as kick if session is still active (not ended naturally)
        const state = computeState(sessionData, new Date());
        if (state === "lobby" || state === "live") {
          handleKickedOut();
          return;
        }
        // Otherwise (session ended while I was out), show past_denied
        wasJoined = false;
      }

      const state = computeState(sessionData, new Date());
      renderByState(state);

      // 🎥 Phase 9 — Auto-join Daily call when:
      //    1. Session is live
      //    2. Daily room URL exists
      //    3. We haven't started the call yet
      if (
        state === "live" &&
        sessionData.dailyRoomUrl &&
        !videoInitStarted &&
        !isCallActive()
      ) {
        videoInitStarted = true; // prevent double-init from rapid snapshot fires
        startVideoCall().catch((err) => {
          console.error("[session-room] Video init failed:", err);
          videoInitStarted = false; // allow retry
        });
      }
    },
    (err) => {
      console.error("Snapshot listener error:", err);
      showErrorScreen("not_found");
    }
  );
}

/**
 * 🎥 Get a Daily token for this user, then init the call.
 * Called automatically when session goes live + dailyRoomUrl exists.
 */
async function startVideoCall() {
  try {
    // 1. Request a meeting token from our Cloud Function
    const tokenFn = getTokenCallableFn();
    const result = await tokenFn({ sessionId: sessionId });
    const { token, roomUrl } = result.data || {};

    if (!token || !roomUrl) {
      throw new Error("Invalid token response from server.");
    }

    // 2. User name for Daily display
    const userName =
      sessionData.participants?.[currentUser.uid]?.name ||
      currentUser.displayName ||
      "Student";

    // 3. Init Daily call (the SDK handles the iframe + UI)
    await initDailyCall(roomUrl, userName, token, (errorMsg) => {
      // Error callback from session-room-video.js
      showVideoError(errorMsg);
    });
  } catch (err) {
    console.error("[session-room] startVideoCall failed:", err);
    let msg = "Could not connect to the video service.";
    if (err?.code === "functions/permission-denied") {
      msg = "You don't have permission to join this video call.";
    } else if (err?.code === "functions/failed-precondition") {
      msg = "Session has not started yet.";
    }
    showVideoError(msg);
    throw err; // let caller know it failed
  }
}
function handleKickedOut() {
  wasJoined = false;
  stopAllTimers();
  if (unsubscribeListener) { unsubscribeListener(); unsubscribeListener = null; }

  // 🎥 Phase 9 — Leave Daily if active
  if (isCallActive()) {
    leaveDailyCall().catch(() => {});
  }
  videoInitStarted = false;

  hideAllScreens();
  kickedOverlay.hidden = false;
}
// ══════════════════════════════════════════════════════════
// RENDERING — STATE ROUTER
// ══════════════════════════════════════════════════════════
function renderByState(state) {
  if (state === currentUIState) {
    // Same state → just refresh dynamic parts
    refreshCurrentState();
    return;
  }

  currentUIState = state;
  hideAllScreens();
  loadingScreen.hidden = true;

  switch (state) {
    case "lobby":     renderLobby();     break;
    case "live":      renderLive();      break;
    case "ended":     renderEnded();     break;
    case "cancelled": renderCancelled(); break;
    default:          showErrorScreen("not_found");
  }
}

function refreshCurrentState() {
  switch (currentUIState) {
    case "lobby": updateLobbyDynamic(); break;
    case "live":  updateLiveDynamic();  break;
    // ended/cancelled are static once shown
  }
}

function hideAllScreens() {
  mainNavbar.hidden = true;
  lobbyState.hidden = true;
  liveState.hidden = true;
  endedState.hidden = true;
  cancelledState.hidden = true;
  errorScreen.hidden = true;
  consentModal.hidden = true;
  kickedOverlay.hidden = true;
}

function setNavPill(text) {
  if (text) {
    navPill.textContent = text;
    navPill.hidden = false;
  } else {
    navPill.hidden = true;
  }
}

// ══════════════════════════════════════════════════════════
// RENDERING — LOBBY
// ══════════════════════════════════════════════════════════
function renderLobby() {
  mainNavbar.hidden = false;
  lobbyState.hidden = false;
  setNavPill("In Lobby");

  // Static
  lobbyCourseCode.textContent = sessionData.courseCode || "—";
  lobbyCourseName.textContent = sessionData.courseName || "Course";
  lobbyTitle.textContent = sessionData.title || "Session";
  document.title = `${sessionData.title || "Session"} | Think-Up`;

  updateLobbyDynamic();
  startCountdown();
}

function updateLobbyDynamic() {
  if (!sessionData) return;

  const isHost = sessionData.hostId === currentUser.uid;
  const hostDisplayName = isHost ? "You" : (sessionData.hostName || "—");
  lobbyHostName.textContent = hostDisplayName;

  // Counts
  lobbyCount.textContent = sessionData.participantCount || 0;
  lobbyMax.textContent = sessionData.maxParticipants || 5;

  // Scheduled time
  if (sessionData.startTime) {
    countdownScheduled.textContent = `Scheduled for ${formatDateTimeReadable(sessionData.startTime.toDate())}`;
  }

  // Show/hide host vs participant UI
  startSessionBtn.hidden = !isHost;
  endSessionBtn.hidden = !isHost;
  lobbyHostNote.hidden = !isHost;
  lobbyParticipantNote.hidden = isHost;

  // Render participants grid
  renderParticipantsGrid();
}

function renderParticipantsGrid() {
  participantsGrid.innerHTML = "";
  const participants = sessionData.participants || {};
  const hostId = sessionData.hostId;

  // Sort: host first, then by joinedAt
  const entries = Object.entries(participants).sort((a, b) => {
    if (a[0] === hostId) return -1;
    if (b[0] === hostId) return 1;
    const aTime = a[1].joinedAt?.toMillis?.() || 0;
    const bTime = b[1].joinedAt?.toMillis?.() || 0;
    return aTime - bTime;
  });

  entries.forEach(([uid, info]) => {
    const isHost = uid === hostId;
    const isSelf = uid === currentUser.uid;
    const displayName = isSelf ? `${info.name || "Student"} (You)` : (info.name || "Student");
    const initial = (info.name || "S").trim().charAt(0).toUpperCase();

    const tile = document.createElement("div");
    tile.className = "participant-tile";
    tile.innerHTML = `
      <div class="participant-avatar ${isHost ? "host" : ""}">${escapeHtml(initial)}</div>
      <div class="participant-name">${escapeHtml(displayName)}</div>
      <div class="participant-role ${isHost ? "host-role" : ""}">${isHost ? "Host" : "Participant"}</div>
    `;
    participantsGrid.appendChild(tile);
  });
}

// ══════════════════════════════════════════════════════════
// RENDERING — LIVE
// ══════════════════════════════════════════════════════════
function renderLive() {
  mainNavbar.hidden = true; // replaced by live-topbar
  liveState.hidden = false;

  // Static
  liveTitle.textContent = sessionData.title || "Session";
  liveCourse.textContent = `${sessionData.courseCode || "—"} · ${sessionData.courseName || "Course"}`;
  document.title = `🔴 LIVE — ${sessionData.title || "Session"} | Think-Up`;

  updateLiveDynamic();
  startLiveTimer();
}

function updateLiveDynamic() {
  if (!sessionData) return;

  const isHost = sessionData.hostId === currentUser.uid;
  endSessionBtn.hidden = !isHost;

  liveCount.textContent = sessionData.participantCount || 0;
  liveMax.textContent = sessionData.maxParticipants || 5;

  renderVideoGrid();
  renderSidebarList();
}

function renderVideoGrid() {
  videoGrid.innerHTML = "";
  const participants = sessionData.participants || {};
  const hostId = sessionData.hostId;

  const entries = Object.entries(participants).sort((a, b) => {
    if (a[0] === hostId) return -1;
    if (b[0] === hostId) return 1;
    return 0;
  });

  entries.forEach(([uid, info]) => {
    const isHost = uid === hostId;
    const isSelf = uid === currentUser.uid;
    const displayName = isSelf ? `${info.name || "Student"} (You)` : (info.name || "Student");
    const initial = (info.name || "S").trim().charAt(0).toUpperCase();

    const tile = document.createElement("div");
    tile.className = "video-tile";
    tile.innerHTML = `
      ${isHost ? `<div class="video-tile-badges"><span class="video-tile-badge host">👑 Host</span></div>` : ""}
      <div class="video-tile-avatar">${escapeHtml(initial)}</div>
      <div class="video-tile-name">${escapeHtml(displayName)}</div>
    `;
    videoGrid.appendChild(tile);
  });
}

function renderSidebarList() {
  sidebarList.innerHTML = "";
  const participants = sessionData.participants || {};
  const hostId = sessionData.hostId;
  const isCurrentUserHost = currentUser.uid === hostId;

  const entries = Object.entries(participants).sort((a, b) => {
    if (a[0] === hostId) return -1;
    if (b[0] === hostId) return 1;
    const aTime = a[1].joinedAt?.toMillis?.() || 0;
    const bTime = b[1].joinedAt?.toMillis?.() || 0;
    return aTime - bTime;
  });

  entries.forEach(([uid, info]) => {
    const isHost = uid === hostId;
    const isSelf = uid === currentUser.uid;
    const initial = (info.name || "S").trim().charAt(0).toUpperCase();
    const displayName = info.name || "Student";
    const roleLabel = isHost ? (isSelf ? "Host · You" : "Host") : (isSelf ? "Participant · You" : "Participant");

    const canKick = isCurrentUserHost && !isSelf && !isHost;

    const item = document.createElement("li");
    item.className = "sidebar-item";
    item.innerHTML = `
      <div class="sidebar-avatar ${isHost ? "host" : ""}">${escapeHtml(initial)}</div>
      <div class="sidebar-info">
        <b>${escapeHtml(displayName)}</b>
        <small>${escapeHtml(roleLabel)}</small>
      </div>
      ${canKick ? `
        <div class="sidebar-menu-wrap">
          <button class="sidebar-menu-btn" aria-label="Participant options" aria-haspopup="menu">
            <span aria-hidden="true">⋮</span>
          </button>
          <div class="sidebar-menu" hidden role="menu">
            <button class="sidebar-menu-item kick-option" role="menuitem"
                    data-kick-uid="${escapeAttr(uid)}"
                    data-kick-name="${escapeAttr(displayName)}">
              <span class="menu-icon" aria-hidden="true">🚪</span>
              <span>Remove from session</span>
            </button>
          </div>
        </div>
      ` : ""}
    `;
    sidebarList.appendChild(item);
  });

  // Wire kebab menu toggle buttons
  sidebarList.querySelectorAll(".sidebar-menu-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = btn.nextElementSibling;
      // Close any other open menus
      sidebarList.querySelectorAll(".sidebar-menu").forEach((m) => {
        if (m !== menu) m.hidden = true;
      });
      // Toggle this one
      menu.hidden = !menu.hidden;
    });
  });

  // Wire "Remove" options inside menus
  sidebarList.querySelectorAll(".kick-option").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const uid = btn.dataset.kickUid;
      const name = btn.dataset.kickName;
      // Close the menu
      const menu = btn.closest(".sidebar-menu");
      if (menu) menu.hidden = true;
      openKickModal(uid, name);
    });
  });
}

// Close all open sidebar menus (called on outside click)
function closeAllSidebarMenus() {
  if (!sidebarList) return;
  sidebarList.querySelectorAll(".sidebar-menu").forEach((m) => { m.hidden = true; });
}

// ══════════════════════════════════════════════════════════
// RENDERING — ENDED
// ══════════════════════════════════════════════════════════
function renderEnded() {
  mainNavbar.hidden = false;
  endedState.hidden = false;
  setNavPill("Session Ended");

  endedTitle.textContent = sessionData.title || "Session Ended";
  document.title = `Ended — ${sessionData.title || "Session"} | Think-Up`;

  // Duration: prefer actual (endedAt - startedAt), fallback to scheduled duration
  let actualMinutes = null;
  if (sessionData.startedAt && sessionData.endedAt) {
    actualMinutes = Math.round(
      (sessionData.endedAt.toDate() - sessionData.startedAt.toDate()) / 60000
    );
  }
  const displayDuration = actualMinutes ?? sessionData.duration ?? 60;
  endedDuration.textContent = displayDuration;

  endedParticipantsNum.textContent = sessionData.participantCount || 0;
  endedRecorded.textContent = "— Phase 9"; // placeholder until Daily.co

  // Summary link — always goes to session-summary page (which handles "not ready")
  viewSummaryBtn.href = `session-summary.html?id=${encodeURIComponent(sessionId)}`;
  if (sessionData.summaryText) {
    summaryDescription.textContent = "Your AI summary is ready.";
  } else {
    summaryDescription.textContent = "Summary will be generated with Phase 10. For now, you can review session details.";
  }

  stopAllTimers();
}

// ══════════════════════════════════════════════════════════
// RENDERING — CANCELLED
// ══════════════════════════════════════════════════════════
function renderCancelled() {
  mainNavbar.hidden = false;
  cancelledState.hidden = false;
  setNavPill("Cancelled");
  document.title = `Cancelled — ${sessionData.title || "Session"} | Think-Up`;
  stopAllTimers();
}

// ══════════════════════════════════════════════════════════
// RENDERING — ERROR SCREENS (dynamic content)
// ══════════════════════════════════════════════════════════
function showErrorScreen(reason) {
  stopAllTimers();
  if (unsubscribeListener) { unsubscribeListener(); unsubscribeListener = null; }
  hideAllScreens();
  mainNavbar.hidden = false;
  errorScreen.hidden = false;
  setNavPill(null); // hide pill on error

  const configs = {
    not_found: {
      iconClass: "not-found",
      icon: "🔍",
      title: "Session Not Found",
      text: "This session doesn't exist or may have been deleted.",
      primaryText: "Back to Dashboard",
      primaryHref: "dashboard.html",
      secondaryText: null,
      hint: null,
      docTitle: "Not Found"
    },
    private: {
      iconClass: "private",
      icon: "🔐",
      title: "Private Session",
      text: "This session is invite-only. Ask the host for an invite link to join.",
      primaryText: "Back to Dashboard",
      primaryHref: "dashboard.html",
      secondaryText: null,
      hint: "Invite code entry is coming with Phase 8.",
      docTitle: "Private"
    },
    full: {
      iconClass: "full",
      icon: "👥",
      title: "Session Full",
      text: `All ${sessionData?.maxParticipants || 5} seats are taken. Try joining another session for this course.`,
      primaryText: "View Course Sessions",
      primaryHref: sessionData?.courseCode && sessionData?.uniId
        ? `course-sessions.html?uniId=${encodeURIComponent(sessionData.uniId)}&courseCode=${encodeURIComponent(sessionData.courseCode)}`
        : "explore.html",
      secondaryText: "Back to Dashboard",
      secondaryHref: "dashboard.html",
      hint: null,
      docTitle: "Full"
    },
    past_denied: {
      iconClass: "past",
      icon: "🔒",
      title: "Session Ended",
      text: "This session has ended and its content is private to participants only.",
      primaryText: "Back to Dashboard",
      primaryHref: "dashboard.html",
      secondaryText: null,
      hint: null,
      docTitle: "Access Denied"
    }
  };

  const cfg = configs[reason] || configs.not_found;

  errorIconBox.className = `error-icon-box ${cfg.iconClass}`;
  errorIcon.textContent = cfg.icon;
  errorTitle.textContent = cfg.title;
  errorText.textContent = cfg.text;

  errorPrimaryBtn.textContent = cfg.primaryText;
  errorPrimaryBtn.href = cfg.primaryHref;

  if (cfg.secondaryText) {
    errorSecondaryBtn.textContent = cfg.secondaryText;
    errorSecondaryBtn.href = cfg.secondaryHref;
    errorSecondaryBtn.hidden = false;
  } else {
    errorSecondaryBtn.hidden = true;
  }

  if (cfg.hint) {
    errorHint.textContent = cfg.hint;
    errorHint.hidden = false;
  } else {
    errorHint.hidden = true;
  }

  document.title = `${cfg.docTitle} | Think-Up`;
  currentUIState = "error";
}

// ══════════════════════════════════════════════════════════
// TIMERS
// ══════════════════════════════════════════════════════════
function startCountdown() {
  stopCountdown();
  updateCountdownTick();
  countdownInterval = setInterval(updateCountdownTick, COUNTDOWN_INTERVAL_MS);
}

function stopCountdown() {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
}

function updateCountdownTick() {
  if (!sessionData || !sessionData.startTime) return;

  const now = new Date();
  const start = sessionData.startTime.toDate();
  const diff = start - now;

  const isHost = sessionData.hostId === currentUser.uid;

  if (diff <= 0) {
    countdownLabel.textContent = "Ready to start";
    countdownDigits.textContent = "00:00";
    if (isHost) {
      startSessionBtn.disabled = false;
      startBtnText.textContent = "Start Session";
    }
    return;
  }

  countdownLabel.textContent = "Starts in";
  countdownDigits.textContent = formatCountdown(diff);
  if (isHost) {
    startSessionBtn.disabled = true;
  }
}

function startLiveTimer() {
  stopLiveTimer();
  updateLiveTimerTick();
  liveInterval = setInterval(updateLiveTimerTick, LIVE_TIMER_INTERVAL_MS);
}

function stopLiveTimer() {
  if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }
}

function updateLiveTimerTick() {
  if (!sessionData) return;

  const now = new Date();
  const started = sessionData.startedAt
    ? sessionData.startedAt.toDate()
    : (sessionData.startTime ? sessionData.startTime.toDate() : now);

  const elapsedSec = Math.max(0, Math.floor((now - started) / 1000));
  liveElapsed.textContent = formatMMSS(elapsedSec);

  const totalMin = sessionData.duration || 60;
  liveTotal.textContent = `${String(totalMin).padStart(2, "0")}:00`;
}

function startStateCheckInterval() {
  stopStateCheckInterval();
  stateCheckInterval = setInterval(() => {
    if (!sessionData) return;
    const state = computeState(sessionData, new Date());
    if (state !== currentUIState) {
      renderByState(state);
    }
  }, STATE_CHECK_INTERVAL_MS);
}

function stopStateCheckInterval() {
  if (stateCheckInterval) { clearInterval(stateCheckInterval); stateCheckInterval = null; }
}

function stopAllTimers() {
  stopCountdown();
  stopLiveTimer();
  stopStateCheckInterval();
}

// ══════════════════════════════════════════════════════════
// FIRESTORE WRITE OPERATIONS
// ══════════════════════════════════════════════════════════

/** Host: start the live session */
async function startSession() {
  if (sessionData.hostId !== currentUser.uid) return;

  try {
    startSessionBtn.disabled = true;
    if (startBtnText) startBtnText.textContent = "Starting…";

    // 1. 🎥 Create the Daily room first (Phase 9).
    //    The Cloud Function returns the URL and saves it to Firestore.
    const createRoom = getCreateRoomCallable();
    await createRoom({ sessionId: sessionId });

    // 2. Then flip the session state to "live" + record startedAt.
    //    The onSnapshot listener will pick it up and render the live UI.
    await updateDoc(sessionRef, {
      status: "live",
      startedAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Start session failed:", err);

    // Friendly error message
    let msg = "Could not start the session. Please try again.";
    if (err?.code === "functions/permission-denied") {
      msg = "Only the host can start this session.";
    } else if (err?.code === "functions/unauthenticated") {
      msg = "Please sign in again to start the session.";
    } else if (err?.message?.includes("Daily")) {
      msg = "Could not connect to the video service. Please try again.";
    }
    alert(msg);

    startSessionBtn.disabled = false;
    if (startBtnText) startBtnText.textContent = "Start Session";
  }
}
/** Host: end the live session */
async function endSession() {
  if (sessionData.hostId !== currentUser.uid) return;

  try {
    // 1. Leave the Daily call locally first (smoother UX).
    if (isCallActive()) {
      await leaveDailyCall();
    }

    // 2. Mark session as completed in Firestore.
    //    Other participants' onSnapshot will fire → they leave the call too.
    await updateDoc(sessionRef, {
      status: "completed",
      endedAt: serverTimestamp()
    });

    // 3. 🎥 Cleanup on Daily side: stop recording, delete room, save URL.
    //    Best-effort — we don't block on this. Even if it fails, the session
    //    is properly marked completed in Firestore.
    try {
      const endRoom = getEndRoomCallable();
      await endRoom({ sessionId: sessionId });
    } catch (cleanupErr) {
      console.warn("Daily room cleanup failed (non-fatal):", cleanupErr);
    }
  } catch (err) {
    console.error("End session failed:", err);
    alert("Could not end the session. Please try again.");
  }
}
/** Remove current user from participants (and promote successor if host) */
async function leaveSession() {
  // Stop listener before write to avoid "kicked" false positive
  if (unsubscribeListener) { unsubscribeListener(); unsubscribeListener = null; }
  stopAllTimers();
  wasJoined = false;

  // 🎥 Phase 9 — Leave Daily call before leaving the session
  if (isCallActive()) {
    try {
      await leaveDailyCall();
    } catch (err) {
      console.warn("Daily leave error (non-fatal):", err);
    }
  }
  videoInitStarted = false;
  try {
    const isHost = sessionData.hostId === currentUser.uid;
    const myInfo = sessionData.participants?.[currentUser.uid] || {};
    const otherEntries = Object.entries(sessionData.participants || {})
      .filter(([uid]) => uid !== currentUser.uid);

    // Build history entry for the leaving user
    const historyEntry = {
      uid: currentUser.uid,
      name: myInfo.name || currentUser.displayName || currentUser.email || "Student",
      major: myInfo.major || null,
      joinedAt: myInfo.joinedAt || Timestamp.now(),
      leftAt: Timestamp.now(),
      leftReason: isHost && otherEntries.length > 0 ? "hostLeft" : "left"
    };

    if (isHost && otherEntries.length > 0) {
      // Promote oldest successor
      const sorted = otherEntries.sort(
        (a, b) => (a[1].joinedAt?.toMillis?.() || 0) - (b[1].joinedAt?.toMillis?.() || 0)
      );
      const [newHostId, newHostInfo] = sorted[0];

      await updateDoc(sessionRef, {
        hostId: newHostId,
        hostName: newHostInfo.name || "Host",
        hostMajor: newHostInfo.major || null,
        participantIds: arrayRemove(currentUser.uid),
        [`participants.${currentUser.uid}`]: deleteField(),
        participantCount: increment(-1),
        participantHistory: arrayUnion(historyEntry)
      });
    } else if (isHost) {
      // Host alone — end the session (endedAt captures the actual end)
      await updateDoc(sessionRef, {
        status: "completed",
        endedAt: serverTimestamp(),
        participantIds: arrayRemove(currentUser.uid),
        [`participants.${currentUser.uid}`]: deleteField(),
        participantCount: increment(-1)
      });
    } else {
      // Regular participant
      await updateDoc(sessionRef, {
        participantIds: arrayRemove(currentUser.uid),
        [`participants.${currentUser.uid}`]: deleteField(),
        participantCount: increment(-1),
        participantHistory: arrayUnion(historyEntry)
      });
    }
  } catch (err) {
    console.error("Leave session failed:", err);
  }

  window.location.href = "dashboard.html";
}

/** Host: remove a participant */
async function kickParticipant(targetUid) {
  if (sessionData.hostId !== currentUser.uid) return;
  if (targetUid === currentUser.uid) return;

  try {
    const targetInfo = sessionData.participants?.[targetUid] || {};

    await updateDoc(sessionRef, {
      participantIds: arrayRemove(targetUid),
      [`participants.${targetUid}`]: deleteField(),
      participantCount: increment(-1),
      participantHistory: arrayUnion({
        uid: targetUid,
        name: targetInfo.name || "Student",
        major: targetInfo.major || null,
        joinedAt: targetInfo.joinedAt || Timestamp.now(),
        leftAt: Timestamp.now(),
        leftReason: "kicked"
      })
    });
    // The kicked user's listener will auto-handle
  } catch (err) {
    console.error("Kick failed:", err);
    alert("Could not remove participant. Please try again.");
  }
}

// ══════════════════════════════════════════════════════════
// EVENT HANDLERS
// ══════════════════════════════════════════════════════════
function bindEventHandlers() {
  // Consent modal
  consentAgreeBtn.addEventListener("click", handleConsentAgree);
  consentDeclineBtn.addEventListener("click", handleConsentDecline);

  // Lobby
  lobbyLeaveBtn.addEventListener("click", handleLobbyLeave);
  startSessionBtn.addEventListener("click", startSession);

  // Live
  liveLeaveBtn.addEventListener("click", handleLiveLeave);
  endSessionBtn.addEventListener("click", openEndModal);
  sidebarToggleBtn.addEventListener("click", toggleSidebar);

  // 🎥 Phase 9 — Video controls (Mic / Camera / Share)
  const micBtn    = document.getElementById("micBtn");
  const cameraBtn = document.getElementById("cameraBtn");
  const shareBtn  = document.getElementById("shareBtn");
  if (micBtn)    micBtn.addEventListener("click", toggleMic);
  if (cameraBtn) cameraBtn.addEventListener("click", toggleCamera);
  if (shareBtn)  shareBtn.addEventListener("click", toggleScreenShare);
  // End modal
  endCancelBtn.addEventListener("click", () => { endModal.hidden = true; });
  endConfirmBtn.addEventListener("click", async () => {
    endModal.hidden = true;
    await endSession();
  });
  endModal.addEventListener("click", (e) => {
    if (e.target === endModal) endModal.hidden = true;
  });

  // Kick modal
  kickCancelBtn.addEventListener("click", () => {
    kickModal.hidden = true;
    pendingKickTarget = null;
  });
  kickConfirmBtn.addEventListener("click", async () => {
    const target = pendingKickTarget;
    kickModal.hidden = true;
    pendingKickTarget = null;
    if (target) await kickParticipant(target);
  });
  kickModal.addEventListener("click", (e) => {
    if (e.target === kickModal) {
      kickModal.hidden = true;
      pendingKickTarget = null;
    }
  });

  // Host leave modal (with successor)
  hostLeaveCancelBtn.addEventListener("click", () => { hostLeaveModal.hidden = true; });
  hostLeaveConfirmBtn.addEventListener("click", async () => {
    hostLeaveModal.hidden = true;
    await leaveSession();
  });
  hostLeaveModal.addEventListener("click", (e) => {
    if (e.target === hostLeaveModal) hostLeaveModal.hidden = true;
  });

  // Host leave alone modal
  hostAloneCancelBtn.addEventListener("click", () => { hostLeaveAloneModal.hidden = true; });
  hostAloneConfirmBtn.addEventListener("click", async () => {
    hostLeaveAloneModal.hidden = true;
    await leaveSession();
  });
  hostLeaveAloneModal.addEventListener("click", (e) => {
    if (e.target === hostLeaveAloneModal) hostLeaveAloneModal.hidden = true;
  });

  // Cleanup on page unload
  window.addEventListener("beforeunload", cleanup);

  // Close sidebar kebab menus on any outside click
  document.addEventListener("click", closeAllSidebarMenus);
}

function handleLobbyLeave() {
  triggerLeaveFlow();
}

function handleLiveLeave() {
  triggerLeaveFlow();
}

function triggerLeaveFlow() {
  const isHost = sessionData.hostId === currentUser.uid;
  const otherEntries = Object.entries(sessionData.participants || {})
    .filter(([uid]) => uid !== currentUser.uid);

  if (isHost) {
    if (otherEntries.length === 0) {
      hostLeaveAloneModal.hidden = false;
    } else {
      // Show warning with successor name
      const sorted = otherEntries.sort(
        (a, b) => (a[1].joinedAt?.toMillis?.() || 0) - (b[1].joinedAt?.toMillis?.() || 0)
      );
      const successor = sorted[0][1];
      newHostName.textContent = successor.name || "the next participant";
      hostLeaveModal.hidden = false;
    }
  } else {
    // Regular participant leaves directly
    leaveSession();
  }
}

function openKickModal(targetUid, targetName) {
  pendingKickTarget = targetUid;
  kickTargetName.textContent = targetName || "this participant";
  kickModal.hidden = false;
}

function openEndModal() {
  endModal.hidden = false;
}

function toggleSidebar() {
  liveSidebar.classList.toggle("open");
}

// ══════════════════════════════════════════════════════════
// CLEANUP
// ══════════════════════════════════════════════════════════
function cleanup() {
  if (unsubscribeListener) { unsubscribeListener(); unsubscribeListener = null; }
  stopAllTimers();

  // 🎥 Phase 9 — Tear down Daily call on page unload
  if (isCallActive()) {
    leaveDailyCall().catch(() => {});
  }
}
// ══════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════
function formatCountdown(ms) {
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (days > 0) return `${days}d ${String(hours).padStart(2, "0")}h`;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatMMSS(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDateTimeReadable(date) {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
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

function escapeAttr(str) {
  return escapeHtml(str);
}