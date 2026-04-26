// ══════════════════════════════════════════════════════════
// Session Room — Daily.co Video Integration
// Phase 9
// ══════════════════════════════════════════════════════════
//
// This module wraps the Daily.co Prebuilt SDK and exposes a
// clean API to session-room.js. It does NOT touch Firestore,
// Auth, or any business logic — it only manages the call.
//
// Defaults: 🎤 mic ON, 📹 camera OFF (study session priorities)
// User can turn camera on later via the Camera button.
//
// Public API:
//   initDailyCall(roomUrl, userName, token, onError)
//   toggleMic()
//   toggleCamera()
//   toggleScreenShare()
//   leaveDailyCall()
//   isCallActive()
// ══════════════════════════════════════════════════════════

let callFrame = null;
let isJoined = false;
let isMicOn = true;       // mic ON by default
let isCameraOn = false;   // 📹 camera OFF by default — user can turn it on
let isSharing = false;

// DOM refs (cached on first call)
let frameContainer = null;
let loader = null;
let micBtn = null;
let cameraBtn = null;
let shareBtn = null;
let recIndicator = null;

// Callbacks injected from session-room.js
let externalErrorHandler = null;

// ══════════════════════════════════════════════════════════
// PUBLIC: Initialize Daily call
// ══════════════════════════════════════════════════════════
export async function initDailyCall(roomUrl, userName, token, onError) {
  console.log("[daily] initDailyCall called with:", {
    roomUrl,
    userName,
    tokenPreview: token ? token.substring(0, 20) + "..." : "MISSING",
  });

  if (callFrame) {
    console.warn("[daily] Call already initialized — skipping.");
    return;
  }

  if (typeof window.DailyIframe === "undefined") {
    const msg = "Daily SDK not loaded. Check the <script> tag.";
    console.error("[daily]", msg);
    if (onError) onError(msg);
    return;
  }

  // Cache DOM refs
  cacheDomRefs();
  externalErrorHandler = onError || null;

  if (!frameContainer) {
    const msg = "Daily frame container not found.";
    console.error("[daily]", msg);
    if (onError) onError(msg);
    return;
  }

  // Validate inputs
  if (!roomUrl) {
    const msg = "Room URL is missing. The session might not be properly started.";
    console.error("[daily]", msg);
    if (onError) onError(msg);
    return;
  }

  try {
    callFrame = window.DailyIframe.createFrame(frameContainer, {
      iframeStyle: {
        width: "100%",
        height: "100%",
        border: "0",
        borderRadius: "16px",
      },
      showLeaveButton: false,        // We have our own Leave button
      showFullscreenButton: true,
      showLocalVideo: true,
      showParticipantsBar: true,
    });

    // Wire up event listeners
    callFrame
      .on("joined-meeting", handleJoined)
      .on("participant-joined", handleParticipantChange)
      .on("participant-left", handleParticipantChange)
      .on("participant-updated", handleParticipantUpdate)
      .on("recording-started", handleRecordingStarted)
      .on("recording-stopped", handleRecordingStopped)
      .on("error", handleDailyError)
      .on("camera-error", handleCameraError);

    // Join the call
    // 🎤 Default: mic ON, camera OFF (study session — voice is the priority)
    console.log("[daily] Calling join with URL:", roomUrl);
    await callFrame.join({
      url: roomUrl,
      userName: userName || "Student",
      token: token || undefined,
      startVideoOff: true,    // 📹 camera OFF by default
      startAudioOff: false,   // 🎤 mic ON by default
    });
    console.log("[daily] join() resolved successfully.");
  } catch (err) {
    console.error("[daily] Failed to initialize call:", err);
    console.error("[daily] Error details:", {
      message: err?.message,
      errorMsg: err?.errorMsg,
      type: err?.type,
    });
    if (onError) onError(err?.message || err?.errorMsg || "Failed to start video call.");
    cleanupCallFrame();
  }
}

// ══════════════════════════════════════════════════════════
// PUBLIC: Toggle microphone
// ══════════════════════════════════════════════════════════
export function toggleMic() {
  if (!callFrame || !isJoined) return;
  const newState = !callFrame.localAudio();
  callFrame.setLocalAudio(newState);
  isMicOn = newState;
  updateMicButton();
}

// ══════════════════════════════════════════════════════════
// PUBLIC: Toggle camera
// ══════════════════════════════════════════════════════════
export function toggleCamera() {
  if (!callFrame || !isJoined) return;
  const newState = !callFrame.localVideo();
  callFrame.setLocalVideo(newState);
  isCameraOn = newState;
  updateCameraButton();
}

// ══════════════════════════════════════════════════════════
// PUBLIC: Toggle screen share
// ══════════════════════════════════════════════════════════
export async function toggleScreenShare() {
  if (!callFrame || !isJoined) return;
  try {
    if (isSharing) {
      callFrame.stopScreenShare();
      isSharing = false;
    } else {
      await callFrame.startScreenShare();
      isSharing = true;
    }
    updateShareButton();
  } catch (err) {
    console.warn("[daily] Screen share error:", err);
    // Likely user denied permission — silent fail is fine
    isSharing = false;
    updateShareButton();
  }
}

