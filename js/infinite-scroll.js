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

  let creatorById = new Map();

  let sortMode = "random";
  let randomOrder = [];

  let lastSortClickTs = 0;
  let isRendering = false;

  let liveByUser = {};

  function normalizeBasePath(path) {
    const safe = String(path || "").trim();
    if (!safe || safe === "/") return "/";
    return `/${safe.replace(/^\/+|\/+$/g, "")}/`;
  }

  function getFallbackBasePath() {
    const parts = window.location.pathname.split("/").filter(Boolean);

    if (window.location.hostname.endsWith("github.io") && parts.length > 0) {
      return normalizeBasePath(parts[0]);
    }

    return "/";
  }

  function getProfileUrl(username) {
    const safeUsername = String(username || "").trim();
    if (!safeUsername) return "#";

    if (window.VSDRouting && typeof window.VSDRouting.getProfileUrl === "function") {
      return window.VSDRouting.getProfileUrl(safeUsername);
    }

    return `${getFallbackBasePath()}u/${encodeURIComponent(safeUsername)}/`;
  }

  function resolveAssetUrl(path) {
    const raw = String(path || "").trim();
    if (!raw) return "assets/avatar-placeholder-1.png";

    if (
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("//")
    ) {
      return raw;
    }

    const basePath =
      window.VSDRouting && window.VSDRouting.BASE_PATH
        ? window.VSDRouting.BASE_PATH
        : getFallbackBasePath();

    return `${basePath}${raw.replace(/^\/+/, "")}`;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function normalizeTwitchHandle(v) {
    return String(v || "").trim().replace(/^@/, "").toLowerCase();
  }

  function isCreatorLiveNow(c) {
    const p = String(c?.streamPlatform || "").trim().toLowerCase();
    if (p !== "twitch") return false;

    const h = normalizeTwitchHandle(c?.socials?.twitch);
    return !!h && liveByUser[h] === true;
  }

  function buildRandomOrderWithLivePriority(list) {
    const live = [];
    const rest = [];

    list.forEach(c => (isCreatorLiveNow(c) ? live : rest).push(c));

    return shuffle(live).concat(shuffle(rest));
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
    a.className = `platform-icon-btn platform-icon-btn--${key}`;
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.title = SOCIAL_LABEL[key] || key;
    a.setAttribute("aria-label", SOCIAL_LABEL[key] || key);

    a.dataset.platform = key;

    const icon = document.createElement("span");
    icon.className = `rrss-icon rrss--${key}`;
    icon.setAttribute("aria-hidden", "true");

    a.appendChild(icon);
    return a;
  }

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
    card.tabIndex = 0;
    if (creator && creator.id != null) card.dataset.id = creator.id;
    card.dataset.username = creator && creator.username ? String(creator.username) : "";

    card.dataset.twitch = (creator && creator.socials && creator.socials.twitch)
      ? String(creator.socials.twitch)
      : "";

    const avatarWrapper = document.createElement("div");
    avatarWrapper.className = "creator-avatar-wrapper";

    const img = document.createElement("img");
    img.className = "creator-avatar";
    img.alt = `Avatar de ${creator.username || "creador"}`;
    img.loading = "lazy";
    img.src = resolveAssetUrl(creator.avatar_url || "assets/avatar-placeholder-1.png");

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

  function rearmObserver() {
    if (!observer || !SENTINEL) return;
    observer.unobserve(SENTINEL);
    observer.observe(SENTINEL);
  }

  function resetAndRender() {
    if (!GRID) return;

    GRID.replaceChildren();
    renderedCount = 0;

    if (sortMode === "random") {
      randomOrder = buildRandomOrderWithLivePriority(allCreators);
    }

    recomputeFiltered();
    renderUntilSentinelOutOfView();
    rearmObserver();

    requestAnimationFrame(() => {
      renderUntilSentinelOutOfView();
      rearmObserver();
    });
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

  function goToCreatorProfile(card) {
    if (!card) return;
    const username = String(card.dataset.username || "").trim();
    if (!username) return;
    window.location.href = getProfileUrl(username);
  }

  function attachGridDelegatedClicksOnce() {
    if (!GRID) return;
    if (GRID.__vsdDelegationInit) return;
    GRID.__vsdDelegationInit = true;

    GRID.addEventListener("click", function (e) {
      if (e.target.closest(".platform-icon-btn")) return;
      const card = e.target.closest(".creator-card");
      if (!card) return;
      goToCreatorProfile(card);
    });

    GRID.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest(".creator-card");
      if (!card) return;
      if (e.target.closest(".platform-icon-btn")) return;
      e.preventDefault();
      goToCreatorProfile(card);
    });
  }

  window.addEventListener("twitch:live-update", function (e) {
    liveByUser = (e && e.detail && e.detail.liveByUser) ? e.detail.liveByUser : {};

    if (sortMode === "random") {
      randomOrder = buildRandomOrderWithLivePriority(allCreators);
      resetAndRender();
    }
  });

  function init(creators) {
    allCreators = (creators || []).slice();
    creatorById = new Map(allCreators.map(c => [Number(c.id), c]));

    if (!initialized) {
      initialized = true;

      randomOrder = buildRandomOrderWithLivePriority(allCreators);

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

    randomOrder = buildRandomOrderWithLivePriority(allCreators);
    updateSortButtonUI();
    resetAndRender();
  }

  window.VSDInfiniteScroll = {
    init,
    resetAndRender
  };
})();
