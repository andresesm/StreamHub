(function () {
  const DATA_URL = "data/creators.json";

  function fetchCreators() {
    return fetch(DATA_URL)
      .then(r => r.json())
      .catch(err => {
        console.error("Error loading creators.json", err);
        return [];
      });
  }

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
    if (window.VSDPlatformIcons && typeof window.VSDPlatformIcons.getLink === "function") {
      return window.VSDPlatformIcons.getLink(creator, key);
    }
    const v = getSocialValue(creator, key);
    return buildUrlFromHandle(key, v);
  }

  function createModalSocialIcon(creator, key) {
    const url = getCreatorLink(creator, key);
    if (!url) return null;

    const a = document.createElement("a");
    a.className = "modal-platform-icon";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.title = SOCIAL_LABEL[key] || key;
    a.setAttribute("aria-label", SOCIAL_LABEL[key] || key);

    const icon = document.createElement("span");
    icon.className = `rrss-icon rrss--${key}`;
    icon.setAttribute("aria-hidden", "true");

    a.appendChild(icon);
    return a;
  }

  function openInNewTab(url) {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function initModal() {
    const backdrop = document.getElementById("profileModal");
    const blurOverlay = document.getElementById("appBlurOverlay");
    const closeBtn = document.getElementById("modalCloseBtn");

    const avatar = document.getElementById("modalAvatar");
    const usernameEl = document.getElementById("modalUsername");
    const bioEl = document.getElementById("modalBio");

    const tagsContainer = document.getElementById("modalTagsContainer");
    const gamesContainer = document.getElementById("modalGamesContainer");

    const followersEl = document.getElementById("modalFollowers");
    const residenceEl = document.getElementById("modalLiveStatus");
    const nationalityEl = document.getElementById("modalStreamTitle");

    const twitchBtn = document.getElementById("modalTwitchButton");
    const platformsContainer = document.getElementById("modalPlatformsContainer");

    const twitchFollowersBlock = backdrop.querySelector("[data-modal-twitch-followers]");
    const streamButtonMarker = backdrop.querySelector("[data-modal-twitch-button]") || twitchBtn;

    let currentCreator = null;
    let modalPushedState = false;

    function setDisplay(el, show, displayValue) {
      if (!el) return;
      el.style.display = show ? (displayValue || "") : "none";
    }

    function hasText(v) {
      return v != null && String(v).trim().length > 0;
    }

    function getUiFlag(creator, flagName) {
      return !!(creator && creator.ui && creator.ui[flagName] === true);
    }

    function getStreamPlatform(creator) {
      const raw =
        (creator && (creator.streamPlatform || creator.StreamPlatform || creator.stream_platform)) || "";
      const p = String(raw).trim().toLowerCase();
      if (["twitch", "kick", "youtube", "tiktok", "none"].includes(p)) return p;
      return "twitch";
    }

    function setStreamButtonState(platform, url) {
      const allPlatformClasses = ["platform--twitch", "platform--kick", "platform--youtube", "platform--tiktok"];
      twitchBtn.classList.remove(...allPlatformClasses);

      twitchBtn.dataset.platform = platform;

      if (platform === "none" || !url) {
        if (streamButtonMarker) streamButtonMarker.hidden = true;
        twitchBtn.disabled = true;
        twitchBtn.dataset.twitchUrl = "";
        return;
      }

      if (streamButtonMarker) streamButtonMarker.hidden = false;

      const label =
        platform === "twitch" ? "Twitch" :
        platform === "kick" ? "Kick" :
        platform === "youtube" ? "YouTube" :
        platform === "tiktok" ? "TikTok" :
        "Perfil";

      twitchBtn.textContent = `Abrir perfil de ${label}`;
      twitchBtn.classList.add(`platform--${platform}`);

      twitchBtn.disabled = false;
      twitchBtn.dataset.twitchUrl = url;
      twitchBtn.style.opacity = "";
      twitchBtn.style.cursor = "";
    }

    function close(opts) {
      const fromPopstate = opts && opts.fromPopstate;

      backdrop.classList.remove("is-visible");
      backdrop.setAttribute("aria-hidden", "true");
      blurOverlay.classList.remove("is-active");
      document.body.style.overflow = "";
      currentCreator = null;

      if (!fromPopstate && modalPushedState) {
        modalPushedState = false;
        history.back();
      }
    }

    function open(creator) {
      currentCreator = creator;

      if (!modalPushedState) {
        history.pushState({ vsdModal: true }, "", window.location.href);
        modalPushedState = true;
      }

      avatar.src = creator.avatar_url || "assets/avatar-placeholder-1.png";
      avatar.alt = `Avatar de ${creator.username}`;
      usernameEl.textContent = `@${creator.username}`;

      if (hasText(creator.bio)) {
        bioEl.textContent = creator.bio;
        setDisplay(bioEl, true);
      } else {
        bioEl.textContent = "";
        setDisplay(bioEl, false);
      }

      tagsContainer.innerHTML = "";
      (creator.tags || []).forEach(tag => {
        const span = document.createElement("span");
        span.className = "modal-tag-pill";
        span.textContent = tag;
        tagsContainer.appendChild(span);
      });

      gamesContainer.innerHTML = "";
      (creator.games || []).forEach(game => {
        const span = document.createElement("span");
        span.className = "modal-tag-pill";
        span.textContent = game;
        gamesContainer.appendChild(span);
      });

      const uiHideTwitch = getUiFlag(creator, "hide_twitch");
      const streamPlatform = uiHideTwitch ? "none" : getStreamPlatform(creator);

      const showTwitchFollowers = (streamPlatform === "twitch");
      if (twitchFollowersBlock) twitchFollowersBlock.hidden = !showTwitchFollowers;

      if (followersEl) {
        followersEl.textContent = showTwitchFollowers
          ? (hasText(creator.followers) ? String(creator.followers) : "—")
          : "";
      }

      residenceEl.textContent = creator.residence || "Desconocido";
      nationalityEl.textContent = creator.nationality || "Sin datos";

      platformsContainer.innerHTML = "";
      const order =
        (window.VSDPlatformIcons && Array.isArray(window.VSDPlatformIcons.ORDER))
          ? window.VSDPlatformIcons.ORDER
          : SOCIAL_ORDER;

      order.forEach(key => {
        const el = createModalSocialIcon(creator, key);
        if (el) platformsContainer.appendChild(el);
      });

      const streamUrl = (streamPlatform === "none") ? "" : getCreatorLink(creator, streamPlatform);
      setStreamButtonState(streamPlatform, streamUrl);

      backdrop.setAttribute("aria-hidden", "false");
      backdrop.classList.add("is-visible");
      blurOverlay.classList.add("is-active");
      document.body.style.overflow = "hidden";

      if (closeBtn) closeBtn.focus();
    }

    window.addEventListener("popstate", function () {
      const isOpen = backdrop.classList.contains("is-visible");
      if (!isOpen) return;

      modalPushedState = false;
      close({ fromPopstate: true });
    });

    backdrop.addEventListener("click", function (evt) {
      if (evt.target === backdrop) close();
    });

    closeBtn.addEventListener("click", function () {
      close();
    });

    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape") close();
    });

    if (twitchBtn) {
      twitchBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (twitchBtn.disabled) return;

        const platform = (twitchBtn.dataset.platform || "").toLowerCase();
        if (!currentCreator || !platform || platform === "none") return;

        const url = getCreatorLink(currentCreator, platform);
        if (!url) return;
        openInNewTab(url);
      });
    }

    window.VSDModal = { open, close };
  }

  document.addEventListener("DOMContentLoaded", function () {
    initModal();

    fetchCreators().then(creators => {
      if (window.TwitchIntegration && typeof window.TwitchIntegration.init === "function") {
        window.TwitchIntegration.init(creators);
      }

      if (window.VSDFilters) window.VSDFilters.init(creators);
      if (window.VSDInfiniteScroll) window.VSDInfiniteScroll.init(creators);
    });

    /* ==========================
       Conexión navbar móvil
       ========================== */
    const navHome = document.querySelector("[data-nav-home]");
    const navCredits = document.querySelector("[data-nav-credits]");
    const navTheme = document.querySelector("[data-nav-theme]");
    const navSearch = document.querySelector("[data-nav-search]");

    const footerCreditsBtn = document.getElementById("footerCreditsBtn");
    const floatingThemeToggle = document.getElementById("floatingThemeToggle");

    /* ===== Sync UI tema en navbar (clona icon + badge) ===== */
    function syncThemeIconToNav() {
      const dst = document.querySelector("[data-nav-theme] .mobile-nav__theme-ui");
      const floatingBtn = document.getElementById("floatingThemeToggle");
      if (!dst || !floatingBtn) return;

      const icon = floatingBtn.querySelector(".floating-theme-icon");
      const badge = floatingBtn.querySelector(".floating-theme-badge");

      dst.innerHTML = "";
      if (icon) dst.appendChild(icon.cloneNode(true));
      if (badge) dst.appendChild(badge.cloneNode(true));
    }

    syncThemeIconToNav();

    const floating = document.getElementById("floatingThemeToggle");
    if (floating) {
      new MutationObserver(syncThemeIconToNav).observe(floating, {
        subtree: true,
        childList: true,
        characterData: true
      });
    }

    new MutationObserver(syncThemeIconToNav).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"]
    });

    // ===== History state: Créditos =====
    const creditsModal = document.getElementById("creditsModal");
    const creditsCloseBtn = document.getElementById("creditsCloseBtn");
    let creditsPushedState = false;

    function isCreditsOpen() {
      return creditsModal && creditsModal.classList.contains("is-visible");
    }

    function pushCreditsState() {
      if (creditsPushedState) return;
      history.pushState({ vsdCredits: true }, "", window.location.href);
      creditsPushedState = true;
    }

    // Detectar apertura por footer/nav (o cualquier otra vía)
    if (creditsModal) {
      new MutationObserver(() => {
        if (isCreditsOpen()) pushCreditsState();
      }).observe(creditsModal, { attributes: true, attributeFilter: ["class", "aria-hidden"] });
    }

    // Home: scroll al inicio
    if (navHome) {
      navHome.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Créditos: toggle (con state)
    if (navCredits) {
      navCredits.addEventListener("click", function () {
        const isOpen = isCreditsOpen();

        if (isOpen) {
          if (creditsPushedState) history.back();
          else if (creditsCloseBtn) creditsCloseBtn.click();
          return;
        }

        pushCreditsState();
        if (footerCreditsBtn) footerCreditsBtn.click();
        else window.dispatchEvent(new CustomEvent("vsd:open-credits"));
      });
    }

    // Tema: reutiliza el botón flotante
    if (navTheme && floatingThemeToggle) {
      navTheme.addEventListener("click", function () {
        floatingThemeToggle.click();
        setTimeout(syncThemeIconToNav, 0);
      });
    }

    void navSearch;

    /* ==========================
       Panel búsqueda móvil
       ========================== */
    const mobileSearchPanel = document.getElementById("mobileSearchPanel");
    const mobileSearchCloseBtn = document.getElementById("mobileSearchCloseBtn");

    const navSearchBtn = document.querySelector("[data-nav-search]");
    const mobileSearchDummyCloseBtn = document.querySelector("[data-mobile-search-close]");

    const mobileNav = document.querySelector(".mobile-nav");

    const searchInput = document.getElementById("searchInput");
    const filtersPanel = document.getElementById("filtersPanel");
    const platformSelectWrap = document.getElementById("platformSelectWrap");
    const sortAlphaBtn = document.getElementById("sortAlphaBtn");
    const clearFiltersBtn = document.getElementById("clearFiltersBtn");
    const liveToggleBtn = document.getElementById("liveToggleBtn");

    const gamesToggleBtn = document.getElementById("gamesToggleBtn");
    const gamesPanel = document.getElementById("gamesPanel");
    const gamesFilterGroup = document.querySelector(".games-filter-group");

    const panelSearchMount = mobileSearchPanel ? mobileSearchPanel.querySelector(".mobile-search-panel__search") : null;
    const panelFiltersMount = mobileSearchPanel ? mobileSearchPanel.querySelector(".mobile-search-panel__filters") : null;
    const panelPlatformsMount = mobileSearchPanel ? mobileSearchPanel.querySelector(".mobile-search-panel__platforms") : null;

    const searchAnchor = document.createComment("searchInput-anchor");
    const filtersAnchor = document.createComment("filtersPanel-anchor");
    const platformAnchor = document.createComment("platformSelectWrap-anchor");
    const sortAnchor = document.createComment("sortAlphaBtn-anchor");
    const clearAnchor = document.createComment("clearFiltersBtn-anchor");
    const liveAnchor = document.createComment("liveToggleBtn-anchor");

    let panelIsOpen = false;

    // ===== History state: Search panel =====
    let searchPushedState = false;
    function pushSearchState() {
      if (searchPushedState) return;
      history.pushState({ vsdSearchPanel: true }, "", window.location.href);
      searchPushedState = true;
    }

    function ensureAnchors() {
      if (searchInput && !searchAnchor.parentNode) searchInput.parentNode.insertBefore(searchAnchor, searchInput);
      if (filtersPanel && !filtersAnchor.parentNode) filtersPanel.parentNode.insertBefore(filtersAnchor, filtersPanel);
      if (platformSelectWrap && !platformAnchor.parentNode) platformSelectWrap.parentNode.insertBefore(platformAnchor, platformSelectWrap);
      if (sortAlphaBtn && !sortAnchor.parentNode) sortAlphaBtn.parentNode.insertBefore(sortAnchor, sortAlphaBtn);
      if (clearFiltersBtn && !clearAnchor.parentNode) clearFiltersBtn.parentNode.insertBefore(clearAnchor, clearFiltersBtn);
      if (liveToggleBtn && !liveAnchor.parentNode) liveToggleBtn.parentNode.insertBefore(liveAnchor, liveToggleBtn);
    }

    function openMobileSearchPanel() {
      if (!mobileSearchPanel || !panelSearchMount || !panelFiltersMount || !panelPlatformsMount) return;
      ensureAnchors();

      if (window.matchMedia && !window.matchMedia("(max-width: 899px)").matches) return;

      if (mobileNav) mobileNav.style.display = "none";
      if (mobileSearchDummyCloseBtn) mobileSearchDummyCloseBtn.style.display = "inline-flex";

      if (searchInput) panelSearchMount.appendChild(searchInput);
      if (filtersPanel) panelFiltersMount.appendChild(filtersPanel);

      if (clearFiltersBtn) panelPlatformsMount.appendChild(clearFiltersBtn);
      if (platformSelectWrap) panelPlatformsMount.appendChild(platformSelectWrap);
      if (liveToggleBtn) panelPlatformsMount.appendChild(liveToggleBtn);
      if (sortAlphaBtn) panelPlatformsMount.appendChild(sortAlphaBtn);

      const liveInFilters = document.getElementById("liveToggleBtn");
      if (liveInFilters) panelPlatformsMount.appendChild(liveInFilters);

      const gamesGroup = filtersPanel ? filtersPanel.querySelector(".games-filter-group") : null;
      if (gamesGroup) {
        let gamesTitle = filtersPanel.querySelector("#mobileGamesTitle");
        if (!gamesTitle) {
          gamesTitle = document.createElement("div");
          gamesTitle.id = "mobileGamesTitle";
          gamesTitle.className = "mobile-search-panel__section-title mobile-search-panel__section-title--spaced";
          gamesTitle.textContent = "Filtrar por juegos";
        }
        gamesGroup.parentNode.insertBefore(gamesTitle, gamesGroup);
      }

      if (filtersPanel) {
        filtersPanel.classList.add("is-open");
        filtersPanel.setAttribute("aria-hidden", "false");
      }

      if (gamesToggleBtn) gamesToggleBtn.style.display = "none";
      if (gamesPanel) {
        gamesPanel.classList.add("is-open");
        gamesPanel.setAttribute("aria-hidden", "false");
      }
      if (gamesFilterGroup) gamesFilterGroup.style.display = "";

      mobileSearchPanel.setAttribute("aria-hidden", "false");
      document.body.classList.add("mobile-search-open");
      panelIsOpen = true;

      pushSearchState();

      if (searchInput) setTimeout(() => searchInput.focus(), 0);
    }

    function closeMobileSearchPanel() {
      if (!mobileSearchPanel) return;
      ensureAnchors();

      if (mobileNav) mobileNav.style.display = "";
      if (mobileSearchDummyCloseBtn) mobileSearchDummyCloseBtn.style.display = "";

      if (searchInput && searchAnchor.parentNode) searchAnchor.parentNode.insertBefore(searchInput, searchAnchor.nextSibling);
      if (filtersPanel && filtersAnchor.parentNode) filtersAnchor.parentNode.insertBefore(filtersPanel, filtersAnchor.nextSibling);
      if (platformSelectWrap && platformAnchor.parentNode) platformAnchor.parentNode.insertBefore(platformSelectWrap, platformAnchor.nextSibling);
      if (sortAlphaBtn && sortAnchor.parentNode) sortAnchor.parentNode.insertBefore(sortAlphaBtn, sortAnchor.nextSibling);
      if (clearFiltersBtn && clearAnchor.parentNode) clearAnchor.parentNode.insertBefore(clearFiltersBtn, clearAnchor.nextSibling);
      if (liveToggleBtn && liveAnchor.parentNode) liveAnchor.parentNode.insertBefore(liveToggleBtn, liveAnchor.nextSibling);

      if (filtersPanel) {
        filtersPanel.classList.remove("is-open");
        filtersPanel.setAttribute("aria-hidden", "true");
      }

      if (gamesToggleBtn) gamesToggleBtn.style.display = "";
      if (gamesPanel) {
        gamesPanel.classList.remove("is-open");
        gamesPanel.setAttribute("aria-hidden", "true");
      }

      // Evitar aria-hidden sobre un ancestro que contiene el foco
      const active = document.activeElement;
      if (active && mobileSearchPanel.contains(active)) {
        if (navSearchBtn) navSearchBtn.focus();
        else document.body.focus();
      }

      mobileSearchPanel.setAttribute("aria-hidden", "true");
      document.body.classList.remove("mobile-search-open");
      panelIsOpen = false;
      searchPushedState = false;
    }

    function toggleMobileSearchPanel() {
      if (panelIsOpen) {
        if (searchPushedState) history.back();
        else closeMobileSearchPanel();
      } else {
        openMobileSearchPanel();
      }
    }

    if (navSearchBtn) {
      navSearchBtn.addEventListener("click", function () {
        toggleMobileSearchPanel();
      });
    }

    if (mobileSearchCloseBtn) {
      mobileSearchCloseBtn.addEventListener("click", function () {
        if (searchPushedState) history.back();
        else closeMobileSearchPanel();
      });
    }

    if (mobileSearchDummyCloseBtn) {
      mobileSearchDummyCloseBtn.addEventListener("click", function () {
        if (searchPushedState) history.back();
        else closeMobileSearchPanel();
      });
    }

    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape" && panelIsOpen) {
        if (searchPushedState) history.back();
        else closeMobileSearchPanel();
      }
    });

    // ===== Popstate global: cerrar panel/créditos con back sin salir del sitio =====
    window.addEventListener("popstate", function () {
      if (panelIsOpen) {
        closeMobileSearchPanel();
        return;
      }

      if (isCreditsOpen()) {
        creditsPushedState = false;

        // mover foco fuera antes de aria-hidden (por seguridad)
        const active = document.activeElement;
        if (active && creditsModal && creditsModal.contains(active) && footerCreditsBtn) footerCreditsBtn.focus();

        if (creditsCloseBtn) creditsCloseBtn.click();
        return;
      }
    });




    
  });
})();
