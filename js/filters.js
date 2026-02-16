(function () {
  const TAG_CONTAINER = document.getElementById("dynamicTagPills");
  const ALL_TAG_BUTTON = document.querySelector('.tag-pill[data-tag="all"]');
  const TAG_COUNT_ALL = document.getElementById("tag-count-all");
  const SEARCH_INPUT = document.getElementById("searchInput");

  let allCreators = [];
  let activeTags = new Set(); // tags seleccionados
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

  function attachEvents() {
    document.addEventListener("click", function (evt) {
      const btn = evt.target.closest(".tag-pill");
      if (!btn) return;

      const tag = btn.dataset.tag;
      if (tag === "all") {
        activeTags.clear();
        document.querySelectorAll(".tag-pill").forEach(el => el.classList.remove("is-active"));
        ALL_TAG_BUTTON.classList.add("is-active");
      } else {
        if (activeTags.has(tag)) {
          activeTags.delete(tag);
          btn.classList.remove("is-active");
        } else {
          activeTags.add(tag);
          btn.classList.add("is-active");
        }
        const anyActive = activeTags.size > 0;
        if (anyActive) {
          ALL_TAG_BUTTON.classList.remove("is-active");
        } else {
          ALL_TAG_BUTTON.classList.add("is-active");
        }
      }

      window.VSDFilters && window.VSDFilters.onFilterChange();
    });

    if (SEARCH_INPUT) {
      SEARCH_INPUT.addEventListener("input", function () {
        searchTerm = this.value.trim().toLowerCase();
        window.VSDFilters && window.VSDFilters.onFilterChange();
      });
    }
  }

  function creatorMatchesFilters(creator) {
    const term = searchTerm;
    if (term) {
      const uname = (creator.username || "").toLowerCase();
      if (!uname.includes(term)) return false;
    }

    if (activeTags.size === 0) return true;

    const tags = new Set([
      ...(creator.tags || []),
      ...(creator.platforms || []),
      creator.language || ""
    ]);

    for (const t of activeTags) {
      if (!tags.has(t)) return false;
    }
    return true;
  }

  function computeTagCounts(creators) {
    const counts = {};
    creators.forEach(c => {
      const applied = new Set([
        ...(c.tags || []),
        ...(c.platforms || []),
        c.language || ""
      ]);
      applied.forEach(tag => {
        if (!tag) return;
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    const allCount = creators.length;
    return { perTag: counts, all: allCount };
  }

  function updateTagCounts(counts) {
    TAG_COUNT_ALL.textContent = counts.all;
    Object.keys(counts.perTag).forEach(tag => {
      const btn = document.querySelector(`.tag-pill[data-tag="${CSS.escape(tag)}"]`);
      if (!btn) return;
      let span = btn.querySelector(".tag-count");
      if (!span) {
        span = document.createElement("span");
        span.className = "tag-count";
        btn.appendChild(span);
      }
      span.textContent = counts.perTag[tag];
    });
  }

  function init(creators) {
    allCreators = creators.slice();
    const uniqueTags = extractUniqueTags(allCreators);
    buildTagPills(uniqueTags);
    attachEvents();
    ALL_TAG_BUTTON.classList.add("is-active");
    const counts = computeTagCounts(allCreators);
    updateTagCounts(counts);
  }

  window.VSDFilters = {
    init,
    matches: creatorMatchesFilters,
    onFilterChange: function () {
      if (window.VSDInfiniteScroll) {
        window.VSDInfiniteScroll.resetAndRender();
      }
    }
  };
})();
