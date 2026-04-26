/**
 * Think-Up Cloud Functions
 * Phase 9 — Daily.co Integration
 *
 * Functions:
 *   - healthCheck      (test, will be removed later)
 *   - createDailyRoom  (host starts session → creates Daily room + recording)
 *   - getDailyToken    (any participant → gets a Daily token with role-based perms)
 *   - endDailyRoom     (host ends session → stops recording, saves URL, deletes room)
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

// Daily API key from Secret Manager
const DAILY_API_KEY = defineSecret("DAILY_API_KEY");

// Daily REST API base URL
const DAILY_API_URL = "https://api.daily.co/v1";

// Common config for all functions
const FUNCTION_CONFIG = {
  secrets: [DAILY_API_KEY],
  region: "us-central1",
  cors: true,
};

// ════════════════════════════════════════════════════════════
// 🩺 HEALTH CHECK (kept for testing; remove after Phase 9 ships)
// ════════════════════════════════════════════════════════════
exports.healthCheck = onCall(FUNCTION_CONFIG, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const apiKey = DAILY_API_KEY.value();
  if (!apiKey || apiKey.length < 10) {
    throw new HttpsError("internal", "API key not configured.");
  }

  return {
    success: true,
    message: "Cloud Functions are working!",
    timestamp: new Date().toISOString(),
    keyPreview: apiKey.substring(0, 4) + "...",
    uid: request.auth.uid,
  };
});

// ════════════════════════════════════════════════════════════
// 🎥 CREATE DAILY ROOM
// Called when host starts the session.
// ════════════════════════════════════════════════════════════
exports.createDailyRoom = onCall(FUNCTION_CONFIG, async (request) => {
  // 1. Auth check
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const { sessionId } = request.data || {};
  if (!sessionId) {
    throw new HttpsError("invalid-argument", "sessionId is required.");
  }

  const userId = request.auth.uid;
  const sessionRef = admin.firestore().doc(`sessions/${sessionId}`);

  // 2. Load session
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    throw new HttpsError("not-found", "Session does not exist.");
  }
  const sessionData = sessionSnap.data();

  // 3. Authorization: only the host can start
  if (sessionData.hostId !== userId) {
    throw new HttpsError("permission-denied", "Only the host can start the session.");
  }

  // 4. Idempotency: if room already exists, return it (avoid duplicate Daily rooms)
  if (sessionData.dailyRoomUrl) {
    logger.info(`Session ${sessionId} already has a Daily room.`);
    return {
      success: true,
      url: sessionData.dailyRoomUrl,
      name: sessionData.dailyRoomName,
      reused: true,
    };
  }
// 5. Build room properties
  const apiKey = DAILY_API_KEY.value();
  const expirationSeconds = Math.floor(Date.now() / 1000) + (3 * 60 * 60); // 3 hours
  const maxParticipants = sessionData.maxParticipants || 5;

  // Daily room name: "thinkup-{sessionId}" (lowercase, alphanumeric + hyphens only)
  const roomName = `thinkup-${sessionId}`.toLowerCase().replace(/[^a-z0-9-]/g, "");

  // Note: removed enable_recording/enable_chat — they may not be available
  //       on the Daily plan tier. Add them back later when needed.
const roomConfig = {
    name: roomName,
    privacy: "public", // Tokens are still required to join
    properties: {
      exp: expirationSeconds,
      enable_screenshare: true,
      enable_knocking: false,
      max_participants: maxParticipants,
      start_video_off: true,    // 📹 camera off by default
      start_audio_off: false,   // 🎤 mic on by default
    },
  };
  logger.info(`Creating Daily room with config:`, roomConfig);
  // 6. Call Daily API
  let dailyResponse;
  try {
    const response = await fetch(`${DAILY_API_URL}/rooms`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(roomConfig),
    });

    dailyResponse = await response.json();

    if (!response.ok) {
      // 🔍 Log the FULL response from Daily for debugging
      logger.error("Daily API rejected the request:", {
        status: response.status,
        body: dailyResponse,
        sentConfig: roomConfig,
      });

      // If room already exists on Daily side, recover gracefully
      if (dailyResponse.error === "invalid-request-error" &&
          dailyResponse.info?.includes("already exists")) {
        logger.warn(`Daily room ${roomName} already exists, fetching it.`);
        const getResp = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
          headers: { "Authorization": `Bearer ${apiKey}` },
        });
        dailyResponse = await getResp.json();
        if (!getResp.ok) {
          throw new Error(dailyResponse.error || "Failed to fetch existing room.");
        }
      } else {
        // Build a more detailed error message
        const detailedMsg = dailyResponse.info ||
                            dailyResponse.error ||
                            `HTTP ${response.status}`;
        throw new Error(`Daily API error: ${detailedMsg}`);
      }
    }
  } catch (err) {
    logger.error("Daily room creation failed:", err);
    throw new HttpsError("internal", `Daily room creation failed: ${err.message}`);
  }

  // 7. Save to Firestore
  // Note: We do NOT update status/startedAt here — that's the frontend's job
  //       (keeps a single source of truth for state transitions)
  await sessionRef.update({
    dailyRoomUrl: dailyResponse.url,
    dailyRoomName: dailyResponse.name,
  });

  logger.info(`Created Daily room ${dailyResponse.name} for session ${sessionId}`);

  return {
    success: true,
    url: dailyResponse.url,
    name: dailyResponse.name,
    reused: false,
  };
});

// ════════════════════════════════════════════════════════════
// 🎫 GET DAILY TOKEN
// Called by any participant before joining the Daily call.
// Returns a meeting token with role-based permissions.
// ════════════════════════════════════════════════════════════
exports.getDailyToken = onCall(FUNCTION_CONFIG, async (request) => {
  // 1. Auth check
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const { sessionId } = request.data || {};
  if (!sessionId) {
    throw new HttpsError("invalid-argument", "sessionId is required.");
  }

  const userId = request.auth.uid;
  const sessionRef = admin.firestore().doc(`sessions/${sessionId}`);

  // 2. Load session
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    throw new HttpsError("not-found", "Session does not exist.");
  }
  const sessionData = sessionSnap.data();

  // 3. Authorization: must be a participant
  const participantIds = sessionData.participantIds || [];
  if (!participantIds.includes(userId)) {
    throw new HttpsError("permission-denied", "You are not a participant in this session.");
  }

  // 4. Room must exist (host must have started)
  if (!sessionData.dailyRoomName) {
    throw new HttpsError("failed-precondition", "Session has not started yet.");
  }

  // 5. Determine role
  const isHost = sessionData.hostId === userId;
  const userInfo = sessionData.participants?.[userId] || {};
  const userName = userInfo.name || request.auth.token.name || "Student";

// 6. Build token config
  const apiKey = DAILY_API_KEY.value();
  const tokenConfig = {
    properties: {
      room_name: sessionData.dailyRoomName,
      user_id: userId,
      user_name: userName,
      is_owner: isHost,
      // Removed enable_recording — not on free tier
      exp: Math.floor(Date.now() / 1000) + (3 * 60 * 60),
      start_video_off: true,        // 📹 camera off by default
      start_audio_off: false,       // 🎤 mic on by default
      enable_prejoin_ui: false,     // ⭐ skip "Are you ready?" screen
    },
  };
  // 7. Request token from Daily
  try {
    const response = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tokenConfig),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.info || "Daily token API error.");
    }

    return {
      success: true,
      token: data.token,
      roomUrl: sessionData.dailyRoomUrl,
      isHost: isHost,
    };
  } catch (err) {
    logger.error("Daily token creation failed:", err);
    throw new HttpsError("internal", `Token creation failed: ${err.message}`);
  }
});

// ════════════════════════════════════════════════════════════
// 🛑 END DAILY ROOM
// Called when host ends the session.
// Fetches the recording URL, then deletes the Daily room.
// ════════════════════════════════════════════════════════════
exports.endDailyRoom = onCall(FUNCTION_CONFIG, async (request) => {
  // 1. Auth check
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const { sessionId } = request.data || {};
  if (!sessionId) {
    throw new HttpsError("invalid-argument", "sessionId is required.");
  }

  const userId = request.auth.uid;
  const sessionRef = admin.firestore().doc(`sessions/${sessionId}`);

  // 2. Load session
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    throw new HttpsError("not-found", "Session does not exist.");
  }
  const sessionData = sessionSnap.data();

  // 3. Authorization: only host can end
  if (sessionData.hostId !== userId) {
    throw new HttpsError("permission-denied", "Only the host can end the session.");
  }

  // 4. If no Daily room (session never went live with video), nothing to clean up
  if (!sessionData.dailyRoomName) {
    logger.info(`Session ${sessionId} has no Daily room — nothing to end.`);
    return { success: true, recordingUrl: null, skipped: true };
  }

  const apiKey = DAILY_API_KEY.value();
  let recordingUrl = null;

  // 5. Fetch the latest recording for this room (best-effort)
  try {
    const recResp = await fetch(
      `${DAILY_API_URL}/recordings?room_name=${encodeURIComponent(sessionData.dailyRoomName)}&limit=1`,
      { headers: { "Authorization": `Bearer ${apiKey}` } }
    );
    const recData = await recResp.json();

    if (recResp.ok && recData.data && recData.data.length > 0) {
      const recording = recData.data[0];
      // Get a download link (valid for 1 hour by default)
      const linkResp = await fetch(
        `${DAILY_API_URL}/recordings/${recording.id}/access-link`,
        { headers: { "Authorization": `Bearer ${apiKey}` } }
      );
      const linkData = await linkResp.json();
      if (linkResp.ok && linkData.download_link) {
        recordingUrl = linkData.download_link;
      }
    }
  } catch (err) {
    logger.warn(`Could not fetch recording for ${sessionData.dailyRoomName}:`, err);
    // Non-fatal — we'll continue and end the session anyway
  }

  // 6. Delete the Daily room (cleanup)
  try {
    await fetch(
      `${DAILY_API_URL}/rooms/${sessionData.dailyRoomName}`,
      {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${apiKey}` },
      }
    );
  } catch (err) {
    logger.warn(`Could not delete Daily room ${sessionData.dailyRoomName}:`, err);
    // Non-fatal — Daily auto-expires unused rooms
  }

  // 7. Save recording URL to Firestore (frontend will set status/endedAt separately)
  if (recordingUrl) {
    await sessionRef.update({
      recordingUrl: recordingUrl,
    });
  }

  logger.info(`Ended Daily room for session ${sessionId}. Recording: ${!!recordingUrl}`);

  return {
    success: true,
    recordingUrl: recordingUrl,
    skipped: false,
  };
});