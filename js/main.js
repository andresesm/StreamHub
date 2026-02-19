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

  // Nuevo schema: creator.socials[key] = handle/url/email
  // Mantengo compat con creator.links por si quedan datos viejos.
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
    // Si infinite-scroll ya expuso helpers, úsalo (así home y popup son idénticos)
    if (window.VSDPlatformIcons && typeof window.VSDPlatformIcons.getLink === "function") {
      return window.VSDPlatformIcons.getLink(creator, key);
    }

    // fallback interno
    const v = getSocialValue(creator, key);
    return buildUrlFromHandle(key, v);
  }

  // Crea el icono para el popup (clase distinta a la del home)
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

  // ✅ Método robusto para abrir nueva pestaña (especialmente en móvil)
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

    let currentCreator = null;

    // History API: para que “atrás” cierre el modal en móvil en vez de salir del sitio
    let modalPushedState = false;

    function setDisplay(el, show, displayValue) {
      if (!el) return;
      el.style.display = show ? (displayValue || "") : "none";
    }

    function hasText(v) {
      return v != null && String(v).trim().length > 0;
    }

    function setTwitchCtaState(url) {
      if (!twitchBtn) return;

      // Si es un <button>, asegura que no dispare submits accidentales
      if (twitchBtn.tagName === "BUTTON") twitchBtn.type = "button";

      if (url) {
        twitchBtn.dataset.twitchUrl = url;
        twitchBtn.disabled = false;
        twitchBtn.style.opacity = "";
        twitchBtn.style.cursor = "";
        twitchBtn.setAttribute("aria-disabled", "false");
      } else {
        twitchBtn.dataset.twitchUrl = "";
        twitchBtn.disabled = true;
        twitchBtn.style.opacity = "0.6";
        twitchBtn.style.cursor = "not-allowed";
        twitchBtn.setAttribute("aria-disabled", "true");
      }
    }

    function close(opts) {
      const fromPopstate = opts && opts.fromPopstate;

      backdrop.classList.remove("is-visible");
      backdrop.setAttribute("aria-hidden", "true");
      blurOverlay.classList.remove("is-active");
      document.body.style.overflow = "";
      currentCreator = null;

      // Si se cerró por UI (X/click afuera/ESC), limpiamos el estado extra del history
      if (!fromPopstate && modalPushedState) {
        modalPushedState = false;
        history.back();
      }
    }

    function open(creator) {
      currentCreator = creator;

      // Empuja un estado al abrir para que “atrás” cierre el modal (no salga del sitio)
      if (!modalPushedState) {
        history.pushState({ vsdModal: true }, "", window.location.href);
        modalPushedState = true;
      }

      avatar.src = creator.avatar_url || "assets/avatar-placeholder-1.png";
      avatar.alt = `Avatar de ${creator.username}`;
      usernameEl.textContent = `@${creator.username}`;

      // BIO: si no hay bio, se oculta el elemento completo (sin placeholder)
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

      // FOLLOWERS: si no hay followers, oculta el bloque completo
      const followersBlock =
        followersEl && (followersEl.closest(".twitch-stat") || followersEl.parentElement);

      if (followersEl && hasText(creator.followers)) {
        followersEl.textContent = creator.followers;
        setDisplay(followersBlock, true);
      } else if (followersEl) {
        followersEl.textContent = "";
        setDisplay(followersBlock, false);
      }

      residenceEl.textContent = creator.residence || "Desconocido";
      nationalityEl.textContent = creator.nationality || "Sin datos";

      // Redes en orden fijo
      platformsContainer.innerHTML = "";
      const order =
        (window.VSDPlatformIcons && Array.isArray(window.VSDPlatformIcons.ORDER))
          ? window.VSDPlatformIcons.ORDER
          : SOCIAL_ORDER;

      order.forEach(key => {
        const el = createModalSocialIcon(creator, key);
        if (el) platformsContainer.appendChild(el);
      });

      // ✅ CTA Twitch: usa EXACTAMENTE el mismo generador de link que el icono
      const twitchUrl = getCreatorLink(creator, "twitch");
      setTwitchCtaState(twitchUrl);

      backdrop.setAttribute("aria-hidden", "false");
      backdrop.classList.add("is-visible");
      blurOverlay.classList.add("is-active");
      document.body.style.overflow = "hidden";

      if (closeBtn) closeBtn.focus();
    }

    // Atrás (gesto/botón): cerrar modal
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

    // ✅ Botón grande Twitch: abre en nueva pestaña, mismo URL que el icono
    if (twitchBtn) {
      twitchBtn.addEventListener("click", function (e) {
        e.preventDefault();

        // Si está disabled, no hacemos nada
        if (twitchBtn.disabled) return;

        // No dependemos del dataset: recalculamos desde currentCreator para que sea 1:1 con el icono
        const url = currentCreator ? getCreatorLink(currentCreator, "twitch") : "";
        if (!url) return;

        openInNewTab(url);
      });
    }

    window.VSDModal = { open, close };
  }

  document.addEventListener("DOMContentLoaded", function () {
    initModal();

    fetchCreators().then(creators => {
      if (window.VSDFilters) window.VSDFilters.init(creators);
      if (window.VSDInfiniteScroll) window.VSDInfiniteScroll.init(creators);
    });
  });

  document.addEventListener("DOMContentLoaded", function () {
      initModal();

      fetchCreators().then(creators => {
          if (window.VSDFilters) window.VSDFilters.init(creators);
          if (window.VSDInfiniteScroll) window.VSDInfiniteScroll.init(creators);
          
          if (window.TwitchIntegration) {
              window.TwitchIntegration.init(creators);
          }
      });
  });
})();