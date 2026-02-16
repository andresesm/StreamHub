(function () {
  const ROOT = document.documentElement;
  const STORAGE_KEY = "vsd-theme-mode"; // "auto" | "day" | "night"
  const THEME_ATTR = "data-theme";

  const INLINE_TOGGLE_BTN = document.getElementById("themeToggleBtn");
  const INLINE_LABEL = INLINE_TOGGLE_BTN ? INLINE_TOGGLE_BTN.querySelector(".theme-label") : null;

  const FLOATING_TOGGLE = document.getElementById("floatingThemeToggle");
  const FLOATING_ICON = FLOATING_TOGGLE ? FLOATING_TOGGLE.querySelector(".floating-theme-icon") : null;

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

  function updateInlineLabel(mode) {
    if (!INLINE_LABEL) return;
    if (mode === "auto") INLINE_LABEL.textContent = "Auto";
    else if (mode === "day") INLINE_LABEL.textContent = "Día";
    else INLINE_LABEL.textContent = "Noche";
  }

  function updateFloatingIcon(mode, effectiveTheme) {
    if (!FLOATING_ICON) return;
    if (mode === "auto") {
      FLOATING_ICON.textContent = effectiveTheme === "day" ? "☀" : "☾";
    } else if (mode === "day") {
      FLOATING_ICON.textContent = "☀";
    } else {
      FLOATING_ICON.textContent = "☾";
    }
  }

  function syncCurrentTheme() {
    const mode = readStoredMode();
    let effective = mode;
    if (mode === "auto") {
      effective = computeAutoTheme();
    }
    applyTheme(effective);
    updateInlineLabel(mode);
    updateFloatingIcon(mode, effective);
  }

  function nextMode(current) {
    return current === "auto" ? "day" : current === "day" ? "night" : "auto";
  }

  function toggleMode() {
    const current = readStoredMode();
    const next = nextMode(current);
    storeMode(next);
    syncCurrentTheme();
  }

  document.addEventListener("DOMContentLoaded", function () {
    syncCurrentTheme();
    if (INLINE_TOGGLE_BTN) {
      INLINE_TOGGLE_BTN.addEventListener("click", toggleMode);
    }
    if (FLOATING_TOGGLE) {
      FLOATING_TOGGLE.addEventListener("click", toggleMode);
    }
  });

  window.VSDTheme = {
    sync: syncCurrentTheme
  };
})();
