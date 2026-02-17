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

  let allCreators = [];
  let activeTags = new Set(); // tags + plataformas + idioma
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

  function extractUniqueTags(creators) {
    const set = new Set();
    creators.forEach(c => {
      (c.tags || []).forEach(tag => set.add(tag));
      (c.platforms || []).forEach(p => set.add(p));
      if (c.language) set.add(c.language);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function setFiltersPanelOpen(open) {
    if (!FILTERS_TOGGLE_BTN || !FILTERS_PANEL) return;
    FILTERS_PANEL.classList.toggle("is-open", open);
    FILTERS_PANEL.setAttribute("aria-hidden", String(!open));
    FILTERS_TOGGLE_BTN.setAttribute("aria-expanded", String(open));
  }

  function setGamesPanelOpen(open) {
    if (!GAMES_TOGGLE_BTN || !GAMES_PANEL) return;
    GAMES_PANEL.classList.toggle("is-open", open);
    GAMES_PANEL.setAttribute("aria-hidden", String(!open));
    GAMES_TOGGLE_BTN.setAttribute("aria-expanded", String(open));
  }

  function attachPanelToggles() {
    if (FILTERS_TOGGLE_BTN && FILTERS_PANEL) {
      FILTERS_TOGGLE_BTN.addEventListener("click", function (e) {
        e.stopPropagation();
        const isOpen = !FILTERS_PANEL.classList.contains("is-open");
        setFiltersPanelOpen(isOpen);
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

    // UI: search
    if (SEARCH_INPUT) SEARCH_INPUT.value = "";

    // UI: tags (no tocar games ni AtoZ)
    document.querySelectorAll(".tag-pill").forEach(el => {
      if (el.id === "sortAlphaBtn") return;
      if (el.classList.contains("game-pill")) return;
      el.classList.remove("is-active");
    });
    if (ALL_TAG_BUTTON) ALL_TAG_BUTTON.classList.add("is-active");

    // UI: games
    document.querySelectorAll(".game-pill").forEach(el => el.classList.remove("is-active"));

    // opcional: cerrar paneles
    setGamesPanelOpen(false);
    setFiltersPanelOpen(false);

    window.VSDFilters && window.VSDFilters.onFilterChange();
  }

  function attachEvents() {
    document.addEventListener("click", function (evt) {
      // Ignorar el botón de orden AtoZ (para que no afecte tags)
      if (evt.target && evt.target.closest && evt.target.closest("#sortAlphaBtn")) {
        return;
      }

      // Botón papelera
      if (evt.target && evt.target.closest && evt.target.closest("#clearFiltersBtn")) {
        clearAllFilters();
        return;
      }

      // Cerrar paneles si clickeas afuera
      const clickedInsideFiltersPanel = evt.target.closest && evt.target.closest("#filtersPanel");
      const clickedFiltersToggle = evt.target.closest && evt.target.closest("#filtersToggleBtn");
      const clickedInsideGamesPanel = evt.target.closest && evt.target.closest("#gamesPanel");
      const clickedGamesToggle = evt.target.closest && evt.target.closest("#gamesToggleBtn");

      if (FILTERS_PANEL && FILTERS_PANEL.classList.contains("is-open")) {
        if (!clickedInsideFiltersPanel && !clickedFiltersToggle) {
          setFiltersPanelOpen(false);
        }
      }
      if (GAMES_PANEL && GAMES_PANEL.classList.contains("is-open")) {
        if (!clickedInsideGamesPanel && !clickedGamesToggle) {
          setGamesPanelOpen(false);
        }
      }

      // Tags (no game)
      const tagBtn = evt.target.closest(".tag-pill");
      if (tagBtn && !tagBtn.classList.contains("game-pill")) {
        if (tagBtn.id === "sortAlphaBtn") return;

        const tag = tagBtn.dataset.tag;
        if (!tag) return;

        if (tag === "all") {
          activeTags.clear();
          document.querySelectorAll(".tag-pill").forEach(el => {
            if (el.id === "sortAlphaBtn") return;
            if (!el.classList.contains("game-pill")) el.classList.remove("is-active");
          });
          if (ALL_TAG_BUTTON) ALL_TAG_BUTTON.classList.add("is-active");
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

    // ESC ya lo tienes abajo (lo dejo igual)
  }

  function creatorMatchesFilters(creator) {
    const term = searchTerm;
    if (term) {
      const uname = (creator.username || "").toLowerCase();
      if (!uname.includes(term)) return false;
    }

    if (activeTags.size === 0 && activeGames.size === 0) return true;

    const baseSet = new Set([
      ...(creator.tags || []),
      ...(creator.platforms || []),
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
      const appliedTags = new Set([
        ...(c.tags || []),
        ...(c.platforms || []),
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

    // Para tags que existan en UI pero no en subset, poner 0
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

    attachPanelToggles();
    attachEvents();

    if (ALL_TAG_BUTTON) ALL_TAG_BUTTON.classList.add("is-active");

    // Primer pintado de counts (sin filtros)
    refreshCounts();
  }

  window.VSDFilters = {
    init,
    matches: creatorMatchesFilters,
    onFilterChange: function () {
      // actualiza counts según el estado actual
      refreshCounts();

      if (window.VSDInfiniteScroll) {
        window.VSDInfiniteScroll.resetAndRender();
      }
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

  if (gamesPanel && gamesPanel.classList.contains("is-open")) {
    gamesPanel.classList.remove("is-open");
    gamesPanel.setAttribute("aria-hidden", "true");
    if (gamesToggle) gamesToggle.setAttribute("aria-expanded", "false");
  }

  if (panel && panel.classList.contains("is-open")) {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
  }
});