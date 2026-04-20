const createSessionForm = document.getElementById("createSessionForm");
const sessionDateInput = document.getElementById("sessionDate");
const startTimeSelect = document.getElementById("startTime");
const maxParticipantsInput = document.getElementById("maxParticipants");
const participantsValue = document.getElementById("participantsValue");
const visibilityInput = document.getElementById("visibility");
const visibilityButtons = document.querySelectorAll(".visibility-btn");
const errorBox = document.getElementById("errorBox");
const statusPill = document.getElementById("statusPill");

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

const durationInputs = document.querySelectorAll('input[name="duration"]');

const userExistingSessions = [
  { date: "2026-04-21", start: "10:00", end: "11:00" },
  { date: "2026-04-21", start: "15:30", end: "17:00" }
];

init();

function init() {
  generateTimeOptions();
  setMinDate();
  hydrateFromQuery();
  updateParticipantsUI();
  updatePreview();
  bindEvents();
}

function bindEvents() {
  maxParticipantsInput.addEventListener("input", () => {
    updateParticipantsUI();
    updatePreview();
  });

  sessionDateInput.addEventListener("change", updatePreview);
  startTimeSelect.addEventListener("change", updatePreview);

  durationInputs.forEach((input) => {
    input.addEventListener("change", updatePreview);
  });

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
}

function generateTimeOptions() {
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
  sessionDateInput.min = formatDateInput(today);
  sessionDateInput.value = formatDateInput(today);
}

function hydrateFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const time = params.get("time");
  const day = params.get("day");

  if (time) {
    startTimeSelect.value = time;
  }

  if (day && !params.get("date")) {
    previewSubtitle.textContent = `Creating a session for ${capitalize(day)}.`;
  }
}

function updateParticipantsUI() {
  participantsValue.textContent = maxParticipantsInput.value;
}

function updatePreview() {
  const selectedDate = sessionDateInput.value;
  const selectedTime = startTimeSelect.value;
  const selectedDuration = getSelectedDuration();
  const selectedParticipants = maxParticipantsInput.value;
  const selectedVisibility = visibilityInput.value;

  previewVisibility.textContent = capitalize(selectedVisibility);
  previewParticipants.textContent = selectedParticipants;

  previewDate.textContent = selectedDate ? formatDateFriendly(selectedDate) : "—";
  previewTime.textContent = selectedTime ? formatTime24To12(selectedTime) : "—";
  previewDuration.textContent = selectedDuration ? `${selectedDuration} min` : "—";

  if (selectedVisibility === "public") {
    previewSubtitle.textContent = "This session will appear in the weekly course schedule.";
  } else {
    previewSubtitle.textContent = "This session will only be accessible through an invite link.";
  }
}

function handleCreateSession(e) {
  e.preventDefault();
  errorBox.classList.add("hidden");
  errorBox.textContent = "";

  const formData = new FormData(createSessionForm);
  const sessionDate = formData.get("sessionDate");
  const startTime = formData.get("startTime");
  const duration = formData.get("duration");
  const maxParticipants = formData.get("maxParticipants");
  const visibility = formData.get("visibility");
  const hostConsent = formData.get("hostConsent");

  if (!sessionDate || !startTime || !duration || !maxParticipants) {
    showError("Please complete all required fields before creating the session.");
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

  if (hasUserConflict(sessionDate, startTime, Number(duration))) {
    showError("This time conflicts with another session already created by the same user.");
    return;
  }

  statusPill.textContent = "Session created";
  statusPill.style.background = "rgba(31,143,95,0.10)";
  statusPill.style.borderColor = "rgba(31,143,95,0.25)";
  statusPill.style.color = "#1f8f5f";

  const sessionId = `session-${Date.now()}`;

  if (visibility === "public") {
    window.location.href = `session-room.html?id=${sessionId}`;
    return;
  }

  const inviteLink = `https://think-up.app/invite/${sessionId}`;
  inviteLinkBox.textContent = inviteLink;
  inviteModal.classList.remove("hidden");
}

function closeInviteModal() {
  inviteModal.classList.add("hidden");
}

function copyInviteLink() {
  const text = inviteLinkBox.textContent.trim();

  navigator.clipboard.writeText(text).then(() => {
    copyInviteBtn.textContent = "Copied";
    setTimeout(() => {
      copyInviteBtn.textContent = "Copy Link";
    }, 1200);
  });
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function getSelectedDuration() {
  const selected = document.querySelector('input[name="duration"]:checked');
  return selected ? selected.value : "";
}

function isBeforeNow(dateStr, timeStr) {
  const chosen = new Date(`${dateStr}T${timeStr}:00`);
  const now = new Date();
  return chosen < now;
}

function hasUserConflict(dateStr, startTime, durationMinutes) {
  const newStart = toMinutes(startTime);
  const newEnd = newStart + durationMinutes;

  return userExistingSessions.some((session) => {
    if (session.date !== dateStr) return false;

    const existingStart = toMinutes(session.start);
    const existingEnd = toMinutes(session.end);

    return newStart < existingEnd && newEnd > existingStart;
  });
}

function toMinutes(time24) {
  const [hours, minutes] = time24.split(":").map(Number);
  return (hours * 60) + minutes;
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