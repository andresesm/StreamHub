(function () {
  const GRID = document.getElementById("creatorsGrid");
  const SENTINEL = document.getElementById("gridSentinel");
  const LOADER = document.getElementById("loadingIndicator");
  const SORT_BTN = document.getElementById("sortAlphaBtn");
  const BATCH_SIZE = 20;

  const SOCIAL_ORDER = ["twitch", "kick", "x", "ig", "tiktok", "youtube", "email"];
  const SOCIAL_LABEL = {
    twitch: "Twitch",
    kick: "Kick",
    x: "X",
    ig: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    email: "Email",
  };

  let initialized = false;

  let allCreators = [];
  let filteredCreators = [];
  let renderedCount = 0;
  let observer = null;

  let creatorById = new Map(); // id -> creator

  // sortMode: "random" | "az" | "za"
  let sortMode = "random";
  let randomOrder = [];

  let lastSortClickTs = 0;
  let isRendering = false;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function isProbablyUrl(value) {
    const v = (value || "").trim().toLowerCase();
    return v.startsWith("http://") || v.startsWith("https://") || v.startsWith("mailto:");
  }

  function buildUrlFromHandle(key, handleOrUrl) {
    if (!handleOrUrl) return null;
    const raw = String(handleOrUrl).trim();
    if (!raw) return null;

    if (isProbablyUrl(raw)) return raw;

    const handle = raw.startsWith("@") ? raw.slice(1) : raw;

    if (key === "twitch") return `https://twitch.tv/${encodeURIComponent(handle)}`;
    if (key === "kick") return `https://kick.com/${encodeURIComponent(handle)}`;
    if (key === "x") return `https://x.com/${encodeURIComponent(handle)}`;
    if (key === "ig") return `https://instagram.com/${encodeURIComponent(handle)}`;
    if (key === "tiktok") return `https://tiktok.com/@${encodeURIComponent(handle)}`;
    if (key === "youtube") return `https://youtube.com/@${encodeURIComponent(handle)}`;
    if (key === "email") return `mailto:${handle}`;

    return null;
  }

  function getSocialValue(creator, key) {
    if (!creator) return "";

    if (creator.socials && creator.socials[key]) return creator.socials[key];

    if (creator.links && creator.links[key]) return creator.links[key];
    if (key === "x" && creator.links && creator.links.twitter) return creator.links.twitter;
    if (key === "ig" && creator.links && creator.links.instagram) return creator.links.instagram;
    if (key === "tiktok" && creator.links && creator.links.tt) return creator.links.tt;

    return "";
  }

  function getCreatorLink(creator, key) {
    const v = getSocialValue(creator, key);
    return buildUrlFromHandle(key, v);
  }

  function createSocialIcon(creator, key) {
    const url = getCreatorLink(creator, key);
    if (!url) return null;

    const a = document.createElement("a");
    a.className = "platform-icon-btn";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.title = SOCIAL_LABEL[key] || key;
    a.setAttribute("aria-label", SOCIAL_LABEL[key] || key);

    // ✅ NUEVO: para selección/estilos sin depender de title
    a.dataset.platform = key;

    const icon = document.createElement("span");
    icon.className = `rrss-icon rrss--${key}`;
    icon.setAttribute("aria-hidden", "true");

    a.appendChild(icon);
    return a;
  }

  // Export para que el popup use el mismo orden/constructor sin duplicar lógica
  window.VSDPlatformIcons = {
    ORDER: SOCIAL_ORDER.slice(),
    label: (key) => SOCIAL_LABEL[key] || key,
    create: createSocialIcon,
    getLink: getCreatorLink,
    getValue: getSocialValue,
  };

  function usernameKey(c) {
    return String(c && c.username ? c.username : "").toLowerCase();
  }

  function updateSortButtonUI() {
    if (!SORT_BTN) return;

    if (sortMode === "random") {
      SORT_BTN.textContent = "Rndm";
      SORT_BTN.setAttribute("aria-pressed", "false");
    } else if (sortMode === "az") {
      SORT_BTN.textContent = "AtoZ";
      SORT_BTN.setAttribute("aria-pressed", "true");
    } else {
      SORT_BTN.textContent = "ZtoA";
      SORT_BTN.setAttribute("aria-pressed", "true");
    }
  }

  function cycleSortMode(evt) {
    const now = Date.now();
    if (now - lastSortClickTs < 180) return;
    lastSortClickTs = now;

    if (evt && evt.altKey) {
      sortMode = "random";
    } else {
      if (sortMode === "random") sortMode = "az";
      else if (sortMode === "az") sortMode = "za";
      else sortMode = "random";
    }

    updateSortButtonUI();
    resetAndRender();
  }

  function recomputeFiltered() {
    const base = (sortMode === "random") ? randomOrder : allCreators;

    filteredCreators = base.filter(c => {
      return window.VSDFilters ? window.VSDFilters.matches(c) : true;
    });

    if (sortMode === "az") {
      filteredCreators.sort((a, b) => usernameKey(a).localeCompare(usernameKey(b)));
    } else if (sortMode === "za") {
      filteredCreators.sort((a, b) => usernameKey(b).localeCompare(usernameKey(a)));
    }
  }

  function createCard(creator) {
    const card = document.createElement("article");
    card.className = "creator-card";
    if (creator && creator.id != null) card.dataset.id = creator.id;

    // ✅ NUEVO: guardar handle twitch en el DOM (para TwitchIntegration sin buscar por username)
    card.dataset.twitch = (creator && creator.socials && creator.socials.twitch) ? String(creator.socials.twitch) : "";

    const avatarWrapper = document.createElement("div");
    avatarWrapper.className = "creator-avatar-wrapper";

    const img = document.createElement("img");
    img.className = "creator-avatar";
    img.alt = `Avatar de ${creator.username || "creador"}`;
    img.loading = "lazy";
    img.src = creator.avatar_url || "assets/avatar-placeholder-1.png";

    avatarWrapper.appendChild(img);
    card.appendChild(avatarWrapper);

    const body = document.createElement("div");
    body.className = "creator-card-body";

    const usernameBtn = document.createElement("button");
    usernameBtn.type = "button";
    usernameBtn.className = "creator-username-btn";
    usernameBtn.textContent = `@${creator.username || ""}`;
    body.appendChild(usernameBtn);

    const platformsRow = document.createElement("div");
    platformsRow.className = "creator-platforms";

    SOCIAL_ORDER.forEach(key => {
      const el = createSocialIcon(creator, key);
      if (el) platformsRow.appendChild(el);
    });

    body.appendChild(platformsRow);
    card.appendChild(body);

    requestAnimationFrame(() => card.classList.add("is-visible"));
    return card;
  }

  function sentinelNeedsMoreContent() {
    if (!SENTINEL) return false;
    const rect = SENTINEL.getBoundingClientRect();
    return rect.top <= (window.innerHeight + 200);
  }

  function renderUntilSentinelOutOfView() {
    if (!GRID) return;
    if (isRendering) return;
    if (renderedCount >= filteredCreators.length) return;

    isRendering = true;
    if (LOADER) LOADER.classList.add("is-visible");

    while (renderedCount < filteredCreators.length && sentinelNeedsMoreContent()) {
      const start = renderedCount;
      const end = Math.min(start + BATCH_SIZE, filteredCreators.length);

      for (let i = start; i < end; i++) {
        GRID.appendChild(createCard(filteredCreators[i]));
      }

      renderedCount = end;
    }

    if (LOADER) LOADER.classList.remove("is-visible");
    isRendering = false;
  }

  function resetAndRender() {
    if (!GRID) return;

    GRID.innerHTML = "";
    renderedCount = 0;

    if (sortMode === "random") {
      randomOrder = shuffle(allCreators);
    }

    recomputeFiltered();
    renderUntilSentinelOutOfView();
  }

  function initObserverOnce() {
    if (!SENTINEL) return;
    if (observer) return;

    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) renderUntilSentinelOutOfView();
      });
    }, { rootMargin: "200px 0px" });

    observer.observe(SENTINEL);
  }

  function attachGridDelegatedClicksOnce() {
    if (!GRID) return;
    if (GRID.__vsdDelegationInit) return;
    GRID.__vsdDelegationInit = true;

    GRID.addEventListener("click", function (e) {
      // Click en icono RRSS: deja que el <a> navegue y no abras modal
      if (e.target.closest(".platform-icon-btn")) return;

      const card = e.target.closest(".creator-card");
      if (!card) return;

      // Mantener el comportamiento original: solo avatar/username abren modal
      const wantsOpen =
        !!e.target.closest(".creator-avatar-wrapper") ||
        !!e.target.closest(".creator-username-btn");

      if (!wantsOpen) return;

      const id = Number(card.dataset.id);
      const creator = creatorById.get(id);
      if (!creator) return;

      if (window.VSDModal) window.VSDModal.open(creator);
    });
  }

  function init(creators) {
    allCreators = (creators || []).slice();
    creatorById = new Map(allCreators.map(c => [Number(c.id), c]));

    if (!initialized) {
      initialized = true;

      // Aleatorio al cargar
      randomOrder = shuffle(allCreators);

      updateSortButtonUI();
      recomputeFiltered();
      renderUntilSentinelOutOfView();

      initObserverOnce();
      attachGridDelegatedClicksOnce();

      if (SORT_BTN) {
        SORT_BTN.addEventListener("click", function (e) {
          e.stopPropagation();
          cycleSortMode(e);
        });
      }

      return;
    }

    // Si ya estaba inicializado (por ejemplo hot-reload), solo re-render
    randomOrder = shuffle(allCreators);
    updateSortButtonUI();
    resetAndRender();
  }

  window.VSDInfiniteScroll = {
    init,
    resetAndRender
  };
})();