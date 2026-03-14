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

  function shouldUseNightThemeNow() {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes(); // hora local [0..1439]
    // Noche entre 18:00 y 07:30
    return mins >= (18 * 60) || mins < (7 * 60 + 30);
  }

  function setButtonUI(mode, effectiveTheme) {
    iconSpan.textContent = effectiveTheme === "night" ? "☾" : "☀";
    const isAuto = mode === "auto";
    badgeSpan.style.display = isAuto ? "inline-flex" : "none";
    badgeSpan.textContent = "A.";
  }

  let autoTimer = null;

  function stopAutoWatcher() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function applyMode(mode) {
    const effectiveTheme =
      mode === "auto"
        ? (shouldUseNightThemeNow() ? "night" : "day")
        : mode;

    html.setAttribute("data-theme", effectiveTheme);

    if (mode === "auto") btn.setAttribute("aria-label", "Tema automático (por horario)");
    else btn.setAttribute("aria-label", `Tema ${effectiveTheme}`);

    setButtonUI(mode, effectiveTheme);
  }

  function startAutoWatcher(currentModeRef) {
    stopAutoWatcher();
    applyMode("auto");

    // Re-evalúa cada minuto (suficiente para el cambio 07:30 / 18:00)
    autoTimer = setInterval(function () {
      if (currentModeRef.value === "auto") applyMode("auto");
    }, 60 * 1000);
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

  const modeRef = { value: getSavedMode() };

  if (modeRef.value === "auto") startAutoWatcher(modeRef);
  else applyMode(modeRef.value);

  btn.addEventListener("click", function () {
    modeRef.value = nextMode(modeRef.value);
    saveMode(modeRef.value);

    if (modeRef.value === "auto") startAutoWatcher(modeRef);
    else {
      stopAutoWatcher();
      applyMode(modeRef.value);
    }
  });
})();