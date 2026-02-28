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

  // Orden fijo requerido (debe coincidir con infinite-scroll.js)
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

    // compat viejo (opcional)
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

    // Elementos específicos a ocultar/mostrar
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

    // NUEVO: determinar plataforma principal desde creators.json
    function getStreamPlatform(creator) {
      const raw =
        (creator && (creator.streamPlatform || creator.StreamPlatform || creator.stream_platform)) || "";
      const p = String(raw).trim().toLowerCase();
      if (["twitch", "kick", "youtube", "tiktok", "none"].includes(p)) return p;
      // fallback para no romper perfiles existentes
      return "twitch";
    }

    function setStreamButtonState(platform, url) {
      // limpiar clases previas
      const allPlatformClasses = ["platform--twitch", "platform--kick", "platform--youtube", "platform--tiktok"];
      twitchBtn.classList.remove(...allPlatformClasses); // classList API [web:28]

      // guardar plataforma actual (útil para click handler)
      twitchBtn.dataset.platform = platform; // dataset [web:70]

      if (platform === "none" || !url) {
        // Oculta botón totalmente
        if (streamButtonMarker) streamButtonMarker.hidden = true; // hidden [web:47]
        twitchBtn.disabled = true;
        twitchBtn.dataset.twitchUrl = "";
        return;
      }

      // Muestra botón
      if (streamButtonMarker) streamButtonMarker.hidden = false; // hidden [web:47]

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

      // BIO
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

      // Plataforma principal
      // Si aún tienes ui.hide_twitch heredado, lo tratamos como "none" para no romper tu configuración anterior.
      const uiHideTwitch = getUiFlag(creator, "hide_twitch");
      const streamPlatform = uiHideTwitch ? "none" : getStreamPlatform(creator);

      // Followers SOLO si la plataforma es Twitch
      const showTwitchFollowers = (streamPlatform === "twitch");
      if (twitchFollowersBlock) twitchFollowersBlock.hidden = !showTwitchFollowers; // hidden [web:47]

      if (followersEl) {
        followersEl.textContent = showTwitchFollowers
          ? (hasText(creator.followers) ? String(creator.followers) : "—")
          : "";
      }

      residenceEl.textContent = creator.residence || "Desconocido";
      nationalityEl.textContent = creator.nationality || "Sin datos";

      // Redes (iconitos)
      platformsContainer.innerHTML = "";
      const order =
        (window.VSDPlatformIcons && Array.isArray(window.VSDPlatformIcons.ORDER))
          ? window.VSDPlatformIcons.ORDER
          : SOCIAL_ORDER;

      order.forEach(key => {
        const el = createModalSocialIcon(creator, key);
        if (el) platformsContainer.appendChild(el);
      });

      // Botón principal según plataforma
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

    // Botón grande (ahora multi-plataforma)
    if (twitchBtn) {
      twitchBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (twitchBtn.disabled) return;

        const platform = (twitchBtn.dataset.platform || "").toLowerCase(); // dataset [web:70]
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
      // TwitchIntegration puede seguir existiendo; solo “importa” para los que tengan streamPlatform=twitch
      if (window.TwitchIntegration && typeof window.TwitchIntegration.init === "function") {
        window.TwitchIntegration.init(creators);
      }

      if (window.VSDFilters) window.VSDFilters.init(creators);
      if (window.VSDInfiniteScroll) window.VSDInfiniteScroll.init(creators);
    });
  });
})();