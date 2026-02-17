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

    function close() {
      backdrop.classList.remove("is-visible");
      backdrop.setAttribute("aria-hidden", "true");
      blurOverlay.classList.remove("is-active");
      document.body.style.overflow = "";
      currentCreator = null;
    }

    function open(creator) {
      currentCreator = creator;

      avatar.src = creator.avatar_url || "assets/avatar-placeholder-1.png";
      avatar.alt = `Avatar de ${creator.username}`;
      usernameEl.textContent = `@${creator.username}`;
      bioEl.textContent = creator.bio || "Este creador aún no tiene biografía.";

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

      followersEl.textContent = creator.followers || "—";
      residenceEl.textContent = creator.residence || "Desconocido";
      nationalityEl.textContent = creator.nationality || "Sin datos";

      // ✅ Redes en orden fijo, basadas en creator.socials
      platformsContainer.innerHTML = "";

      const order =
        (window.VSDPlatformIcons && Array.isArray(window.VSDPlatformIcons.ORDER))
          ? window.VSDPlatformIcons.ORDER
          : SOCIAL_ORDER;

      order.forEach(key => {
        const el = createModalSocialIcon(creator, key);
        if (el) platformsContainer.appendChild(el);
      });

      // Botón Twitch: ahora sale desde socials (o fallback compat)
      const twitchUrl = getCreatorLink(creator, "twitch");
      if (twitchUrl) {
        twitchBtn.dataset.twitchUrl = twitchUrl;
        twitchBtn.disabled = false;
        twitchBtn.style.opacity = "";
        twitchBtn.style.cursor = "";
      } else {
        twitchBtn.dataset.twitchUrl = "";
        twitchBtn.disabled = true;
        twitchBtn.style.opacity = "0.6";
        twitchBtn.style.cursor = "not-allowed";
      }

      backdrop.setAttribute("aria-hidden", "false");
      backdrop.classList.add("is-visible");
      blurOverlay.classList.add("is-active");
      document.body.style.overflow = "hidden";

      if (closeBtn) closeBtn.focus();
    }

    backdrop.addEventListener("click", function (evt) {
      if (evt.target === backdrop) close();
    });

    closeBtn.addEventListener("click", close);

    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape") close();
    });

    twitchBtn.addEventListener("click", function () {
      const url = twitchBtn.dataset.twitchUrl;
      if (!url) return;
      window.open(url, "_blank", "noopener");
    });

    window.VSDModal = { open, close };
  }

  document.addEventListener("DOMContentLoaded", function () {
    initModal();

    fetchCreators().then(creators => {
      if (window.VSDFilters) window.VSDFilters.init(creators);
      if (window.VSDInfiniteScroll) window.VSDInfiniteScroll.init(creators);
    });
  });
})();