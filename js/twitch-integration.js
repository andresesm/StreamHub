(function() {
  'use strict';

  const TWITCH_API_URL = 'https://apis-kuumedia-twitch-streamhub.lighdx.live/twitch';
  const CACHE_DURATION = 30000;
  const UPDATE_INTERVAL = 60000;

  let initialized = false;

  let twitchDataCache = new Map();
  let pendingRequests = new Map();
  let abortController = null;
  let updateTimer = null;

  let allTwitchUsernames = [];
  let allCreators = [];

  let gridMutationObserver = null;
  let modalWrapped = false;
  let originalModalOpen = null;

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

  function getStreamPlatform(creator) {
    const raw = (creator && (creator.streamPlatform || creator.StreamPlatform || creator.stream_platform)) || "";
    const p = String(raw).trim().toLowerCase();
    if (["twitch", "kick", "youtube", "tiktok", "none"].includes(p)) return p;
    return "twitch";
  }

  function dispatchTwitchLiveUpdate(userDataMap) {
    const liveByUser = {};
    userDataMap.forEach((info, username) => {
      liveByUser[String(username || '').toLowerCase()] = !!(info && info.isLive);
    });

    window.dispatchEvent(new CustomEvent("twitch:live-update", {
      detail: { liveByUser }
    }));
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

      dispatchTwitchLiveUpdate(this._userDataMap);
    },

    getUserData(username) {
      return this._userDataMap.get(String(username || '').toLowerCase()) || null;
    }
  };

  function updateAllCreatorCards() {
    const cards = document.querySelectorAll('.creator-card');

    cards.forEach(card => {
      const twitchHandle = normalizeTwitchHandle(card?.dataset?.twitch);
      if (!twitchHandle) return;

      const twitchData = TwitchClient.getUserData(twitchHandle);
      updateCardTwitchIcon(card, twitchData);
      updateCardLiveIndicator(card, twitchData);
    });
  }

  function updateCardTwitchIcon(card, twitchData) {
    const twitchIcon = card.querySelector('.platform-icon-btn[data-platform="twitch"]');
    if (!twitchIcon) return;

    const followers = twitchData ? (twitchData.followerCount || 0) : 0;
    const isLive = twitchData ? !!twitchData.isLive : false;

    twitchIcon.dataset.followers = String(followers);
    twitchIcon.dataset.isLive = String(isLive);
    twitchIcon.dataset.tooltip = `${Number(followers).toLocaleString()} seguidores`; // lo lee CSS via attr()
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

  function updateModalFollowersStat(followers) {
    const followersEl = document.getElementById('modalFollowers');
    if (!followersEl) return;

    const n = parseInt(followers || 0, 10) || 0;
    followersEl.textContent = n.toLocaleString();
  }

  function enhanceModalWithTwitchData(creator) {
    if (getStreamPlatform(creator) !== "twitch") return;

    const twitchHandle = normalizeTwitchHandle(creator?.socials?.twitch);
    if (!twitchHandle) return;

    const twitchData = TwitchClient.getUserData(twitchHandle);
    if (!twitchData) return;

    const oldLiveIndicator = document.getElementById('twitch-live-indicator');
    if (oldLiveIndicator) oldLiveIndicator.remove();

    const avatar = document.getElementById('modalAvatar');
    if (avatar) avatar.style.boxShadow = '';

    const followers = twitchData.followerCount || 0;
    updateModalFollowersStat(followers);

    if (twitchData.isLive) {
      addLiveIndicatorToModal();
    }
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

  function observeGridChanges() {
    const grid = document.getElementById('creatorsGrid');
    if (!grid) return;

    if (gridMutationObserver) {
      gridMutationObserver.disconnect();
      gridMutationObserver = null;
    }

    gridMutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          setTimeout(updateAllCreatorCards, 50);
          break;
        }
      }
    });

    gridMutationObserver.observe(grid, { childList: true, subtree: true });
  }

  async function initTwitchIntegration(creators) {
    if (!creators || creators.length === 0) return;

    // ✅ Guard: si vuelven a llamar init, no dupliques wrappers/observers
    allCreators = creators;
    allTwitchUsernames = extractTwitchUsernames(creators);
    if (allTwitchUsernames.length === 0) return;

    // Si se re-inicializa, corta timers/requests anteriores
    if (abortController) abortController.abort();
    if (updateTimer) clearInterval(updateTimer);

    const data = await TwitchClient.getUsersData(allTwitchUsernames);
    if (!data) {
      setTimeout(async () => {
        await TwitchClient.getUsersData(allTwitchUsernames);
        updateAllCreatorCards();
      }, UPDATE_INTERVAL);
    } else {
      updateAllCreatorCards();
    }

    // Wrap modal open SOLO una vez
    if (!modalWrapped && window.VSDModal && typeof window.VSDModal.open === "function") {
      modalWrapped = true;
      originalModalOpen = window.VSDModal.open;

      window.VSDModal.open = function(creator) {
        originalModalOpen.call(window.VSDModal, creator);
        setTimeout(() => enhanceModalWithTwitchData(creator), 50);
      };
    }

    observeGridChanges();
    initialized = true;
  }

  function addTwitchStyles() {
    if (document.getElementById("twitchIntegrationStyles")) return;

    const style = document.createElement('style');
    style.id = "twitchIntegrationStyles";
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

      /* ✅ Tooltip Twitch SIN listeners: usa data-tooltip */
      .platform-icon-btn[data-platform="twitch"]{
        position: relative;
      }

      .platform-icon-btn[data-platform="twitch"][data-tooltip]:hover::after{
        content: attr(data-tooltip);
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
        pointer-events: none;
        font-weight: 500;
      }

      .platform-icon-btn[data-platform="twitch"][data-tooltip]:hover::before{
        content: '';
        position: absolute;
        bottom: calc(100% + 2px);
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