// ══════════════════════════════════════════════════════════
// PUBLIC: Leave the call (on user leave OR session end)
// ══════════════════════════════════════════════════════════
export async function leaveDailyCall() {
  if (!callFrame) return;
  try {
    if (isJoined) {
      await callFrame.leave();
    }
  } catch (err) {
    console.warn("[daily] Error during leave:", err);
  } finally {
    cleanupCallFrame();
  }
}

// ══════════════════════════════════════════════════════════
// PUBLIC: Status check
// ══════════════════════════════════════════════════════════
export function isCallActive() {
  return callFrame !== null && isJoined;
}

// ══════════════════════════════════════════════════════════
// INTERNAL: DOM caching
// ══════════════════════════════════════════════════════════
function cacheDomRefs() {
  frameContainer = document.getElementById("dailyFrame");
  loader         = document.getElementById("dailyFrameLoader");
  micBtn         = document.getElementById("micBtn");
  cameraBtn      = document.getElementById("cameraBtn");
  shareBtn       = document.getElementById("shareBtn");
  recIndicator   = document.getElementById("recIndicator");
}

// ══════════════════════════════════════════════════════════
// INTERNAL: Event handlers
// ══════════════════════════════════════════════════════════
function handleJoined(event) {
  isJoined = true;
  console.log("[daily] Joined meeting", event);

  // Hide loader
  if (loader) {
    loader.classList.add("hide");
    setTimeout(() => { loader.hidden = true; }, 320);
  }

  // Enable controls
  if (micBtn)    micBtn.disabled = false;
  if (cameraBtn) cameraBtn.disabled = false;
  if (shareBtn)  shareBtn.disabled = false;

  // Sync initial state from Daily
  isMicOn    = callFrame.localAudio();
  isCameraOn = callFrame.localVideo();
  updateMicButton();
  updateCameraButton();
  updateShareButton();
}

function handleParticipantChange(event) {
  // Daily Prebuilt updates its own UI — we just log
  console.log("[daily] Participant change:", event?.action || event);
}

function handleParticipantUpdate(event) {
  // Track local sharing state from Daily's truth
  const local = event?.participant;
  if (local && local.local) {
    isSharing = !!local.screen;
    updateShareButton();
  }
}

function handleRecordingStarted() {
  if (recIndicator) recIndicator.classList.add("recording");
}

function handleRecordingStopped() {
  if (recIndicator) recIndicator.classList.remove("recording");
}

function handleDailyError(event) {
  console.error("[daily] Error:", event);
  const msg = event?.errorMsg || event?.error?.msg || "Video service error.";
  if (externalErrorHandler) externalErrorHandler(msg);
}

function handleCameraError(event) {
  console.warn("[daily] Camera/mic permission error:", event);
  // Common case: user denied permission. Daily Prebuilt shows its own dialog.
}

// ══════════════════════════════════════════════════════════
// INTERNAL: Button visual state
// ══════════════════════════════════════════════════════════
function updateMicButton() {
  if (!micBtn) return;
  const icon  = document.getElementById("micIcon");
  const label = document.getElementById("micLabel");

  micBtn.setAttribute("aria-pressed", isMicOn ? "false" : "true");
  if (isMicOn) {
    micBtn.classList.remove("muted");
    micBtn.classList.add("active");
    if (icon)  icon.textContent  = "🎤";
    if (label) label.textContent = "Mic";
  } else {
    micBtn.classList.add("muted");
    micBtn.classList.remove("active");
    if (icon)  icon.textContent  = "🔇";
    if (label) label.textContent = "Muted";
  }
}

function updateCameraButton() {
  if (!cameraBtn) return;
  const icon  = document.getElementById("cameraIcon");
  const label = document.getElementById("cameraLabel");

  cameraBtn.setAttribute("aria-pressed", isCameraOn ? "false" : "true");
  if (isCameraOn) {
    cameraBtn.classList.remove("muted");
    cameraBtn.classList.add("active");
    if (icon)  icon.textContent  = "📹";
    if (label) label.textContent = "Camera";
  } else {
    cameraBtn.classList.add("muted");
    cameraBtn.classList.remove("active");
    if (icon)  icon.textContent  = "📵";
    if (label) label.textContent = "Off";
  }
}

function updateShareButton() {
  if (!shareBtn) return;
  shareBtn.setAttribute("aria-pressed", isSharing ? "true" : "false");
  if (isSharing) {
    shareBtn.classList.add("active");
  } else {
    shareBtn.classList.remove("active");
  }
}

// ══════════════════════════════════════════════════════════
// INTERNAL: Cleanup
// ══════════════════════════════════════════════════════════
function cleanupCallFrame() {
  if (callFrame) {
    try {
      callFrame.destroy();
    } catch (err) {
      console.warn("[daily] Destroy error:", err);
    }
    callFrame = null;
  }
  isJoined = false;
  isMicOn = true;
  isCameraOn = false;   // reset to default (camera off)
  isSharing = false;

  // Re-show loader for next mount (in case user re-enters)
  if (loader) {
    loader.classList.remove("hide");
    loader.hidden = false;
  }

  // Disable controls
  if (micBtn)    { micBtn.disabled = true; micBtn.classList.remove("active", "muted"); }
  if (cameraBtn) { cameraBtn.disabled = true; cameraBtn.classList.remove("active", "muted"); }
  if (shareBtn)  { shareBtn.disabled = true; shareBtn.classList.remove("active"); }
  if (recIndicator) recIndicator.classList.remove("recording");
}