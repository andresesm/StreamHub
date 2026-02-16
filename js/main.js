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
    const liveStatusEl = document.getElementById("modalLiveStatus");
    const streamTitleEl = document.getElementById("modalStreamTitle");
    const twitchBtn = document.getElementById("modalTwitchButton");
    const platformsContainer = document.getElementById("modalPlatformsContainer");

    let currentCreator = null;

    function close() {
      backdrop.classList.remove("is-visible");
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

      followersEl.textContent = "—";
      liveStatusEl.textContent = "Desconocido";
      streamTitleEl.textContent = "Sin datos";

      platformsContainer.innerHTML = "";
      (creator.platforms || []).forEach(p => {
        const btn = document.createElement("div");
        btn.className = "modal-platform-icon";
        btn.textContent = p;
        platformsContainer.appendChild(btn);
      });

      const twitchId = creator.twitch_id || creator.username;
      const twitchUrl = `https://twitch.tv/${encodeURIComponent(twitchId)}`;
      twitchBtn.dataset.twitchUrl = twitchUrl;

      backdrop.classList.add("is-visible");
      blurOverlay.classList.add("is-active");
      document.body.style.overflow = "hidden";
    }

    backdrop.addEventListener("click", function (evt) {
      if (evt.target === backdrop) {
        close();
      }
    });

    closeBtn.addEventListener("click", close);

    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape") {
        close();
      }
    });

    twitchBtn.addEventListener("click", function () {
      const url = twitchBtn.dataset.twitchUrl;
      if (!url) return;
      window.open(url, "_blank", "noopener");
    });

    window.VSDModal = {
      open,
      close
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    initModal();

    fetchCreators().then(creators => {
      if (window.VSDFilters) {
        window.VSDFilters.init(creators);
      }
      if (window.VSDInfiniteScroll) {
        window.VSDInfiniteScroll.init(creators);
      }
    });
  });
})();
