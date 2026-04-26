import { auth, db } from "../Core/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  getDoc,
  runTransaction,
  Timestamp,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const loadingState = document.getElementById("loadingState");
const successState = document.getElementById("successState");
const errorState = document.getElementById("errorState");

const successSessionTitle = document.getElementById("successSessionTitle");
const errorIcon = document.getElementById("errorIcon");
const errorTitle = document.getElementById("errorTitle");
const errorMessage = document.getElementById("errorMessage");
const errorPrimaryBtn = document.getElementById("errorPrimaryBtn");
const errorSecondaryBtn = document.getElementById("errorSecondaryBtn");

const ERRORS = {
  missing_params: {
    icon: "?",
    title: "Invalid invite link",
    message: "This link is missing required information. Please ask the host for a new invite.",
    primaryBtn: { text: "Go to dashboard", href: "dashboard.html" },
    secondaryBtn: null
  },
  invalid_code: {
    icon: "✕",
    title: "Invalid invite link",
    message: "This invite link is incorrect or has expired. Please ask the host for a new one.",
    primaryBtn: { text: "Go to dashboard", href: "dashboard.html" },
    secondaryBtn: { text: "Browse courses", href: "explore.html" }
  },
  session_not_found: {
    icon: "?",
    title: "Session not found",
    message: "We couldn't find this session. It may have been deleted.",
    primaryBtn: { text: "Go to dashboard", href: "dashboard.html" },
    secondaryBtn: null
  },
  session_full: {
    icon: "⛔",
    title: "Session is full",
    message: "This session has reached its maximum number of participants.",
    primaryBtn: { text: "Go to dashboard", href: "dashboard.html" },
    secondaryBtn: { text: "Browse courses", href: "explore.html" }
  },
  session_ended: {
    icon: "✓",
    title: "This session has ended",
    message: "The session is over. You can view its summary if you were part of it.",
    primaryBtn: { text: "Go to dashboard", href: "dashboard.html" },
    secondaryBtn: null
  },
  session_cancelled: {
    icon: "✕",
    title: "Session cancelled",
    message: "The host cancelled this session before it started.",
    primaryBtn: { text: "Go to dashboard", href: "dashboard.html" },
    secondaryBtn: null
  },
  join_failed: {
    icon: "!",
    title: "Couldn't join",
    message: "Something went wrong while joining. Please try again.",
    primaryBtn: { text: "Go to dashboard", href: "dashboard.html" },
    secondaryBtn: null
  }
};

let currentUser = null;
let sessionId = null;
let inviteCode = null;

document.addEventListener("DOMContentLoaded", bootstrap);

function bootstrap() {
  const params = new URLSearchParams(window.location.search);
  sessionId = params.get("id");
  inviteCode = params.get("code");

  if (!sessionId || !inviteCode) {
    showError("missing_params");
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = `auth.html?redirect=${returnUrl}`;
      return;
    }

    currentUser = user;
    await processInvite();
  });
}

async function processInvite() {
  try {
    const sessionRef = doc(db, "sessions", sessionId);
    const snap = await getDoc(sessionRef);

    if (!snap.exists()) {
      showError("session_not_found");
      return;
    }

    const data = snap.data();

    if (data.inviteCode !== inviteCode) {
      showError("invalid_code");
      return;
    }

    if (data.status === "cancelled") {
      showError("session_cancelled");
      return;
    }

    if (data.status === "completed") {
      showError("session_ended");
      return;
    }

    const now = new Date();
    const endTime = data.endTime?.toDate?.();
    if (endTime && now > endTime) {
      showError("session_ended");
      return;
    }

    const participantIds = data.participantIds || [];
    if (participantIds.includes(currentUser.uid)) {
      redirectToSession(sessionId, data.title);
      return;
    }

    if (participantIds.length >= data.maxParticipants) {
      showError("session_full");
      return;
    }

    await joinSession(sessionRef, data);
    redirectToSession(sessionId, data.title);

  } catch (err) {
    console.error("Join flow failed:", err);
    showError("join_failed");
  }
}

async function joinSession(sessionRef, prevData) {
  await runTransaction(db, async (transaction) => {
    const fresh = await transaction.get(sessionRef);
    if (!fresh.exists()) throw new Error("Session disappeared");

    const data = fresh.data();
    const ids = data.participantIds || [];

    if (ids.includes(currentUser.uid)) return;

    if (ids.length >= data.maxParticipants) {
      throw new Error("full");
    }

    if (data.status === "cancelled" || data.status === "completed") {
      throw new Error("ended");
    }

    const userName =
      currentUser.displayName || currentUser.email || "Student";

    transaction.update(sessionRef, {
      participantIds: [...ids, currentUser.uid],
      [`participants.${currentUser.uid}`]: {
        name: userName,
        major: null,
        joinedAt: Timestamp.now()
      },
      participantCount: (data.participantCount || 0) + 1
    });
  });
}

function redirectToSession(id, title) {
  successSessionTitle.textContent = title || "session";
  loadingState.classList.add("hidden");
  errorState.classList.add("hidden");
  successState.classList.remove("hidden");

  setTimeout(() => {
    window.location.href = `session-room.html?id=${id}`;
  }, 1800);
}

function showError(type) {
  const config = ERRORS[type] || ERRORS.join_failed;

  errorIcon.textContent = config.icon;
  errorTitle.textContent = config.title;
  errorMessage.textContent = config.message;

  errorPrimaryBtn.textContent = config.primaryBtn.text;
  errorPrimaryBtn.href = config.primaryBtn.href;

  if (config.secondaryBtn) {
    errorSecondaryBtn.textContent = config.secondaryBtn.text;
    errorSecondaryBtn.href = config.secondaryBtn.href;
    errorSecondaryBtn.classList.remove("hidden");
  } else {
    errorSecondaryBtn.classList.add("hidden");
  }

  loadingState.classList.add("hidden");
  successState.classList.add("hidden");
  errorState.classList.remove("hidden");
}