(function() {
  'use strict';

  const TWITCH_API_URL = 'https://apis-kuumedia-twitch-streamhub.lighdx.live/twitch';
  const CACHE_DURATION = 30000;
  const UPDATE_INTERVAL = 60000;

  let twitchDataCache = new Map();
  let pendingRequests = new Map();
  let abortController = null;
  let updateTimer = null;
  let allTwitchUsernames = [];
  let allCreators = [];

  function normalizeTwitchHandle(v) {
    return String(v || '').trim().replace(/^@/, '').toLowerCase();
  }

  function extractTwitchUsernames(creators) {
    const usernames = [];
    creators.forEach(creator => {
      const handle = normalizeTwitchHandle(creator?.socials?.twitch);
      if (handle) usernames.push(handle);
    });
    return [...new Set(usernames)];
  }

  // ✅ NUEVO (ordenado): emite el mapa { username: isLive }
  function dispatchTwitchLiveUpdate(userDataMap) {
    const liveByUser = {};
    userDataMap.forEach((info, username) => {
      liveByUser[String(username || '').toLowerCase()] = !!(info && info.isLive);
    });

    window.dispatchEvent(new CustomEvent("twitch:live-update", {
      detail: { liveByUser }
    })); // CustomEvent.detail [web:1067]
  }

  const TwitchClient = {
    async getUsersData(usernames) {
      if (!Array.isArray(usernames) || usernames.length === 0) {
        throw new Error('No hay usernames para consultar');
      }

      const cleanUsernames = [...new Set(usernames
        .map(normalizeTwitchHandle)
        .filter(u => u.length > 0)
      )].slice(0, 100);

      if (cleanUsernames.length === 0) {
        throw new Error('No hay usernames válidos');
      }

      const cacheKey = cleanUsernames.join(',');
      const cached = twitchDataCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        this._updateUserDataMap(cached.data);
        return cached.data;
      }

      if (pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey);
      }

      if (abortController) {
        abortController.abort();
      }

      abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 8000);

      const requestPromise = this._makeRequest(cleanUsernames, cacheKey, timeoutId);
      pendingRequests.set(cacheKey, requestPromise);

      try {
        const data = await requestPromise;
        return data;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    },

    async _makeRequest(usernames, cacheKey, timeoutId) {
      try {
        const response = await fetch(TWITCH_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(usernames),
          signal: abortController.signal,
          credentials: 'omit',
          mode: 'cors'
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Error ${response.status}`);
        }

        const data = await response.json();

        twitchDataCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });

        this._updateUserDataMap(data);
        return data;

      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.warn('⏱️ [Twitch] Timeout getting data');
        } else {
          console.error('❌ [Twitch] Error:', error.message);
        }
        return null;
      }
    },

    _userDataMap: new Map(),

    _updateUserDataMap(data) {
      if (!data) return;

      for (const [username, info] of Object.entries(data)) {
        this._userDataMap.set(String(username).toLowerCase(), info);
      }

      // ✅ NUEVO: notificar el estado live a la UI/filtros
      dispatchTwitchLiveUpdate(this._userDataMap);
    },

    getUserData(username) {
      return this._userDataMap.get(String(username || '').toLowerCase()) || null;
    },

    isUserLive(username) {
      const data = this.getUserData(username);
      return data ? !!data.isLive : false;
    },

    getUserFollowers(username) {
      const data = this.getUserData(username);
      return data ? (data.followerCount || 0) : 0;
    },

    getUserError(username) {
      const data = this.getUserData(username);
      return data ? data.error : null;
    }
  };

  function updateAllCreatorCards() {
    const cards = document.querySelectorAll('.creator-card');
    cards.forEach(card => {
      const usernameEl = card.querySelector('.creator-username-btn');
      if (!usernameEl) return;

      const username = usernameEl.textContent.replace('@', '').trim().toLowerCase();
      const twitchData = TwitchClient.getUserData(username);

      updateCardTwitchButton(card, username, twitchData);
      updateCardLiveIndicator(card, twitchData);
    });
  }

  function updateCardTwitchButton(card, username, twitchData) {
    const twitchBtn = card.querySelector('.platform-icon-btn[title="Twitch"]');
    if (!twitchBtn) return;

    twitchBtn.dataset.followers = twitchData ? String(twitchData.followerCount || 0) : '0';
    twitchBtn.dataset.isLive = twitchData ? String(!!twitchData.isLive) : 'false';

    // Tooltip en tarjetas (lo dejo tal cual)
    if (!twitchBtn.__twitchTooltipInit) {
      twitchBtn.__twitchTooltipInit = true;

      twitchBtn.addEventListener('mouseenter', function () {
        const followers = parseInt(this.dataset.followers || '0', 10) || 0;
        const existingTooltip = this.querySelector('.twitch-card-tooltip');
        if (existingTooltip) existingTooltip.remove();

        const tip = document.createElement('span');
        tip.className = 'twitch-card-tooltip';
        tip.textContent = `${followers.toLocaleString()} seguidores`;
        this.appendChild(tip);
      });

      twitchBtn.addEventListener('mouseleave', function () {
        const tooltip = this.querySelector('.twitch-card-tooltip');
        if (tooltip) tooltip.remove();
      });
    } else {
      const visible = twitchBtn.querySelector('.twitch-card-tooltip');
      if (visible) {
        const n = parseInt(twitchBtn.dataset.followers || '0', 10) || 0;
        visible.textContent = `${n.toLocaleString()} seguidores`;
      }
    }
  }

  function updateCardLiveIndicator(card, twitchData) {
    const avatarWrapper = card.querySelector('.creator-avatar-wrapper');
    if (!avatarWrapper) return;

    const old = avatarWrapper.querySelector('.creator-live-badge-card');
    if (old) old.remove();

    if (twitchData && twitchData.isLive) {
      const badge = document.createElement('div');
      badge.className = 'creator-live-badge-card';
      badge.innerHTML = `
        <span class="live-dot"></span>
        <span class="live-text">EN VIVO</span>
      `;
      avatarWrapper.appendChild(badge);
    }
  }

  // Followers en popup
  function updateModalFollowersStat(followers) {
    const followersEl = document.getElementById('modalFollowers');
    if (!followersEl) return;

    const block = followersEl.closest('.twitch-stat') || followersEl.parentElement;
    if (block) block.style.display = '';

    const n = parseInt(followers || 0, 10) || 0;
    followersEl.textContent = n.toLocaleString();
  }

  function enhanceModalWithTwitchData(creator) {
    const twitchHandle = normalizeTwitchHandle(creator?.socials?.twitch);
    if (!twitchHandle) return;

    const twitchData = TwitchClient.getUserData(twitchHandle);

    const modalContent = document.querySelector('.modal-content');
    if (!modalContent) return;

    const oldLiveIndicator = document.getElementById('twitch-live-indicator');
    if (oldLiveIndicator) oldLiveIndicator.remove();

    const avatar = document.getElementById('modalAvatar');
    if (avatar) avatar.style.boxShadow = '';

    if (twitchData) {
      const followers = twitchData.followerCount || 0;

      updateModalTwitchButton(followers);
      updateModalFollowersStat(followers);

      if (twitchData.isLive) {
        addLiveIndicatorToModal();
      }
    }
  }

  // Quitar tooltip hover del botón grande del modal
  function updateModalTwitchButton(followers) {
    const twitchBtn = document.getElementById('modalTwitchButton');
    if (!twitchBtn) return;

    twitchBtn.dataset.followers = String(followers || 0);

    const existing = twitchBtn.querySelector('.twitch-followers-tooltip');
    if (existing) existing.remove();

    twitchBtn.__twitchTooltipInit = true;
  }

  function addLiveIndicatorToModal() {
    const avatarWrapper = document.querySelector('.modal-avatar-wrapper');
    if (!avatarWrapper) return;

    const liveContainer = document.createElement('div');
    liveContainer.id = 'twitch-live-indicator';
    liveContainer.className = 'twitch-live-container';
    liveContainer.innerHTML = `
      <div class="twitch-live-badge">
        <span class="live-dot"></span>
        <span class="live-text">EN VIVO</span>
      </div>
    `;

    avatarWrapper.parentNode.insertBefore(liveContainer, avatarWrapper.nextSibling);
  }

  async function initTwitchIntegration(creators) {
    if (!creators || creators.length === 0) return;

    allCreators = creators;
    allTwitchUsernames = extractTwitchUsernames(creators);
    if (allTwitchUsernames.length === 0) return;

    console.log(`🎮 [Twitch] Consultando ${allTwitchUsernames.length} usuarios...`);

    const data = await TwitchClient.getUsersData(allTwitchUsernames);
    if (!data) {
      console.warn('⚠️ [Twitch] Primera consulta falló — programando retry.');
      setTimeout(async () => {
        await TwitchClient.getUsersData(allTwitchUsernames);
        updateAllCreatorCards();
      }, UPDATE_INTERVAL);
    } else {
      updateAllCreatorCards();
    }

    const originalModalOpen = window.VSDModal?.open;
    if (originalModalOpen) {
      window.VSDModal.open = function(creator) {
        originalModalOpen.call(window.VSDModal, creator);
        setTimeout(() => enhanceModalWithTwitchData(creator), 50);
      };
    }

    observeGridChanges();

    // Auto update (opcional)
    // if (updateTimer) clearInterval(updateTimer);
    // updateTimer = setInterval(async () => {
    //   await TwitchClient.getUsersData(allTwitchUsernames);
    //   updateAllCreatorCards();
    // }, UPDATE_INTERVAL);
  }

  function observeGridChanges() {
    const grid = document.getElementById('creatorsGrid');
    if (!grid) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          setTimeout(updateAllCreatorCards, 100);
        }
      });
    });

    observer.observe(grid, { childList: true, subtree: true });
  }

  function addTwitchStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .twitch-live-container {
        text-align: center;
        margin: 10px 0 5px 0;
        width: 100%;
      }

      .twitch-live-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #ff0000, #cc0000);
        color: white;
        padding: 6px 16px;
        border-radius: 10px;
        font-size: 0.82rem;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(255,0,0,0.55);
        animation: modalPulse 2s infinite;
        border: 1px solid rgba(255,255,255,0.25);
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin: 0 auto;
      }

      .twitch-live-badge .live-dot {
        width: 10px;
        height: 10px;
        background: white;
        border-radius: 50%;
        animation: dotPulse 1s infinite;
      }

      .creator-live-badge-card {
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        background: linear-gradient(135deg, #ff0000, #cc0000);
        color: white;
        padding: 2px 7px;
        min-width: 72px;
        border-radius: 6px;
        font-size: 0.60rem;
        font-weight: 600;
        box-shadow: 0 3px 8px rgba(255, 0, 0, 0.22);
        border: 1px solid rgba(255,255,255,0.18);
        z-index: 6;
        text-transform: uppercase;
        pointer-events: none;
        line-height: 1.15;
        backdrop-filter: blur(2px);
      }

      .creator-live-badge-card .live-dot {
        width: 5px;
        height: 5px;
        background: white;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.25);
        animation: dotPulse 1s infinite;
      }

      .creator-live-badge-card .live-text {
        font-size: 0.58rem;
        letter-spacing: 0.35px;
        font-weight: 700;
      }

      .platform-icon-btn[title="Twitch"] {
        position: relative;
        transition: all 0.2s ease;
      }

      .twitch-card-tooltip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #6441a5, #2a0845);
        color: white;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 0.7rem;
        white-space: nowrap;
        z-index: 1000;
        margin-bottom: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.2);
        animation: tooltipFade 0.2s ease;
        pointer-events: none;
        font-weight: 500;
      }

      .twitch-card-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 5px;
        border-style: solid;
        border-color: #2a0845 transparent transparent transparent;
      }

      @keyframes modalPulse {
        0% { box-shadow: 0 4px 15px rgba(255,0,0,0.55); }
        50% { box-shadow: 0 4px 22px rgba(255,0,0,0.95); }
        100% { box-shadow: 0 4px 15px rgba(255,0,0,0.55); }
      }

      @keyframes dotPulse {
        0% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.2); }
        100% { opacity: 1; transform: scale(1); }
      }

      @keyframes tooltipFade {
        from { opacity: 0; transform: translateX(-50%) translateY(10px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }

      [data-theme="night"] .twitch-live-badge {
        border: 1px solid rgba(255,255,255,0.45);
      }
    `;
    document.head.appendChild(style);
  }

  window.TwitchIntegration = {
    init: initTwitchIntegration,
    refresh: async () => {
      await TwitchClient.getUsersData(allTwitchUsernames);
      updateAllCreatorCards();
    },
    getClient: () => TwitchClient,
    updateCards: updateAllCreatorCards
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addTwitchStyles);
  } else {
    addTwitchStyles();
  }

})();
