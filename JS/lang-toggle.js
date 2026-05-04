(function () {
  function loadArabicTranslator() {
    if (localStorage.getItem("thinkup-lang") !== "ar") return;

    var script = document.createElement("script");
    script.src = "../JS/i18n-ar.js";
    document.head.appendChild(script);
  }

  function setupLanguageToggle() {
    var switcher = document.querySelector("[data-lang-switch='true']");
    if (!switcher) return;

    switcher.textContent = localStorage.getItem("thinkup-lang") === "ar" ? "English" : "العربية";

    switcher.addEventListener(
      "click",
      function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();

        var currentLang = localStorage.getItem("thinkup-lang") === "ar" ? "ar" : "en";
        localStorage.setItem("thinkup-lang", currentLang === "ar" ? "en" : "ar");
        location.reload();
      },
      true
    );
  }

  loadArabicTranslator();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupLanguageToggle, { once: true });
  } else {
    setupLanguageToggle();
  }
})();
