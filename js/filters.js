(function () {
  const TAG_CONTAINER = document.getElementById("dynamicTagPills");
  const ALL_TAG_BUTTON = document.querySelector('.tag-pill[data-tag="all"]');
  const TAG_COUNT_ALL = document.getElementById("tag-count-all");
  const SEARCH_INPUT = document.getElementById("searchInput");

  const FILTERS_TOGGLE_BTN = document.getElementById("filtersToggleBtn");
  const FILTERS_PANEL = document.getElementById("filtersPanel");
  const GAMES_TOGGLE_BTN = document.getElementById("gamesToggleBtn");
  const GAMES_PANEL = document.getElementById("gamesPanel");

  const CLEAR_FILTERS_BTN = document.getElementById("clearFiltersBtn");

  // Contenedor para pills de juegos (recomendado en HTML: <div id="gamesPillsContainer"></div>)
  const GAMES_PILLS_CONTAINER =
    document.getElementById("gamesPillsContainer") ||
    (GAMES_PANEL ? GAMES_PANEL : null);

  let allCreators = [];
  let activeTags = new Set();  // SOLO tags + idioma (NO RRSS)
  let activeGames = new Set(); // videojuegos
  let searchTerm = "";

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

  // ✅ Tags únicos: desde creators.tags + creators.language (SIN RRSS)
  function extractUniqueTags(creators) {
    const set = new Set();
    creators.forEach(c => {
      (c.tags || []).forEach(tag => set.add(tag));
      if (c.language) set.add(c.language);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  // Juegos únicos desde la data
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

  // Construir los botones de juegos dinámicamente
  function buildGamePills(uniqueGames) {
    if (!GAMES_PILLS_CONTAINER) return;

    // Si existe #gamesPillsContainer lo limpiamos; si no existe, creamos uno dentro.
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

  // ✅ Paneles: alto dinámico (vh) + scroll interno para que no se corte
  function setPanelOpen(panel, toggleBtn, open, maxHeightVh) {
    if (!toggleBtn || !panel) return;

    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    toggleBtn.setAttribute("aria-expanded", String(open));

    if (open) {
      panel.style.maxHeight = maxHeightVh; // evita cortes con muchos tags/juegos
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

  function attachPanelToggles() {
    if (FILTERS_TOGGLE_BTN && FILTERS_PANEL) {
      FILTERS_TOGGLE_BTN.addEventListener("click", function (e) {
        e.stopPropagation();
        const isOpen = !FILTERS_PANEL.classList.contains("is-open");
        setFiltersPanelOpen(isOpen);

        // Regla: al usar el botón de Filtros, se cierra el panel de videojuegos
        setGamesPanelOpen(false);
      });
    }

    if (GAMES_TOGGLE_BTN && GAMES_PANEL) {
      GAMES_TOGGLE_BTN.addEventListener("click", function (e) {
        e.stopPropagation();
        const isOpen = !GAMES_PANEL.classList.contains("is-open");
        setGamesPanelOpen(isOpen);
      });
    }
  }

  function clearAllFilters() {
    activeTags.clear();
    activeGames.clear();
    searchTerm = "";

    if (SEARCH_INPUT) SEARCH_INPUT.value = "";

    // Tags (sin tocar AtoZ)
    document.querySelectorAll(".tag-pill").forEach(el => {
      if (el.id === "sortAlphaBtn") return;
      if (el.classList.contains("game-pill")) return;
      el.classList.remove("is-active");
    });
    if (ALL_TAG_BUTTON) ALL_TAG_BUTTON.classList.add("is-active");

    // Games
    document.querySelectorAll(".game-pill").forEach(el => el.classList.remove("is-active"));

    // Papelera cierra todo
    setGamesPanelOpen(false);
    setFiltersPanelOpen(false);

    window.VSDFilters && window.VSDFilters.onFilterChange();
  }

  function attachEvents() {
    document.addEventListener("click", function (evt) {
      // Ignorar el botón de orden
      if (evt.target && evt.target.closest && evt.target.closest("#sortAlphaBtn")) {
        return;
      }

      // Papelera
      if (evt.target && evt.target.closest && evt.target.closest("#clearFiltersBtn")) {
        clearAllFilters();
        return;
      }

      // Click afuera: cierra SOLO filtersPanel (gamesPanel NO se cierra aquí)
      const clickedInsideFiltersPanel = evt.target.closest && evt.target.closest("#filtersPanel");
      const clickedFiltersToggle = evt.target.closest && evt.target.closest("#filtersToggleBtn");
      if (FILTERS_PANEL && FILTERS_PANEL.classList.contains("is-open")) {
        if (!clickedInsideFiltersPanel && !clickedFiltersToggle) {
          setFiltersPanelOpen(false);
        }
      }

      // Tags
      const tagBtn = evt.target.closest(".tag-pill");
      if (tagBtn && !tagBtn.classList.contains("game-pill")) {
        if (tagBtn.id === "sortAlphaBtn") return;

        const tag = tagBtn.dataset.tag;
        if (!tag) return;

        if (tag === "all") {
          // "Todos" muestra a todos
          activeTags.clear();
          activeGames.clear();
          searchTerm = "";
          if (SEARCH_INPUT) SEARCH_INPUT.value = "";

          document.querySelectorAll(".tag-pill").forEach(el => {
            if (el.id === "sortAlphaBtn") return;
            if (!el.classList.contains("game-pill")) el.classList.remove("is-active");
          });
          if (ALL_TAG_BUTTON) ALL_TAG_BUTTON.classList.add("is-active");

          document.querySelectorAll(".game-pill").forEach(el => el.classList.remove("is-active"));

          // "Todos" cierra panel videojuegos y panel filtros
          setGamesPanelOpen(false);
          setFiltersPanelOpen(false);
        } else {
          if (activeTags.has(tag)) {
            activeTags.delete(tag);
            tagBtn.classList.remove("is-active");
          } else {
            activeTags.add(tag);
            tagBtn.classList.add("is-active");
          }

          const anyActive = activeTags.size > 0;
          if (ALL_TAG_BUTTON) {
            if (anyActive) ALL_TAG_BUTTON.classList.remove("is-active");
            else ALL_TAG_BUTTON.classList.add("is-active");
          }

          // Importante: NO cerrar gamesPanel al tocar tags
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

    if (SEARCH_INPUT) {
      SEARCH_INPUT.addEventListener("input", function () {
        searchTerm = this.value.trim().toLowerCase();
        window.VSDFilters && window.VSDFilters.onFilterChange();
      });
    }
  }

  function creatorMatchesFilters(creator) {
    const term = searchTerm;
    if (term) {
      const uname = (creator.username || "").toLowerCase();
      if (!uname.includes(term)) return false;
    }

    if (activeTags.size === 0 && activeGames.size === 0) return true;

    // ✅ SOLO tags + idioma (sin RRSS)
    const baseSet = new Set([
      ...(creator.tags || []),
      creator.language || ""
    ]);

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
      // ✅ SOLO tags + idioma (sin RRSS)
      const appliedTags = new Set([
        ...(c.tags || []),
        c.language || ""
      ]);

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

    Object.keys(counts.tags).forEach(tag => {
      const btn = document.querySelector(`.tag-pill[data-tag="${CSS.escape(tag)}"]`);
      if (!btn) return;
      let span = btn.querySelector(".tag-count");
      if (!span) {
        span = document.createElement("span");
        span.className = "tag-count";
        btn.appendChild(span);
      }
      span.textContent = counts.tags[tag];
    });

    document.querySelectorAll('.tag-pill[data-tag]').forEach(btn => {
      const tag = btn.dataset.tag;
      if (!tag || tag === "all") return;
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
    allCreators = creators.slice();

    const uniqueTags = extractUniqueTags(allCreators);
    buildTagPills(uniqueTags);

    const uniqueGames = extractUniqueGames(allCreators);
    buildGamePills(uniqueGames);

    attachPanelToggles();
    attachEvents();

    // Estado inicial “cerrado” con estilos consistentes
    setFiltersPanelOpen(false);
    setGamesPanelOpen(false);

    if (ALL_TAG_BUTTON) ALL_TAG_BUTTON.classList.add("is-active");
    refreshCounts();
  }

  window.VSDFilters = {
    init,
    matches: creatorMatchesFilters,
    onFilterChange: function () {
      refreshCounts();
      if (window.VSDInfiniteScroll) window.VSDInfiniteScroll.resetAndRender();
    },
    clearAll: clearAllFilters
  };
})();

document.addEventListener("keydown", function (evt) {
  if (evt.key !== "Escape") return;

  const toggleBtn = document.getElementById("filtersToggleBtn");
  const panel = document.getElementById("filtersPanel");

  const gamesToggle = document.getElementById("gamesToggleBtn");
  const gamesPanel = document.getElementById("gamesPanel");

  // Si quieres que ESC NO cierre el panel de videojuegos, borra este bloque.
  if (gamesPanel && gamesPanel.classList.contains("is-open")) {
    gamesPanel.classList.remove("is-open");
    gamesPanel.setAttribute("aria-hidden", "true");
    gamesPanel.style.maxHeight = "0px";
    gamesPanel.style.overflowY = "hidden";
    if (gamesToggle) gamesToggle.setAttribute("aria-expanded", "false");
  }

  if (panel && panel.classList.contains("is-open")) {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    panel.style.maxHeight = "0px";
    panel.style.overflowY = "hidden";
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
  }
});