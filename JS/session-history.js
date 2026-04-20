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

let activeTab = "upcoming";
let pendingAction = null;

const sessions = [
  {
    id: "s1",
    courseName: "Java Programming",
    courseCode: "CCCS 211",
    dateISO: "2026-04-22T14:00:00",
    duration: 60,
    hostName: "Osama Alghamdi",
    isHost: true,
    status: "Upcoming",
    bucket: "upcoming",
    note: "Public review session before the weekly lab."
  },
  {
    id: "s2",
    courseName: "Database Systems",
    courseCode: "CCCS 305",
    dateISO: "2026-04-24T18:30:00",
    duration: 90,
    hostName: "Faisal Ahmed",
    isHost: false,
    status: "Upcoming",
    bucket: "upcoming",
    note: "Discussion on SQL joins and query practice."
  },
  {
    id: "s3",
    courseName: "Software Engineering",
    courseCode: "SWE 321",
    dateISO: "2026-04-18T16:00:00",
    duration: 60,
    hostName: "Osama Alghamdi",
    isHost: true,
    status: "Completed",
    bucket: "past",
    note: "Team study session focused on design principles."
  },
  {
    id: "s4",
    courseName: "Computer Networks",
    courseCode: "CCCS 371",
    dateISO: "2026-04-12T13:00:00",
    duration: 120,
    hostName: "Amir Khaled",
    isHost: false,
    status: "Completed",
    bucket: "past",
    note: "Solved protocol and routing practice problems."
  },
  {
    id: "s5",
    courseName: "Java Programming",
    courseCode: "CCCS 211",
    dateISO: "2026-04-26T20:00:00",
    duration: 60,
    hostName: "Osama Alghamdi",
    isHost: true,
    status: "Upcoming",
    bucket: "hosted",
    note: "Hosted session for object-oriented programming review."
  },
  {
    id: "s6",
    courseName: "Web Development",
    courseCode: "CCCS 410",
    dateISO: "2026-04-10T15:00:00",
    duration: 60,
    hostName: "Osama Alghamdi",
    isHost: true,
    status: "Cancelled",
    bucket: "hosted",
    note: "Cancelled due to scheduling conflict."
  }
];

init();

function init() {
  updateStats();
  bindTabs();
  bindFilters();
  bindModal();
  renderSessions();
}

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

function updateStats() {
  const totalSessions = sessions.length;
  const totalHours = sessions.reduce((sum, item) => sum + (item.duration / 60), 0);
  const upcomingCount = sessions.filter((s) => s.bucket === "upcoming").length;
  const hostedCount = sessions.filter((s) => s.isHost).length;

  totalSessionsStat.textContent = totalSessions;
  hoursStudiedStat.textContent = totalHours.toFixed(1);
  upcomingCountStat.textContent = upcomingCount;
  hostedCountStat.textContent = hostedCount;
}

function renderSessions() {
  const searchValue = courseSearch.value.trim().toLowerCase();
  const orderValue = sortOrder.value;

  let filtered = sessions.filter((session) => {
    if (activeTab === "hosted") {
      if (!session.isHost) return false;
    } else if (session.bucket !== activeTab) {
      return false;
    }

    const matchesSearch =
      session.courseName.toLowerCase().includes(searchValue) ||
      session.courseCode.toLowerCase().includes(searchValue);

    return matchesSearch;
  });

  filtered.sort((a, b) => {
    const aTime = new Date(a.dateISO).getTime();
    const bTime = new Date(b.dateISO).getTime();
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
              <h3>${session.courseName}</h3>
              <div class="course-code">${formatDateTime(session.dateISO)}</div>
            </div>
          </div>

          <div class="status-badge ${getStatusClass(session.status)}">${session.status}</div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <span>Date & Time</span>
            <b>${formatDateTime(session.dateISO)}</b>
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
        <div class="session-note">${session.note}</div>
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
  if (session.status === "Upcoming" && !session.isHost) {
    return `
      <button class="small-btn primary action-btn" data-action="openLobby" data-id="${session.id}">
        Open Lobby
      </button>
      <button class="small-btn danger action-btn" data-action="leave" data-id="${session.id}">
        Leave
      </button>
    `;
  }

  if (session.status === "Completed") {
    return `
      <button class="small-btn primary action-btn" data-action="viewSummary" data-id="${session.id}">
        View Summary
      </button>
    `;
  }

  if (session.isHost && session.status === "Upcoming") {
    return `
      <button class="small-btn action-btn" data-action="edit" data-id="${session.id}">
        Edit
      </button>
      <button class="small-btn danger action-btn" data-action="cancel" data-id="${session.id}">
        Cancel
      </button>
    `;
  }

  if (session.status === "Cancelled") {
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
        openModal("Open Lobby", "Go to the session lobby for this upcoming study room.", "Upcoming Session");
      } else if (action === "viewSummary") {
        openModal("View Summary", "Open the AI summary for this completed session.", "Completed Session");
      } else if (action === "leave") {
        openModal("Leave Session", "This would remove you from the selected upcoming session.", "Participant Action");
      } else if (action === "edit") {
        openModal("Edit Session", "This would open the hosted session editor.", "Host Action");
      } else if (action === "cancel") {
        openModal("Cancel Session", "This would cancel your hosted upcoming session.", "Host Action");
      } else {
        openModal("Session Details", "This is a UI preview action for the selected session.", "Preview");
      }
    });
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

function getStatusClass(status) {
  if (status === "Upcoming") return "status-upcoming";
  if (status === "Completed") return "status-completed";
  if (status === "Cancelled") return "status-cancelled";
  return "";
}

function getCourseIcon(code) {
  if (code.includes("211")) return "☕";
  if (code.includes("305")) return "🗄️";
  if (code.includes("321")) return "🧩";
  if (code.includes("371")) return "🌐";
  if (code.includes("410")) return "💻";
  return "📘";
}

function formatDateTime(dateISO) {
  const date = new Date(dateISO);

  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}   