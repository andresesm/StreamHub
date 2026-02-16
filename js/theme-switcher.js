(function () {
  const ROOT = document.documentElement;
  const STORAGE_KEY = "vsd-theme-mode"; // "auto" | "day" | "night"
  const THEME_ATTR = "data-theme";
  const TOGGLE_BTN = document.getElementById("themeToggleBtn");
  const LABEL_SPAN = TOGGLE_BTN ? TOGGLE_BTN.querySelector(".theme-label") : null;

  function getLocalHour() {
    const now = new Date();
    return now.getHours();
  }

  function computeAutoTheme() {
    const hour = getLocalHour();
    return hour >= 6 && hour < 18 ? "day" : "night";
  }

  function applyTheme(theme) {
    ROOT.setAttribute(THEME_ATTR, theme);
  }

  function readStoredMode() {
    try {
      return localStorage.getItem(STORAGE_KEY) || "auto";
    } catch {
      return "auto";
    }
  }

  function storeMode(mode) {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }

  function updateLabel(mode) {
    if (!LABEL_SPAN) return;
    if (mode === "auto") LABEL_SPAN.textContent = "Auto";
    else if (mode === "day") LABEL_SPAN.textContent = "Día";
    else LABEL_SPAN.textContent = "Noche";
  }

  function syncCurrentTheme() {
    const mode = readStoredMode();
    if (mode === "auto") {
      applyTheme(computeAutoTheme());
    } else {
      applyTheme(mode);
    }
    updateLabel(mode);
  }

  function toggleMode() {
    const current = readStoredMode();
    const next = current === "auto" ? "day" : current === "day" ? "night" : "auto";
    storeMode(next);
    syncCurrentTheme();
  }

  document.addEventListener("DOMContentLoaded", function () {
    syncCurrentTheme();
    if (TOGGLE_BTN) {
      TOGGLE_BTN.addEventListener("click", toggleMode);
    }
  });

  window.VSDTheme = {
    sync: syncCurrentTheme
  };
})();
