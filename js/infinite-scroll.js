(function () {
  const GRID = document.getElementById("creatorsGrid");
  const SENTINEL = document.getElementById("gridSentinel");
  const LOADER = document.getElementById("loadingIndicator");
  const BATCH_SIZE = 20;

  let allCreators = [];
  let filteredCreators = [];
  let renderedCount = 0;
  let observer = null;

  function createPlatformIcon(platform) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "platform-icon-btn";
    btn.title = platform;
    btn.setAttribute("aria-label", platform);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "9");

    if (platform.toLowerCase() === "twitch") {
      circle.setAttribute("fill", "#9146FF");
    } else if (platform.toLowerCase() === "youtube") {
      circle.setAttribute("fill", "#FF0000");
    } else if (platform.toLowerCase() === "kick") {
      circle.setAttribute("fill", "#53FC18");
    } else if (platform.toLowerCase() === "x" || platform.toLowerCase() === "twitter") {
      circle.setAttribute("fill", "#000000");
    } else if (platform.toLowerCase() === "instagram") {
      circle.setAttribute("fill", "#E1306C");
    } else {
      circle.setAttribute("fill", "#6b7280");
    }

    svg.appendChild(circle);
    btn.appendChild(svg);
    return btn;
  }

  function createCard(creator) {
    const card = document.createElement("article");
    card.className = "creator-card";
    card.dataset.id = creator.id;

    const avatarWrapper = document.createElement("div");
    avatarWrapper.className = "creator-avatar-wrapper";

    const img = document.createElement("img");
    img.className = "creator-avatar";
    img.alt = `Avatar de ${creator.username}`;
    img.loading = "lazy";
    img.src = creator.avatar_url || "assets/avatar-placeholder-1.png";

    avatarWrapper.appendChild(img);
    card.appendChild(avatarWrapper);

    const body = document.createElement("div");
    body.className = "creator-card-body";

    const usernameBtn = document.createElement("button");
    usernameBtn.type = "button";
    usernameBtn.className = "creator-username-btn";
    usernameBtn.textContent = `@${creator.username}`;
    usernameBtn.addEventListener("click", () => {
      if (window.VSDModal) {
        window.VSDModal.open(creator);
      }
    });

    body.appendChild(usernameBtn);

    const platformsRow = document.createElement("div");
    platformsRow.className = "creator-platforms";

    (creator.platforms || []).forEach(p => {
      const btn = createPlatformIcon(p);
      platformsRow.appendChild(btn);
    });

    body.appendChild(platformsRow);
    card.appendChild(body);

    requestAnimationFrame(() => {
      card.classList.add("is-visible");
    });

    return card;
  }

  function renderNextBatch() {
    if (renderedCount >= filteredCreators.length) return;
    LOADER.classList.add("is-visible");

    const start = renderedCount;
    const end = Math.min(start + BATCH_SIZE, filteredCreators.length);
    for (let i = start; i < end; i++) {
      const creator = filteredCreators[i];
      const card = createCard(creator);
      GRID.appendChild(card);
    }
    renderedCount = end;
    LOADER.classList.remove("is-visible");
  }

  function recomputeFiltered() {
    filteredCreators = allCreators.filter(c => {
      return window.VSDFilters ? window.VSDFilters.matches(c) : true;
    });
  }

  function resetAndRender() {
    GRID.innerHTML = "";
    renderedCount = 0;
    recomputeFiltered();
    renderNextBatch();
  }

  function initObserver() {
    if (!SENTINEL) return;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          renderNextBatch();
        }
      });
    }, {
      rootMargin: "200px 0px"
    });
    observer.observe(SENTINEL);
  }

  function init(creators) {
    allCreators = creators.slice();
    recomputeFiltered();
    renderNextBatch();
    initObserver();
  }

  window.VSDInfiniteScroll = {
    init,
    resetAndRender
  };
})();
