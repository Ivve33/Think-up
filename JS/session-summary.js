const toggleTranscriptBtn = document.getElementById("toggleTranscriptBtn");
const transcriptBox = document.getElementById("transcriptBox");

const shareSummaryBtn = document.getElementById("shareSummaryBtn");
const shareModal = document.getElementById("shareModal");
const closeShareModalBtn = document.getElementById("closeShareModalBtn");
const closeShareBtn2 = document.getElementById("closeShareBtn2");
const copyShareLinkBtn = document.getElementById("copyShareLinkBtn");
const shareLinkBox = document.getElementById("shareLinkBox");

const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const rewatchBtn = document.getElementById("rewatchBtn");

const ratingWrap = document.getElementById("ratingWrap");
const starButtons = document.querySelectorAll(".star-btn");
const ratingStatus = document.getElementById("ratingStatus");

const params = new URLSearchParams(window.location.search);
const sessionId = params.get("id") || "session-demo-001";

init();

function init() {
  shareLinkBox.textContent = `https://think-up.app/session-summary.html?id=${sessionId}`;
  bindTranscript();
  bindShareModal();
  bindActions();
  bindRating();
}

function bindTranscript() {
  toggleTranscriptBtn.addEventListener("click", () => {
    transcriptBox.classList.toggle("hidden");
    toggleTranscriptBtn.textContent = transcriptBox.classList.contains("hidden")
      ? "Show Transcript"
      : "Hide Transcript";
  });
}

function bindShareModal() {
  shareSummaryBtn.addEventListener("click", () => {
    shareModal.classList.remove("hidden");
  });

  closeShareModalBtn.addEventListener("click", closeShareModal);
  closeShareBtn2.addEventListener("click", closeShareModal);

  shareModal.addEventListener("click", (e) => {
    if (e.target === shareModal) closeShareModal();
  });

  copyShareLinkBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(shareLinkBox.textContent.trim()).then(() => {
      copyShareLinkBtn.textContent = "Copied";
      setTimeout(() => {
        copyShareLinkBtn.textContent = "Copy Link";
      }, 1200);
    });
  });
}

function bindActions() {
  downloadPdfBtn.addEventListener("click", () => {
    alert("This will later generate/download the PDF summary.");
  });

  rewatchBtn.addEventListener("click", () => {
    alert("This will later open the saved recording from Firebase Storage.");
  });
}

function bindRating() {
  starButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = Number(button.dataset.value);

      starButtons.forEach((star) => {
        const starValue = Number(star.dataset.value);
        star.classList.toggle("active", starValue <= value);
      });

      ratingStatus.textContent = `${value} / 5 selected`;
    });
  });
}

function closeShareModal() {
  shareModal.classList.add("hidden");
}