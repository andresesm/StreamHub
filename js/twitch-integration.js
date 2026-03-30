(function() {
  'use strict';

  const TWITCH_API_URL = 'https://apis-kuumedia-twitch-streamhub.lighdx.live/twitch';
  const CACHE_DURATION = 30000;
  const UPDATE_INTERVAL = 60000;
  const DESKTOP_LIVE_BREAKPOINT = 1024;

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
  let currentProfileCreator = null;
  let desktopLiveMediaQuery = null;
  let desktopLiveMediaListenerBound = false;

  const liveBottomState = {
    mounted: false,
    handle: '',
    theme: '',
    isDesktop: false,
    isLive: false
  };

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

  function chunkArray(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  function canRenderDesktopLivePanel() {
    return window.matchMedia(`(min-width: ${DESKTOP_LIVE_BREAKPOINT}px)`).matches;
  }

  function getCurrentThemeMode() {
    const rawTheme = String(document.documentElement.getAttribute('data-theme') || '').trim().toLowerCase();

    if (rawTheme === 'night' || rawTheme === 'dark') return 'dark';
    if (rawTheme === 'day' || rawTheme === 'light') return 'light';

    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function getTwitchEmbedParent() {
    const host = String(window.location.hostname || '').trim();
    return host || 'localhost';
  }

  function createTwitchIframe(src, title, className) {
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.className = className;
    iframe.title = title;
    iframe.loading = 'lazy';
    iframe.allowFullscreen = true;
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('allow', 'autoplay; fullscreen');
    return iframe;
  }

  function getProfileTwitchHandle(creator) {
    if (getStreamPlatform(creator) !== "twitch") return "";
    return normalizeTwitchHandle(creator?.socials?.twitch);
  }

  function getLiveBottomElements() {
    return {
      panel: document.getElementById('creator-live-bottom'),
      embedRoot: document.getElementById('creator-live-bottom-embed')
    };
  }

  function resetLiveBottomState() {
    liveBottomState.mounted = false;
    liveBottomState.handle = '';
    liveBottomState.theme = '';
    liveBottomState.isDesktop = false;
    liveBottomState.isLive = false;
  }

  function clearProfileLiveBottom() {
    const { panel, embedRoot } = getLiveBottomElements();
    if (!panel || !embedRoot) return;

    panel.hidden = true;
    panel.dataset.livePanel = 'offline';
    embedRoot.replaceChildren();

    resetLiveBottomState();
  }

  function buildStreamSrc(twitchHandle) {
    const parent = encodeURIComponent(getTwitchEmbedParent());
    return (
      `https://player.twitch.tv/?channel=${encodeURIComponent(twitchHandle)}` +
      `&parent=${parent}&autoplay=false&muted=true`
    );
  }

  function buildChatSrc(twitchHandle, theme) {
    const parent = encodeURIComponent(getTwitchEmbedParent());
    return (
      `https://www.twitch.tv/embed/${encodeURIComponent(twitchHandle)}/chat` +
      `?parent=${parent}&darkpopout=${theme === 'dark' ? 'true' : 'false'}`
    );
  }

  function mountProfileLiveBottom(twitchHandle, theme) {
    const { panel, embedRoot } = getLiveBottomElements();
    if (!panel || !embedRoot) return;

    const streamSlot = document.createElement('div');
    streamSlot.className = 'live-bottom-slot live-bottom-slot--stream';
    streamSlot.appendChild(
      createTwitchIframe(
        buildStreamSrc(twitchHandle),
        `Stream de Twitch de ${twitchHandle}`,
        'live-bottom-frame live-bottom-frame--stream'
      )
    );

    const chatSlot = document.createElement('div');
    chatSlot.className = 'live-bottom-slot live-bottom-slot--chat';
    chatSlot.appendChild(
      createTwitchIframe(
        buildChatSrc(twitchHandle, theme),
        `Chat de Twitch de ${twitchHandle}`,
        'live-bottom-frame live-bottom-frame--chat'
      )
    );

    embedRoot.replaceChildren(streamSlot, chatSlot);

    panel.hidden = false;
    panel.dataset.livePanel = 'live';

    liveBottomState.mounted = true;
    liveBottomState.handle = twitchHandle;
    liveBottomState.theme = theme;
    liveBottomState.isDesktop = true;
    liveBottomState.isLive = true;
  }

  function updateLiveBottomChatTheme(twitchHandle, theme) {
    const { panel, embedRoot } = getLiveBottomElements();
    if (!panel || !embedRoot) return false;

    const chatSlot = embedRoot.querySelector('.live-bottom-slot--chat');
    if (!chatSlot) return false;

    chatSlot.replaceChildren(
      createTwitchIframe(
        buildChatSrc(twitchHandle, theme),
        `Chat de Twitch de ${twitchHandle}`,
        'live-bottom-frame live-bottom-frame--chat'
      )
    );

    panel.hidden = false;
    panel.dataset.livePanel = 'live';

    liveBottomState.theme = theme;
    return true;
  }

  function updateProfileLiveBottom(creator, twitchData) {
    const { panel, embedRoot } = getLiveBottomElements();
    if (!panel || !embedRoot) return;

    const isDesktop = canRenderDesktopLivePanel();
    const twitchHandle = getProfileTwitchHandle(creator);
    const isLive = !!(twitchHandle && twitchData && twitchData.isLive);
    const theme = getCurrentThemeMode();

    if (!isDesktop || !isLive) {
      clearProfileLiveBottom();
      liveBottomState.isDesktop = isDesktop;
      liveBottomState.isLive = isLive;
      return;
    }

    const sameHandle = liveBottomState.mounted && liveBottomState.handle === twitchHandle;
    const themeChanged = liveBottomState.mounted && liveBottomState.theme !== theme;

    if (!liveBottomState.mounted || !sameHandle) {
      mountProfileLiveBottom(twitchHandle, theme);
      return;
    }

    panel.hidden = false;
    panel.dataset.livePanel = 'live';

    if (themeChanged) {
      const updated = updateLiveBottomChatTheme(twitchHandle, theme);
      if (!updated) {
        mountProfileLiveBottom(twitchHandle, theme);
        return;
      }
    }

    liveBottomState.mounted = true;
    liveBottomState.handle = twitchHandle;
    liveBottomState.theme = theme;
    liveBottomState.isDesktop = true;
    liveBottomState.isLive = true;
  }

  function updateCardTwitchIcon(card, twitchData) {
    const twitchIcon = card.querySelector('.platform-icon-btn[data-platform="twitch"]');
    if (!twitchIcon) return;

    const followers = twitchData ? (twitchData.followerCount || 0) : 0;
    const isLive = twitchData ? !!twitchData.isLive : false;

    twitchIcon.dataset.followers = String(followers);
    twitchIcon.dataset.isLive = String(isLive);
    twitchIcon.dataset.tooltip = `${Number(followers).toLocaleString()} seguidores`;
  }

  function updateCardLiveIndicator(card, twitchData) {
    const avatarWrapper = card.querySelector('.creator-avatar-wrapper');
    if (!avatarWrapper) return;

    const old = avatarWrapper.querySelector('.creator-live-badge-card');
    if (old) old.remove();

    if (twitchData && twitchData.isLive) {
      const badge = document.createElement('div');
      badge.className = 'creator-live-badge-card';
      badge.innerHTML = `<span class="live-dot"></span><span class="live-text">EN VIVO</span>`;
      avatarWrapper.appendChild(badge);
    }
  }

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

  function updateModalFollowersStat(followers) {
    const followersEl = document.getElementById('modalFollowers');
    if (!followersEl) return;

    const n = parseInt(followers || 0, 10) || 0;
    followersEl.textContent = n.toLocaleString();
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

  function updateProfileLiveIndicator(creator, twitchData) {
    const wrapper = document.querySelector('.profile-photo-wrapper');
    const colLeft = document.querySelector('.col-left');

    if (!wrapper || !colLeft) {
      updateProfileLiveBottom(creator, twitchData);
      return;
    }

    const old = wrapper.querySelector('.profile-live-badge');
    if (old) old.remove();

    wrapper.classList.remove('profile-photo-wrapper--live');
    colLeft.classList.remove('profile-live-active');

    if (!creator || !twitchData || !twitchData.isLive) {
      updateProfileLiveBottom(null, null);
      return;
    }

    const badge = document.createElement('div');
    badge.className = 'profile-live-badge';
    badge.textContent = 'EN VIVO';

    wrapper.classList.add('profile-photo-wrapper--live');
    colLeft.classList.add('profile-live-active');
    wrapper.appendChild(badge);

    updateProfileLiveBottom(creator, twitchData);
  }

  function refreshProfileLiveIndicator() {
    if (!currentProfileCreator) {
      updateProfileLiveBottom(null, null);
      return;
    }

    const twitchHandle = getProfileTwitchHandle(currentProfileCreator);
    if (!twitchHandle) {
      updateProfileLiveIndicator(null, null);
      return;
    }

    const twitchData = TwitchClient.getUserData(twitchHandle);
    updateProfileLiveIndicator(currentProfileCreator, twitchData);
  }

  function observeGridChanges() {
    const grid = document.getElementById('creatorsGrid');
    if (!grid) return;

    if (gridMutationObserver) {
      gridMutationObserver.disconnect();
      gridMutationObserver = null;
    }

    gridMutationObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          setTimeout(updateAllCreatorCards, 50);
          break;
        }
      }
    });

    gridMutationObserver.observe(grid, {
      childList: true,
      subtree: true
    });
  }

  function ensureDesktopLiveBreakpointListener() {
    if (desktopLiveMediaListenerBound) return;

    desktopLiveMediaQuery = window.matchMedia(`(min-width: ${DESKTOP_LIVE_BREAKPOINT}px)`);

    const onBreakpointChange = () => {
      refreshProfileLiveIndicator();
    };

    if (typeof desktopLiveMediaQuery.addEventListener === 'function') {
      desktopLiveMediaQuery.addEventListener('change', onBreakpointChange);
    } else if (typeof desktopLiveMediaQuery.addListener === 'function') {
      desktopLiveMediaQuery.addListener(onBreakpointChange);
    }

    desktopLiveMediaListenerBound = true;
  }

  const TwitchClient = {
    async getUsersData(usernames) {
      if (!Array.isArray(usernames) || usernames.length === 0) {
        throw new Error('No hay usernames para consultar');
      }

      const uniqueUsernames = [...new Set(
        usernames
          .map(normalizeTwitchHandle)
          .filter(u => u.length > 0)
      )];

      if (uniqueUsernames.length === 0) {
        throw new Error('No hay usernames válidos');
      }

      if (abortController) abortController.abort();
      abortController = new AbortController();

      const chunks = chunkArray(uniqueUsernames, 100);
      let allOk = true;

      for (const chunk of chunks) {
        const cacheKey = chunk.join(',');
        const cached = twitchDataCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          this._updateUserDataMap(cached.data);
          continue;
        }

        if (pendingRequests.has(cacheKey)) {
          const data = await pendingRequests.get(cacheKey);
          if (!data) allOk = false;
          continue;
        }

        const timeoutId = setTimeout(() => abortController.abort(), 8000);
        const requestPromise = this._makeRequest(chunk, cacheKey, timeoutId);

        pendingRequests.set(cacheKey, requestPromise);

        try {
          const data = await requestPromise;
          if (!data) allOk = false;
        } finally {
          pendingRequests.delete(cacheKey);
        }
      }

      return allOk ? this._userDataMap : null;
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
        twitchDataCache.set(cacheKey, { data, timestamp: Date.now() });
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

  async function initTwitchIntegration(creators) {
    if (!creators || creators.length === 0) return;

    allCreators = creators;
    currentProfileCreator = Array.isArray(creators) && creators.length === 1 ? creators[0] : currentProfileCreator;
    allTwitchUsernames = extractTwitchUsernames(creators);

    ensureDesktopLiveBreakpointListener();

    if (allTwitchUsernames.length === 0) {
      refreshProfileLiveIndicator();
      return;
    }

    if (abortController) abortController.abort();
    if (updateTimer) clearInterval(updateTimer);

    const data = await TwitchClient.getUsersData(allTwitchUsernames);

    if (!data) {
      setTimeout(async () => {
        await TwitchClient.getUsersData(allTwitchUsernames);
        updateAllCreatorCards();
        refreshProfileLiveIndicator();
      }, UPDATE_INTERVAL);
    } else {
      updateAllCreatorCards();
      refreshProfileLiveIndicator();
    }

    updateTimer = setInterval(async () => {
      await TwitchClient.getUsersData(allTwitchUsernames);
      updateAllCreatorCards();
      refreshProfileLiveIndicator();
    }, UPDATE_INTERVAL);

    if (!modalWrapped && window.VSDModal && typeof window.VSDModal.open === 'function') {
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
    if (document.getElementById('twitchIntegrationStyles')) return;

    const style = document.createElement('style');
    style.id = 'twitchIntegrationStyles';
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
        box-shadow: 0 4px 15px rgba(255, 0, 0, 0.55);
        animation: modalPulse 2s infinite;
        border: 1px solid rgba(255, 255, 255, 0.25);
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

      .profile-photo-wrapper.profile-photo-wrapper--live {
        position: relative;
        overflow: visible;
        margin-bottom: 40px;
      }

      .profile-photo-wrapper.profile-photo-wrapper--live .profile-photo {
        border-radius: inherit;
      }

      .profile-live-badge {
        position: absolute;
        left: 0px;
        right: 0px;
        bottom: -24px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0 0 18px 18px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: #ffffff;
        font-family: MontserratLocal, sans-serif;
        font-size: 1.5rem;
        font-weight: 650;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        box-shadow: 0 10px 22px rgba(239, 68, 68, 0.22);
        z-index: 3;
        pointer-events: none;
      }

      .col-left.profile-live-active .profile-username {
        margin-top: 4px;
      }

      @media (max-width: 767px) {
        .profile-photo-wrapper.profile-photo-wrapper--live {
          margin-bottom: 36px;
        }

        .profile-live-badge {
          left: 0px;
          right: 0px;
          bottom: -16px;
          min-height: 40px;
          border-radius: 0 0 16px 16px;
          font-size: 1.5rem;
        }
      }

      @media (max-width: 420px) {
        .profile-live-badge {
          min-height: 36px;
          font-size: 0.84rem;
        }
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
        border: 1px solid rgba(255, 255, 255, 0.18);
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
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        animation: dotPulse 1s infinite;
      }

      .creator-live-badge-card .live-text {
        font-size: 0.58rem;
        letter-spacing: 0.35px;
        font-weight: 700;
      }

      .platform-icon-btn[data-platform="twitch"] {
        position: relative;
      }

      .platform-icon-btn[data-platform="twitch"][data-tooltip]:hover::after {
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
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        pointer-events: none;
        font-weight: 500;
      }

      .platform-icon-btn[data-platform="twitch"][data-tooltip]:hover::before {
        content: "";
        position: absolute;
        bottom: calc(100% - 2px);
        left: 50%;
        transform: translateX(-50%);
        border-width: 5px;
        border-style: solid;
        border-color: #2a0845 transparent transparent transparent;
      }

      @keyframes modalPulse {
        0% { box-shadow: 0 4px 15px rgba(255, 0, 0, 0.55); }
        50% { box-shadow: 0 4px 22px rgba(255, 0, 0, 0.95); }
        100% { box-shadow: 0 4px 15px rgba(255, 0, 0, 0.55); }
      }

      @keyframes dotPulse {
        0% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.2); }
        100% { opacity: 1; transform: scale(1); }
      }

      html[data-theme="night"] .twitch-live-badge {
        border: 1px solid rgba(255, 255, 255, 0.45);
      }
    `;

    document.head.appendChild(style);
  }

  window.addEventListener('streamhubprofile-loaded', event => {
    currentProfileCreator = event?.detail?.creator || null;
    refreshProfileLiveIndicator();
  });

  window.addEventListener('twitch:live-update', () => {
    refreshProfileLiveIndicator();
  });

  window.addEventListener('click', event => {
    const toggle = event.target.closest('#themeToggle');
    if (!toggle) return;

    setTimeout(() => {
      refreshProfileLiveIndicator();
    }, 0);
  });

  window.TwitchIntegration = {
    init: initTwitchIntegration,
    refresh: async () => {
      await TwitchClient.getUsersData(allTwitchUsernames);
      updateAllCreatorCards();
      refreshProfileLiveIndicator();
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