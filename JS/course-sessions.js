const dayButtons = document.querySelectorAll(".day-btn");
const selectedDayTitle = document.getElementById("selectedDayTitle");
const currentTimeLabel = document.getElementById("currentTimeLabel");
const timelineGrid = document.getElementById("timelineGrid");
const upcomingOnlyToggle = document.getElementById("upcomingOnlyToggle");
const timeRows = document.querySelectorAll(".time-row");
const nowIndicator = document.getElementById("nowIndicator");

const sessionModal = document.getElementById("sessionModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const closeModalBtn2 = document.getElementById("closeModalBtn2");
const sessionTriggers = document.querySelectorAll(".session-trigger");

const modalTitle = document.getElementById("modalTitle");
const modalTime = document.getElementById("modalTime");
const modalHost = document.getElementById("modalHost");
const modalSeats = document.getElementById("modalSeats");
const modalStatus = document.getElementById("modalStatus");
const modalType = document.getElementById("modalType");

const orderedDays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const labelMap = {
  sat: "Sat",
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri"
};

const now = new Date();
const currentHour = now.getHours();
const currentMinutes = now.getMinutes();
const currentDayKey = orderedDays[now.getDay()];

init();

function init() {
  activateCurrentDay();
  updateSelectedDayTitle();
  updateCurrentTimeLabel();
  markPastHours();
  applyUpcomingFilter();
  positionNowIndicator();
  bindDayButtons();
  bindModal();
}

function activateCurrentDay() {
  dayButtons.forEach((btn) => {
    if (btn.dataset.day === currentDayKey) {
      btn.classList.add("active");
    }
  });
}

function bindDayButtons() {
  dayButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      dayButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      updateSelectedDayTitle();
      applyUpcomingFilter();
      positionNowIndicator();

      // لو تبغى إعادة تحميل حقيقية لليوم:
      // window.location.href = `course-sessions.html?day=${btn.dataset.day}`;
    });
  });

  upcomingOnlyToggle.addEventListener("change", () => {
    applyUpcomingFilter();
    positionNowIndicator();
  });
}

function bindModal() {
  sessionTriggers.forEach((btn) => {
    btn.addEventListener("click", () => {
      modalTitle.textContent = btn.dataset.title;
      modalTime.textContent = btn.dataset.time;
      modalHost.textContent = btn.dataset.host;
      modalSeats.textContent = btn.dataset.seats;
      modalStatus.textContent = btn.dataset.status;
      modalType.textContent = btn.dataset.type;

      sessionModal.classList.remove("hidden");
    });
  });

  closeModalBtn.addEventListener("click", closeModal);
  closeModalBtn2.addEventListener("click", closeModal);

  sessionModal.addEventListener("click", (e) => {
    if (e.target === sessionModal) closeModal();
  });
}

function closeModal() {
  sessionModal.classList.add("hidden");
}

function updateSelectedDayTitle() {
  const activeBtn = document.querySelector(".day-btn.active");
  if (!activeBtn) return;

  const activeKey = activeBtn.dataset.day;
  const activeLabel = labelMap[activeKey];

  if (activeKey === currentDayKey) {
    selectedDayTitle.textContent = "Today's Sessions";
  } else {
    selectedDayTitle.textContent = `${activeLabel} Sessions`;
  }
}

function updateCurrentTimeLabel() {
  let hour = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  let period = "AM";

  if (hour === 0) {
    hour = 12;
  } else if (hour === 12) {
    period = "PM";
  } else if (hour > 12) {
    hour -= 12;
    period = "PM";
  }

  currentTimeLabel.textContent = `Now: ${hour}:${minutes} ${period}`;
}

function markPastHours() {
  timeRows.forEach((row) => {
    const rowHour = Number(row.dataset.hour);

    if (rowHour < currentHour && currentDayIsSelected()) {
      row.classList.add("past");
    } else {
      row.classList.remove("past");
    }
  });
}

function applyUpcomingFilter() {
  const showUpcomingOnly = upcomingOnlyToggle.checked;

  timeRows.forEach((row) => {
    const rowHour = Number(row.dataset.hour);
    row.classList.remove("hidden-row");

    if (showUpcomingOnly && currentDayIsSelected() && rowHour < currentHour) {
      row.classList.add("hidden-row");
    }
  });

  markPastHours();
}

function currentDayIsSelected() {
  const activeBtn = document.querySelector(".day-btn.active");
  return activeBtn && activeBtn.dataset.day === currentDayKey;
}

function positionNowIndicator() {
  if (!currentDayIsSelected() || upcomingOnlyToggle.checked) {
    nowIndicator.style.display = "none";
    return;
  }

  const currentRow = document.querySelector(`.time-row[data-hour="${currentHour}"]`);

  if (!currentRow) {
    nowIndicator.style.display = "none";
    return;
  }

  const slot = currentRow.querySelector(".time-slot");
  const gridRect = timelineGrid.getBoundingClientRect();
  const slotRect = slot.getBoundingClientRect();
  const rowRect = currentRow.getBoundingClientRect();

  const progress = currentMinutes / 60;
  const topOffset = (rowRect.top - gridRect.top) + (slotRect.height * progress);

  nowIndicator.style.display = "block";
  nowIndicator.style.top = `${topOffset}px`;
}