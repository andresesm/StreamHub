(function () {
  if (window.VSDFilters && window.VSDFilters.__initialized) return;

  const MOBILE_MEDIA = window.matchMedia("(max-width: 900px)");

  const FILTERS_CARD = document.getElementById("filtersCard");
  const FILTERS_TOGGLE_BTN = document.getElementById("filtersToggleBtn");
  const FILTERS_PANEL = document.getElementById("filtersPanel");

  const TAG_BLOCK = document.getElementById("tagsFilterBlock");
  const TAGS_TOGGLE_BTN = document.getElementById("tagsToggleBtn");
  const TAG_CONTAINER = document.getElementById("dynamicTagPills");
  const TAG_COUNT_ALL = document.getElementById("tag-count-all");

  const GAMES_BLOCK = document.getElementById("gamesFilterBlock");
  const GAMES_TOGGLE_BTN = document.getElementById("gamesToggleBtn");
  const GAMES_PANEL = document.getElementById("gamesPanel");

  const SEARCH_INPUT = document.getElementById("searchInput");
  const CLEAR_FILTERS_BTN = document.getElementById("clearFiltersBtn");

  const GAMES_PILLS_CONTAINER =
    document.getElementById("gamesPillsContainer") ||
    (GAMES_PANEL ? GAMES_PANEL : null);

  const PLATFORM_BTN = document.getElementById("platformSelectBtn");
  const PLATFORM_MENU = document.getElementById("platformMenu");
  const PLATFORM_WRAP = document.getElementById("platformSelectWrap");

  const PLATFORMS = [
    { key: "twitch", label: "Twitch" },
    { key: "kick", label: "Kick" },
    { key: "youtube", label: "YouTube" },
    { key: "tiktok", label: "TikTok" }
  ];

  let initialized = false;
  let allCreators = [];
  let activeTags = new Set();
  let activeGames = new Set();
  let searchTerm = "";
  let selectedPlatform = "twitch";
  let liveOnly = false;
  let liveByUser = {};
  let liveUpdateListenerAttached = false;
  let platformTotals = null;

  function isMobileView() {
    return MOBILE_MEDIA.matches;
  }

  function normalizeTwitchHandle(v) {
    return String(v || "").trim().replace(/^@/, "").toLowerCase();
  }

  function getCreatorPlatform(creator) {
    const p = String(creator?.streamPlatform ?? "").trim().toLowerCase();
    if (!p || p === "none") return "";
    return p;
  }

  function computePlatformTotals(creators) {
    const totals = { twitch: 0, kick: 0, youtube: 0, tiktok: 0 };
    creators.forEach(c => {
      const p = getCreatorPlatform(c);
      if (p && totals[p] != null) totals[p] += 1;
    });
    return totals;
  }

  function countActiveFilters() {
    let total = 0;
    total += activeTags.size;
    total += activeGames.size;
    if (searchTerm) total += 1;
    if (liveOnly) total += 1;
    return total;
  }

  function updateMasterToggleMeta() {
    if (!FILTERS_TOGGLE_BTN) return;
    let meta = FILTERS_TOGGLE_BTN.querySelector('.filters-master-toggle__meta');
    if (!meta) return;
    let count = meta.querySelector('.filters-master-toggle__count');
    if (!count) {
      count = document.createElement('span');
      count.className = 'filters-master-toggle__count';
      meta.prepend(count);
    }
    const total = countActiveFilters();
    count.textContent = total;
    count.hidden = total === 0;
  }

  function updateSectionCount(toggleBtn, countValue) {
    if (!toggleBtn) return;
    let meta = toggleBtn.querySelector('.filter-block__meta');
    if (!meta) return;
    let count = meta.querySelector('.filter-block__count');
    if (!count) {
      count = document.createElement('span');
      count.className = 'filter-block__count';
      meta.prepend(count);
    }
    count.textContent = countValue;
    count.hidden = !countValue;
  }

  function ensurePlatformBtnParts() {
    if (!PLATFORM_BTN) return null;

    let selection = PLATFORM_BTN.querySelector('.platform-selection');
    if (!selection) {
      selection = document.createElement('span');
      selection.className = 'platform-selection';
    }

    let labelSpan = selection.querySelector('.platform-label');
    if (!labelSpan) {
      labelSpan = document.createElement('span');
      labelSpan.className = 'platform-label';
      selection.appendChild(labelSpan);
    }

    let countSpan = selection.querySelector('.platform-count');
    if (!countSpan) {
      countSpan = document.createElement('span');
      countSpan.className = 'platform-count';
      selection.appendChild(countSpan);
    }

    let caret = PLATFORM_BTN.querySelector('.platform-caret');
    if (!caret) {
      caret = document.createElement('span');
      caret.className = 'platform-caret';
      caret.textContent = '▾';
    }

    PLATFORM_BTN.textContent = '';
    PLATFORM_BTN.appendChild(selection);
    PLATFORM_BTN.appendChild(caret);

    return { labelSpan, countSpan };
  }

  function updatePlatformSelectBtnCount() {
    if (!PLATFORM_BTN) return;
    const parts = ensurePlatformBtnParts();
    if (!parts) return;
    const label = PLATFORMS.find(p => p.key === selectedPlatform)?.label || 'Twitch';
    const n = platformTotals ? (platformTotals[selectedPlatform] || 0) : 0;
    parts.labelSpan.textContent = label;
    parts.countSpan.textContent = `(${n})`;
  }

  function setPanelOpen(panel, toggleBtn, open, maxHeightVh, block) {
    if (!toggleBtn || !panel) return;

    panel.classList.toggle('is-open', open);
    panel.classList.toggle('is-collapsed', !open);
    panel.setAttribute('aria-hidden', String(!open));
    toggleBtn.setAttribute('aria-expanded', String(open));

    if (block) {
      block.classList.toggle('is-collapsed', !open);
      block.setAttribute('data-collapsed', String(!open));
    }

    if (isMobileView()) {
      panel.style.maxHeight = open ? maxHeightVh : '0px';
      panel.style.overflowY = open ? 'auto' : 'hidden';
    } else {
      panel.style.maxHeight = '';
      panel.style.overflowY = '';
    }
  }

  function setFiltersPanelOpen(open) {
    if (FILTERS_CARD) {
      FILTERS_CARD.classList.toggle('is-collapsed', !open);
      FILTERS_CARD.setAttribute('data-collapsed', String(!open));
    }
    setPanelOpen(FILTERS_PANEL, FILTERS_TOGGLE_BTN, open, '80vh');
    updateMasterToggleMeta();
  }

  function setTagsPanelOpen(open) {
    setPanelOpen(TAG_CONTAINER, TAGS_TOGGLE_BTN, open, '40vh', TAG_BLOCK);
  }

  function setGamesPanelOpen(open) {
    setPanelOpen(GAMES_PANEL, GAMES_TOGGLE_BTN, open, '40vh', GAMES_BLOCK);
  }

  function applyResponsiveFilterState() {
    if (isMobileView()) {
      const keepMasterOpen = !!searchTerm || activeTags.size > 0 || activeGames.size > 0 || liveOnly;
      setFiltersPanelOpen(keepMasterOpen);
      setTagsPanelOpen(activeTags.size > 0);
      setGamesPanelOpen(activeGames.size > 0);
      return;
    }
    setFiltersPanelOpen(true);
    setTagsPanelOpen(true);
    setGamesPanelOpen(true);
  }

  function buildTagPills(uniqueTags) {
    if (!TAG_CONTAINER) return;
    TAG_CONTAINER.innerHTML = '';
    uniqueTags.forEach(tag => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag-pill';
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
        const name = String(g || '').trim();
        if (name) set.add(name);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function buildGamePills(uniqueGames) {
    if (!GAMES_PILLS_CONTAINER) return;

    let container = document.getElementById('gamesPillsContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'gamesPillsContainer';
      container.className = 'pills-grid games-pills-container';
      GAMES_PILLS_CONTAINER.appendChild(container);
    }

    container.classList.add('pills-grid', 'games-pills-container');
    container.innerHTML = '';

    uniqueGames.forEach(game => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag-pill game-pill';
      btn.dataset.game = game;

      const label = document.createElement('span');
      label.className = 'game-label';
      label.textContent = game;

      const count = document.createElement('span');
      count.className = 'tag-count';
      count.textContent = '0';

      btn.appendChild(label);
      btn.appendChild(count);
      container.appendChild(btn);
    });
  }

  function ensureLiveToggleButton() {
    const btn = document.getElementById('liveToggleBtn');
    if (!btn) return;

    if (!btn.__vsdInit) {
      btn.__vsdInit = true;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (selectedPlatform !== 'twitch') return;
        liveOnly = !liveOnly;
        syncLiveUI();
        if (isMobileView()) setFiltersPanelOpen(true);
        window.VSDFilters && window.VSDFilters.onFilterChange();
      });
    }

    btn.style.display = (selectedPlatform === 'twitch') ? '' : 'none';
    if (selectedPlatform !== 'twitch') liveOnly = false;
    syncLiveUI();
  }

  function syncLiveUI() {
    const liveBtn = document.getElementById('liveToggleBtn');
    if (!liveBtn) return;
    liveBtn.classList.toggle('is-active', !!liveOnly);
    liveBtn.setAttribute('aria-pressed', liveOnly ? 'true' : 'false');
  }

  function openPlatformMenu(open) {
    if (!PLATFORM_MENU || !PLATFORM_BTN) return;
    PLATFORM_MENU.classList.toggle('is-open', open);
    PLATFORM_MENU.setAttribute('aria-hidden', String(!open));
    PLATFORM_BTN.setAttribute('aria-expanded', String(open));
  }

  function setPlatform(key) {
    const normalized = String(key || '').trim().toLowerCase();
    if (!PLATFORMS.some(p => p.key === normalized)) return;
    selectedPlatform = normalized;

    if (PLATFORM_BTN) {
      PLATFORM_BTN.classList.remove('platform--twitch', 'platform--kick', 'platform--youtube', 'platform--tiktok');
      PLATFORM_BTN.classList.add(`platform--${normalized}`);
      PLATFORM_BTN.classList.add('is-active');
      updatePlatformSelectBtnCount();
    }

    ensureLiveToggleButton();
    if (isMobileView()) setFiltersPanelOpen(true);
    window.VSDFilters && window.VSDFilters.onFilterChange();
  }

  function clearNonPlatformFilters() {
    activeTags.clear();
    activeGames.clear();
    searchTerm = '';
    liveOnly = false;

    syncLiveUI();
    if (SEARCH_INPUT) SEARCH_INPUT.value = '';

    document.querySelectorAll('.tag-pill').forEach(el => {
      if (el.classList.contains('game-pill')) return;
      el.classList.remove('is-active');
    });
    document.querySelectorAll('.game-pill').forEach(el => el.classList.remove('is-active'));

    applyResponsiveFilterState();
    window.VSDFilters && window.VSDFilters.onFilterChange();
  }

  function attachPanelToggles() {
    if (FILTERS_TOGGLE_BTN && !FILTERS_TOGGLE_BTN.__vsdInit) {
      FILTERS_TOGGLE_BTN.__vsdInit = true;
      FILTERS_TOGGLE_BTN.addEventListener('click', function (e) {
        e.stopPropagation();
        openPlatformMenu(false);
        const isOpen = FILTERS_PANEL ? FILTERS_PANEL.classList.contains('is-open') : false;
        setFiltersPanelOpen(!isOpen);
      });
    }

    if (TAGS_TOGGLE_BTN && !TAGS_TOGGLE_BTN.__vsdInit) {
      TAGS_TOGGLE_BTN.__vsdInit = true;
      TAGS_TOGGLE_BTN.addEventListener('click', function (e) {
        e.stopPropagation();
        const isOpen = TAG_CONTAINER ? TAG_CONTAINER.classList.contains('is-open') : false;
        setTagsPanelOpen(!isOpen);
      });
    }

    if (GAMES_TOGGLE_BTN && !GAMES_TOGGLE_BTN.__vsdInit) {
      GAMES_TOGGLE_BTN.__vsdInit = true;
      GAMES_TOGGLE_BTN.addEventListener('click', function (e) {
        e.stopPropagation();
        const isOpen = GAMES_PANEL ? GAMES_PANEL.classList.contains('is-open') : false;
        setGamesPanelOpen(!isOpen);
      });
    }
  }

  function attachEvents() {
    if (document.__vsdFiltersInitClicks) return;
    document.__vsdFiltersInitClicks = true;

    if (CLEAR_FILTERS_BTN && !CLEAR_FILTERS_BTN.__vsdInit) {
      CLEAR_FILTERS_BTN.__vsdInit = true;
      CLEAR_FILTERS_BTN.addEventListener('click', function (e) {
        e.stopPropagation();
        clearNonPlatformFilters();
      });
    }

    if (PLATFORM_BTN && !PLATFORM_BTN.__vsdInit) {
      PLATFORM_BTN.__vsdInit = true;
      PLATFORM_BTN.addEventListener('click', function (e) {
        e.stopPropagation();
        const open = !(PLATFORM_MENU && PLATFORM_MENU.classList.contains('is-open'));
        openPlatformMenu(open);
      });
    }

    if (PLATFORM_MENU && !PLATFORM_MENU.__vsdInit) {
      PLATFORM_MENU.__vsdInit = true;
      PLATFORM_MENU.addEventListener('click', function (e) {
        const item = e.target.closest('.platform-menu-item');
        if (!item) return;
        setPlatform(item.dataset.platform);
        openPlatformMenu(false);
      });
    }

    document.addEventListener('click', function (evt) {
      const insidePlatform = PLATFORM_WRAP && evt.target.closest && evt.target.closest('#platformSelectWrap');
      if (!insidePlatform) openPlatformMenu(false);

      if (isMobileView()) {
        const clickedInsideFiltersCard = evt.target.closest && evt.target.closest('#filtersCard');
        if (!clickedInsideFiltersCard && FILTERS_PANEL && FILTERS_PANEL.classList.contains('is-open')) {
          setFiltersPanelOpen(false);
        }
      }

      const tagBtn = evt.target.closest('.tag-pill');
      if (tagBtn && !tagBtn.classList.contains('game-pill')) {
        const tag = tagBtn.dataset.tag;
        if (!tag) return;

        if (activeTags.has(tag)) {
          activeTags.delete(tag);
          tagBtn.classList.remove('is-active');
        } else {
          activeTags.add(tag);
          tagBtn.classList.add('is-active');
        }

        if (isMobileView()) {
          setFiltersPanelOpen(true);
          setTagsPanelOpen(true);
        }
        window.VSDFilters && window.VSDFilters.onFilterChange();
        return;
      }

      const gameBtn = evt.target.closest('.game-pill');
      if (gameBtn) {
        const game = gameBtn.dataset.game;
        if (!game) return;

        if (activeGames.has(game)) {
          activeGames.delete(game);
          gameBtn.classList.remove('is-active');
        } else {
          activeGames.add(game);
          gameBtn.classList.add('is-active');
        }

        if (isMobileView()) {
          setFiltersPanelOpen(true);
          setGamesPanelOpen(true);
        }
        window.VSDFilters && window.VSDFilters.onFilterChange();
      }
    });

    if (SEARCH_INPUT && !SEARCH_INPUT.__vsdSearchInit) {
      SEARCH_INPUT.__vsdSearchInit = true;
      SEARCH_INPUT.addEventListener('input', function () {
        searchTerm = this.value.trim().toLowerCase();
        if (isMobileView()) setFiltersPanelOpen(true);
        window.VSDFilters && window.VSDFilters.onFilterChange();
      });
    }

    if (!document.__vsdFiltersEscapeInit) {
      document.__vsdFiltersEscapeInit = true;
      document.addEventListener('keydown', function (evt) {
        if (evt.key !== 'Escape') return;
        openPlatformMenu(false);
        if (isMobileView()) {
          setGamesPanelOpen(false);
          setTagsPanelOpen(false);
          setFiltersPanelOpen(false);
        }
      });
    }

    if (!window.__vsdFiltersResizeInit) {
      window.__vsdFiltersResizeInit = true;
      MOBILE_MEDIA.addEventListener('change', function () {
        openPlatformMenu(false);
        applyResponsiveFilterState();
      });
    }
  }

  function creatorMatchesFilters(creator) {
    const p = getCreatorPlatform(creator);
    if (!p || p !== selectedPlatform) return false;

    if (searchTerm) {
      const uname = (creator.username || '').toLowerCase();
      if (!uname.includes(searchTerm)) return false;
    }

    if (selectedPlatform === 'twitch' && liveOnly) {
      const twitch = normalizeTwitchHandle(creator?.socials?.twitch);
      if (!twitch || liveByUser[twitch] !== true) return false;
    }

    if (activeTags.size === 0 && activeGames.size === 0) return true;

    const baseSet = new Set([...(creator.tags || []), creator.language || '']);
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
      const appliedTags = new Set([...(c.tags || []), c.language || '']);
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

    let visible = 0;
    document.querySelectorAll('.tag-pill[data-tag]').forEach(btn => {
      const tag = btn.dataset.tag;
      if (!tag) return;

      const n = counts.tags[tag] || 0;
      let span = btn.querySelector('.tag-count');
      if (!span) {
        span = document.createElement('span');
        span.className = 'tag-count';
        btn.appendChild(span);
      }
      span.textContent = n;

      const isActive = activeTags.has(tag);
      const hidden = n === 0 && !isActive;
      btn.classList.toggle('filter-pill-hidden', hidden);
      if (!hidden) visible += 1;
    });
    updateSectionCount(TAGS_TOGGLE_BTN, visible);
  }

  function updateGameCounts(counts) {
    let visible = 0;
    document.querySelectorAll('.game-pill').forEach(btn => {
      const game = btn.dataset.game;
      if (!game) return;

      const n = counts.games[game] || 0;
      let span = btn.querySelector('.tag-count');
      if (!span) {
        span = document.createElement('span');
        span.className = 'tag-count';
        btn.appendChild(span);
      }
      span.textContent = n;

      const isActive = activeGames.has(game);
      const hidden = n === 0 && !isActive;
      btn.classList.toggle('filter-pill-hidden', hidden);
      if (!hidden) visible += 1;
    });
    updateSectionCount(GAMES_TOGGLE_BTN, visible);
  }

  function refreshCounts() {
    const subset = allCreators.filter(creatorMatchesFilters);
    const counts = computeCountsFrom(subset);
    updateTagCounts(counts);
    updateGameCounts(counts);
    updateMasterToggleMeta();
  }

  function init(creators) {
    if (initialized) return;
    initialized = true;

    allCreators = creators.slice();
    platformTotals = computePlatformTotals(allCreators);

    buildTagPills(extractUniqueTags(allCreators));
    buildGamePills(extractUniqueGames(allCreators));

    attachPanelToggles();
    attachEvents();

    setPlatform('twitch');
    ensureLiveToggleButton();

    if (!liveUpdateListenerAttached) {
      liveUpdateListenerAttached = true;
      window.addEventListener('twitch:live-update', function (e) {
        liveByUser = (e && e.detail && e.detail.liveByUser) ? e.detail.liveByUser : {};
        if (selectedPlatform === 'twitch' && liveOnly) {
          window.VSDFilters && window.VSDFilters.onFilterChange();
        }
      });
    }

    applyResponsiveFilterState();
    refreshCounts();
  }

  window.VSDFilters = {
    __initialized: true,
    init,
    matches: creatorMatchesFilters,
    getLiveByUser: () => liveByUser,
    onFilterChange: function () {
      refreshCounts();
      if (window.VSDInfiniteScroll) window.VSDInfiniteScroll.resetAndRender();
    },
    clearAll: clearNonPlatformFilters
  };
})();
