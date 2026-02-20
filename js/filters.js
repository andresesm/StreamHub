(function () {
  if (window.VSDFilters && window.VSDFilters.__initialized) return;

  const TAG_CONTAINER = document.getElementById("dynamicTagPills");
  const TAG_COUNT_ALL = document.getElementById("tag-count-all"); // si ya no lo usas, puedes eliminarlo del HTML
  const SEARCH_INPUT = document.getElementById("searchInput");

  const FILTERS_TOGGLE_BTN = document.getElementById("filtersToggleBtn");
  const FILTERS_PANEL = document.getElementById("filtersPanel");
  const GAMES_TOGGLE_BTN = document.getElementById("gamesToggleBtn");
  const GAMES_PANEL = document.getElementById("gamesPanel");

  const CLEAR_FILTERS_BTN = document.getElementById("clearFiltersBtn");

  const GAMES_PILLS_CONTAINER =
    document.getElementById("gamesPillsContainer") ||
    (GAMES_PANEL ? GAMES_PANEL : null);

  // ✅ Platform UI
  const PLATFORM_BTN = document.getElementById("platformSelectBtn");
  const PLATFORM_MENU = document.getElementById("platformMenu");
  const PLATFORM_WRAP = document.getElementById("platformSelectWrap");

  const PLATFORMS = [
    { key: "twitch", label: "Twitch" },
    { key: "kick", label: "Kick" },
    { key: "youtube", label: "Youtube" },
    { key: "tiktok", label: "Tiktok" }
  ];

  let initialized = false;

  let allCreators = [];
  let activeTags = new Set();
  let activeGames = new Set();
  let searchTerm = "";

  // ✅ Plataforma seleccionada (por defecto Twitch)
  let selectedPlatform = "twitch";

  // ✅ Live-only (solo Twitch)
  let liveOnly = false;
  let liveByUser = {};
  let liveUpdateListenerAttached = false;

  function normalizeTwitchHandle(v) {
    return String(v || "").trim().replace(/^@/, "").toLowerCase();
  }

  // ✅ SOLO streamPlatform (sin fallback a creator.platform)
  function getCreatorPlatform(creator) {
    const p = String(creator?.streamPlatform ?? "").trim().toLowerCase();
    if (!p || p === "none") return "";
    return p;
  }

  function setPanelOpen(panel, toggleBtn, open, maxHeightVh) {
    if (!toggleBtn || !panel) return;

    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    toggleBtn.setAttribute("aria-expanded", String(open));

    if (open) {
      panel.style.maxHeight = maxHeightVh;
      panel.style.overflowY = "auto";
    } else {
      panel.style.maxHeight = "0px";
      panel.style.overflowY = "hidden";
    }
  }

  function setFiltersPanelOpen(open) {
    setPanelOpen(FILTERS_PANEL, FILTERS_TOGGLE_BTN, open, "80vh");
  }

  function setGamesPanelOpen(open) {
    setPanelOpen(GAMES_PANEL, GAMES_TOGGLE_BTN, open, "60vh");
  }

  function buildTagPills(uniqueTags) {
    TAG_CONTAINER.innerHTML = "";
    uniqueTags.forEach(tag => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag-pill";
      btn.dataset.tag = tag;
      btn.textContent = tag;
      TAG_CONTAINER.appendChild(btn);
    });
  }

  function extractUniqueTags(creators) {
    const set = new Set();
    creators.forEach(c => {
      (c.tags || []).forEach(tag => set.add(tag));
      if (c.language) set.add(c.language);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function extractUniqueGames(creators) {
    const set = new Set();
    creators.forEach(c => {
      (c.games || []).forEach(g => {
        const name = String(g || "").trim();
        if (name) set.add(name);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function buildGamePills(uniqueGames) {
    if (!GAMES_PILLS_CONTAINER) return;

    let container = document.getElementById("gamesPillsContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "gamesPillsContainer";
      container.className = "games-pills-container";
      GAMES_PILLS_CONTAINER.appendChild(container);
    }

    container.innerHTML = "";

    uniqueGames.forEach(game => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag-pill game-pill";
      btn.dataset.game = game;

      const label = document.createElement("span");
      label.className = "game-label";
      label.textContent = game;

      const count = document.createElement("span");
      count.className = "tag-count";
      count.textContent = "0";

      btn.appendChild(label);
      btn.appendChild(count);
      container.appendChild(btn);
    });
  }

  // ✅ LIVE TOGGLE (solo Twitch)
  function ensureLiveToggleButton() {
    if (!GAMES_TOGGLE_BTN) return;

    let btn = document.getElementById("liveToggleBtn");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "liveToggleBtn";
      btn.type = "button";
      btn.className = GAMES_TOGGLE_BTN.className;
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = "En vivo";

      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        liveOnly = !liveOnly;
        syncLiveUI();
        window.VSDFilters && window.VSDFilters.onFilterChange();
      });

      GAMES_TOGGLE_BTN.parentNode.insertBefore(btn, GAMES_TOGGLE_BTN.nextSibling);
    }

    // mostrar/ocultar según plataforma
    btn.style.display = (selectedPlatform === "twitch") ? "" : "none";

    if (selectedPlatform !== "twitch") {
      liveOnly = false;
    }

    syncLiveUI();
  }

  function syncLiveUI() {
    const liveBtn = document.getElementById("liveToggleBtn");
    if (!liveBtn) return;

    liveBtn.classList.toggle("is-active", !!liveOnly);
    liveBtn.setAttribute("aria-pressed", liveOnly ? "true" : "false");
  }

  // ✅ Platform dropdown
  function openPlatformMenu(open) {
    if (!PLATFORM_MENU || !PLATFORM_BTN) return;

    PLATFORM_MENU.classList.toggle("is-open", open);
    PLATFORM_MENU.setAttribute("aria-hidden", String(!open));
    PLATFORM_BTN.setAttribute("aria-expanded", String(open));
  }

  function setPlatform(key) {
    const normalized = String(key || "").trim().toLowerCase();
    if (!PLATFORMS.some(p => p.key === normalized)) return;

    selectedPlatform = normalized;

    // actualiza label + clase para colores
    if (PLATFORM_BTN) {
      const label = PLATFORMS.find(p => p.key === normalized)?.label || "Twitch";
      PLATFORM_BTN.textContent = label + " ";
      const caret = document.createElement("span");
      caret.className = "platform-caret";
      caret.textContent = "▾";
      PLATFORM_BTN.appendChild(caret);

      PLATFORM_BTN.classList.remove("platform--twitch", "platform--kick", "platform--youtube", "platform--tiktok");
      PLATFORM_BTN.classList.add(`platform--${normalized}`);
      PLATFORM_BTN.classList.add("is-active");
    }

    // live toggle solo twitch
    ensureLiveToggleButton();

    // al cambiar plataforma, refrescamos todo
    window.VSDFilters && window.VSDFilters.onFilterChange();
  }

  function clearNonPlatformFilters() {
    activeTags.clear();
    activeGames.clear();
    searchTerm = "";
    liveOnly = false;

    syncLiveUI();

    if (SEARCH_INPUT) SEARCH_INPUT.value = "";

    document.querySelectorAll(".tag-pill").forEach(el => {
      if (el.id === "sortAlphaBtn") return;
      if (el.classList.contains("game-pill")) return;
      if (el.id === "platformSelectBtn") return;
      el.classList.remove("is-active");
    });

    document.querySelectorAll(".game-pill").forEach(el => el.classList.remove("is-active"));

    setGamesPanelOpen(false);
    setFiltersPanelOpen(false);

    window.VSDFilters && window.VSDFilters.onFilterChange();
  }

  function attachPanelToggles() {
    if (FILTERS_TOGGLE_BTN && FILTERS_PANEL) {
      FILTERS_TOGGLE_BTN.addEventListener("click", function (e) {
        e.stopPropagation();
        openPlatformMenu(false);
        const isOpen = !FILTERS_PANEL.classList.contains("is-open");
        setFiltersPanelOpen(isOpen);
        setGamesPanelOpen(false);
      });
    }

    if (GAMES_TOGGLE_BTN && GAMES_PANEL) {
      GAMES_TOGGLE_BTN.addEventListener("click", function (e) {
        e.stopPropagation();
        openPlatformMenu(false);
        const isOpen = !GAMES_PANEL.classList.contains("is-open");
        setGamesPanelOpen(isOpen);
      });
    }
  }

  function attachEvents() {
    if (document.__vsdFiltersInitClicks) return;
    document.__vsdFiltersInitClicks = true;

    // Papelera: limpia filtros NO plataforma
    if (CLEAR_FILTERS_BTN && !CLEAR_FILTERS_BTN.__vsdInit) {
      CLEAR_FILTERS_BTN.__vsdInit = true;
      CLEAR_FILTERS_BTN.addEventListener("click", function (e) {
        e.stopPropagation();
        clearNonPlatformFilters();
      });
    }

    // Platform dropdown: toggle
    if (PLATFORM_BTN && !PLATFORM_BTN.__vsdInit) {
      PLATFORM_BTN.__vsdInit = true;
      PLATFORM_BTN.addEventListener("click", function (e) {
        e.stopPropagation();
        const open = !(PLATFORM_MENU && PLATFORM_MENU.classList.contains("is-open"));
        openPlatformMenu(open);
      });
    }

    // Platform menu items
    if (PLATFORM_MENU && !PLATFORM_MENU.__vsdInit) {
      PLATFORM_MENU.__vsdInit = true;
      PLATFORM_MENU.addEventListener("click", function (e) {
        const item = e.target.closest(".platform-menu-item");
        if (!item) return;
        const key = item.dataset.platform;
        setPlatform(key);
        openPlatformMenu(false);
      });
    }

    // Click afuera: cerrar platform menu + cerrar panel filtros si está abierto
    document.addEventListener("click", function (evt) {
      const insidePlatform = PLATFORM_WRAP && evt.target.closest && evt.target.closest("#platformSelectWrap");
      if (!insidePlatform) openPlatformMenu(false);

      const clickedInsideFiltersPanel = evt.target.closest && evt.target.closest("#filtersPanel");
      const clickedFiltersToggle = evt.target.closest && evt.target.closest("#filtersToggleBtn");
      if (FILTERS_PANEL && FILTERS_PANEL.classList.contains("is-open")) {
        if (!clickedInsideFiltersPanel && !clickedFiltersToggle) {
          setFiltersPanelOpen(false);
        }
      }

      // Tags (solo los del panel dinámico)
      const tagBtn = evt.target.closest(".tag-pill");
      if (tagBtn && !tagBtn.classList.contains("game-pill")) {
        if (tagBtn.id === "sortAlphaBtn") return;
        if (tagBtn.id === "platformSelectBtn") return; // no es tag

        const tag = tagBtn.dataset.tag;
        if (!tag) return;

        if (activeTags.has(tag)) {
          activeTags.delete(tag);
          tagBtn.classList.remove("is-active");
        } else {
          activeTags.add(tag);
          tagBtn.classList.add("is-active");
        }

        window.VSDFilters && window.VSDFilters.onFilterChange();
        return;
      }

      // Games
      const gameBtn = evt.target.closest(".game-pill");
      if (gameBtn) {
        const game = gameBtn.dataset.game;
        if (!game) return;

        if (activeGames.has(game)) {
          activeGames.delete(game);
          gameBtn.classList.remove("is-active");
        } else {
          activeGames.add(game);
          gameBtn.classList.add("is-active");
        }

        window.VSDFilters && window.VSDFilters.onFilterChange();
      }
    });

    if (SEARCH_INPUT && !SEARCH_INPUT.__vsdSearchInit) {
      SEARCH_INPUT.__vsdSearchInit = true;
      SEARCH_INPUT.addEventListener("input", function () {
        searchTerm = this.value.trim().toLowerCase();
        window.VSDFilters && window.VSDFilters.onFilterChange();
      });
    }

    // Escape: cierra menús/paneles
    if (!document.__vsdFiltersEscapeInit) {
      document.__vsdFiltersEscapeInit = true;
      document.addEventListener("keydown", function (evt) {
        if (evt.key !== "Escape") return;
        openPlatformMenu(false);
        setGamesPanelOpen(false);
        setFiltersPanelOpen(false);
      });
    }
  }

  function creatorMatchesFilters(creator) {
    // ✅ 1) Plataforma (primero)
    const p = getCreatorPlatform(creator);
    if (!p) return false;
    if (p !== selectedPlatform) return false;

    // ✅ 2) Search
    const term = searchTerm;
    if (term) {
      const uname = (creator.username || "").toLowerCase();
      if (!uname.includes(term)) return false;
    }

    // ✅ 3) Live-only SOLO Twitch
    if (selectedPlatform === "twitch" && liveOnly) {
      const twitch = normalizeTwitchHandle(creator?.socials?.twitch);
      if (!twitch) return false;
      if (liveByUser[twitch] !== true) return false;
    }

    // ✅ 4) Tags/Games
    if (activeTags.size === 0 && activeGames.size === 0) return true;

    const baseSet = new Set([...(creator.tags || []), creator.language || ""]);
    for (const t of activeTags) {
      if (!baseSet.has(t)) return false;
    }

    if (activeGames.size > 0) {
      const gamesSet = new Set(creator.games || []);
      for (const g of activeGames) {
        if (!gamesSet.has(g)) return false;
      }
    }

    return true;
  }

  function computeCountsFrom(creatorsSubset) {
    const tagCounts = {};
    const gameCounts = {};

    creatorsSubset.forEach(c => {
      const appliedTags = new Set([...(c.tags || []), c.language || ""]);
      appliedTags.forEach(tag => {
        if (!tag) return;
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });

      (c.games || []).forEach(g => {
        if (!g) return;
        gameCounts[g] = (gameCounts[g] || 0) + 1;
      });
    });

    return { tags: tagCounts, games: gameCounts, all: creatorsSubset.length };
  }

  function updateTagCounts(counts) {
    if (TAG_COUNT_ALL) TAG_COUNT_ALL.textContent = counts.all;

    document.querySelectorAll('.tag-pill[data-tag]').forEach(btn => {
      const tag = btn.dataset.tag;
      if (!tag) return;
      if (btn.id === "sortAlphaBtn") return;
      if (btn.classList.contains("game-pill")) return;

      const n = counts.tags[tag] || 0;
      let span = btn.querySelector(".tag-count");
      if (!span) {
        span = document.createElement("span");
        span.className = "tag-count";
        btn.appendChild(span);
      }
      span.textContent = n;
    });
  }

  function updateGameCounts(counts) {
    document.querySelectorAll(".game-pill").forEach(btn => {
      const game = btn.dataset.game;
      if (!game) return;

      const n = counts.games[game] || 0;
      let span = btn.querySelector(".tag-count");
      if (!span) {
        span = document.createElement("span");
        span.className = "tag-count";
        btn.appendChild(span);
      }
      span.textContent = n;
    });
  }

  function refreshCounts() {
    const subset = allCreators.filter(creatorMatchesFilters);
    const counts = computeCountsFrom(subset);
    updateTagCounts(counts);
    updateGameCounts(counts);
  }

  function init(creators) {
    if (initialized) return;
    initialized = true;

    allCreators = creators.slice();

    // Construimos pills en base al dataset completo (pero el filtrado final depende de plataforma)
    const uniqueTags = extractUniqueTags(allCreators);
    buildTagPills(uniqueTags);

    const uniqueGames = extractUniqueGames(allCreators);
    buildGamePills(uniqueGames);

    attachPanelToggles();
    attachEvents();

    // Default platform: Twitch
    setPlatform("twitch");
    ensureLiveToggleButton();

    // Live updates desde TwitchIntegration
    if (!liveUpdateListenerAttached) {
      liveUpdateListenerAttached = true;
      window.addEventListener("twitch:live-update", function (e) {
        liveByUser = (e && e.detail && e.detail.liveByUser) ? e.detail.liveByUser : {};
        if (selectedPlatform === "twitch" && liveOnly) {
          window.VSDFilters && window.VSDFilters.onFilterChange();
        }
      });
    }

    setFiltersPanelOpen(false);
    setGamesPanelOpen(false);

    refreshCounts();
  }

  window.VSDFilters = {
    __initialized: true,
    init,
    matches: creatorMatchesFilters,
    onFilterChange: function () {
      refreshCounts();
      if (window.VSDInfiniteScroll) window.VSDInfiniteScroll.resetAndRender();
    },
    clearAll: clearNonPlatformFilters
  };
})();