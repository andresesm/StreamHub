(function () {
  const STORAGE_KEY = "vsd_theme_mode"; // "auto" | "day" | "night"
  const html = document.documentElement;

  const btn = document.getElementById("floatingThemeToggle");
  if (!btn) return;

  let iconSpan = btn.querySelector(".floating-theme-icon");
  if (!iconSpan) {
    iconSpan = document.createElement("span");
    iconSpan.className = "floating-theme-icon";
    btn.appendChild(iconSpan);
  }

  let badgeSpan = btn.querySelector(".floating-theme-badge");
  if (!badgeSpan) {
    badgeSpan = document.createElement("span");
    badgeSpan.className = "floating-theme-badge";
    badgeSpan.textContent = "A.";
    btn.appendChild(badgeSpan);
  }

  const mediaDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");

  function getSystemTheme() {
    if (!mediaDark) return "day";
    return mediaDark.matches ? "night" : "day";
  }

  function setButtonUI(mode, effectiveTheme) {
    // Icono según tema efectivo
    iconSpan.textContent = effectiveTheme === "night" ? "☾" : "☀";

    // Badge visible solo en AUTO
    const isAuto = mode === "auto";
    badgeSpan.style.display = isAuto ? "inline-flex" : "none";
    badgeSpan.textContent = "A."; // si prefieres solo "A", cambia esto a "A"
  }

  function applyMode(mode) {
    const effectiveTheme = mode === "auto" ? getSystemTheme() : mode;

    html.setAttribute("data-theme", effectiveTheme);
    btn.setAttribute("aria-label", mode === "auto" ? "Tema automático" : `Tema ${effectiveTheme}`);

    setButtonUI(mode, effectiveTheme);
  }

  function getSavedMode() {
    const saved = (localStorage.getItem(STORAGE_KEY) || "").toLowerCase();
    if (saved === "day" || saved === "night" || saved === "auto") return saved;
    return "auto";
  }

  function saveMode(mode) {
    localStorage.setItem(STORAGE_KEY, mode);
  }

  function nextMode(mode) {
    if (mode === "auto") return "day";
    if (mode === "day") return "night";
    return "auto";
  }

  let mode = getSavedMode();
  applyMode(mode);

  btn.addEventListener("click", function () {
    mode = nextMode(mode);
    saveMode(mode);
    applyMode(mode);
  });

  if (mediaDark && typeof mediaDark.addEventListener === "function") {
    mediaDark.addEventListener("change", function () {
      if (mode === "auto") applyMode("auto");
    });
  }
})();