const countryCodes = {
  'venezuela': 'VE',
  'chile': 'CL',
  'argentina': 'AR',
  'brasil': 'BR',
  'colombia': 'CO',
  'perú': 'PE',
  'ecuador': 'EC',
  'bolivia': 'BO',
  'uruguay': 'UY',
  'paraguay': 'PY',
  'mexico': 'MX',
  'estados unidos': 'US',
  'españa': 'ES',
  'portugal': 'PT',
  'italia': 'IT',
  'francia': 'FR',
  'alemania': 'DE'
};

const PLACEHOLDER_PREFIX = 'PH-STREAMER-';

function isPlaceholderValue(value) {
  const safeValue = String(value || '').trim();
  return safeValue.startsWith(PLACEHOLDER_PREFIX);
}

function getMetaContent(name) {
  const meta = document.querySelector(`meta[name="${name}"]`);
  return meta ? String(meta.getAttribute('content') || '').trim() : '';
}

function normalizeBasePath(path) {
  const safePath = String(path || '').trim();

  if (!safePath || safePath === '/') return '/';

  return `/${safePath.replace(/^\/+|\/+$/g, '')}/`;
}

function getConfiguredBasePath() {
  const candidates = [
    window.STREAMHUB_BASE_PATH,
    document.body?.dataset?.basePath,
    getMetaContent('site-base-path')
  ];

  const match = candidates.find(value => {
    const safeValue = String(value || '').trim();
    return safeValue && !isPlaceholderValue(safeValue);
  });

  return match ? normalizeBasePath(match) : '';
}

function getBasePathFromScript() {
  const currentScript = [...document.scripts].find(script => {
    const rawSrc = script.getAttribute('src') || '';
    return rawSrc.includes('streamhub-profile');
  });

  if (!currentScript?.src) return '';

  try {
    const url = new URL(currentScript.src, window.location.href);
    const match = url.pathname.match(/^(.*\/)js\/streamhub-profile(?:-[\w.-]+)?\.js$/);
    if (!match) return '';
    return normalizeBasePath(match[1]);
  } catch {
    return '';
  }
}

function getBasePathFromPathname() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const uIndex = parts.indexOf('u');

  if (uIndex >= 0) {
    return normalizeBasePath(parts.slice(0, uIndex).join('/'));
  }

  if (window.location.hostname.endsWith('github.io') && parts.length > 0) {
    return normalizeBasePath(parts[0]);
  }

  return '/';
}

function getBasePath() {
  return (
    getConfiguredBasePath() ||
    getBasePathFromScript() ||
    getBasePathFromPathname() ||
    '/'
  );
}

const BASE_PATH = getBasePath();
window.__STREAMHUB_BASE_PATH = BASE_PATH;

const PROFILE_PLACEHOLDER = `${BASE_PATH}assets/profile-placeholder.jpg`;
const MINI_CREATOR_PLACEHOLDER = `${BASE_PATH}assets/profile-placeholder.jpg`;
const GAME_PLACEHOLDER = `${BASE_PATH}assets/bbdd/gameplaceholder.webp`;

const MAX_VISIBLE_GAMES = window.matchMedia('(max-width: 767px)').matches ? 8 : 12;
const RESERVED_MORE_SLOT = 1;
const MAX_VISIBLE_REAL_GAMES = MAX_VISIBLE_GAMES - RESERVED_MORE_SLOT;
const MINI_CREATORS_COUNT = window.matchMedia('(max-width: 767px)').matches ? 4 : 7;

const SOCIAL_ICON_MAP = {
  twitch: `${BASE_PATH}assets/svg/rrss/twitch.svg`,
  kick: `${BASE_PATH}assets/svg/rrss/kick.svg`,
  ig: `${BASE_PATH}assets/svg/rrss/ig.svg`,
  x: `${BASE_PATH}assets/svg/rrss/x.svg`,
  youtube: `${BASE_PATH}assets/svg/rrss/youtube.svg`,
  tiktok: `${BASE_PATH}assets/svg/rrss/tiktok.svg`
};

function getPathCreatorTarget() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const uIndex = parts.indexOf('u');

  if (uIndex !== -1 && parts[uIndex + 1]) {
    try {
      return decodeURIComponent(parts[uIndex + 1]).trim();
    } catch {
      return String(parts[uIndex + 1]).trim();
    }
  }

  return '';
}

function resolveCreatorTarget() {
  const candidates = [
    window.CREATOR_TARGET,
    document.body?.dataset?.creatorTarget,
    getMetaContent('creator-username'),
    getPathCreatorTarget()
  ];

  return candidates.find(value => {
    const safeValue = String(value || '').trim();
    return safeValue && !isPlaceholderValue(safeValue);
  }) || '';
}

function resolveCreatorDisplayName() {
  const candidates = [
    window.CREATOR_DISPLAYNAME,
    document.body?.dataset?.creatorDisplayname,
    getMetaContent('creator-displayname')
  ];

  return candidates.find(value => {
    const safeValue = String(value || '').trim();
    return safeValue && !isPlaceholderValue(safeValue);
  }) || '';
}

const CREATOR_TARGET = resolveCreatorTarget();
const CREATOR_DISPLAYNAME = resolveCreatorDisplayName();

function findCreator(creators, target) {
  const safeTarget = String(target || '').trim().toLowerCase();

  return creators.find(creator => {
    const id = String(creator?.id || '').trim().toLowerCase();
    const slug = String(creator?.slug || '').trim().toLowerCase();
    const username = String(creator?.username || '').trim().toLowerCase();

    return id === safeTarget || slug === safeTarget || username === safeTarget;
  });
}

function resolveAssetUrl(path) {
  if (!path || typeof path !== 'string') return '';

  const trimmed = path.trim();

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('//')
  ) {
    return trimmed;
  }

  return `${BASE_PATH}${trimmed.replace(/^\/+/, '')}`;
}

function getCreatorProfileUrl(creator) {
  const profileValue = String(
    creator?.slug || creator?.username || creator?.id || ''
  ).trim();

  if (!profileValue) return '#';

  return `${BASE_PATH}u/${encodeURIComponent(profileValue)}/`;
}

function getCreatorLabel(creator) {
  return String(
    creator?.username ||
    creator?.slug ||
    creator?.id ||
    CREATOR_TARGET ||
    CREATOR_DISPLAYNAME ||
    'creador'
  ).trim();
}

function getCreatorDisplayUsername(creator) {
  const username = getCreatorLabel(creator);
  return username.startsWith('@') ? username : `@${username}`;
}

function syncTemplateBindings(creator) {
  const resolvedUsername = String(
    creator?.username || creator?.slug || creator?.id || CREATOR_TARGET || ''
  ).trim();

  const resolvedDisplay = getCreatorDisplayUsername(creator);

  if (document.body && resolvedUsername) {
    document.body.dataset.creatorTarget = resolvedUsername;
  }

  if (document.body && resolvedDisplay) {
    document.body.dataset.creatorDisplayname = resolvedDisplay;
  }

  const usernameMeta = document.querySelector('meta[name="creator-username"]');
  if (usernameMeta && resolvedUsername) {
    usernameMeta.setAttribute('content', resolvedUsername);
  }

  const displayMeta = document.querySelector('meta[name="creator-displayname"]');
  if (displayMeta && resolvedDisplay) {
    displayMeta.setAttribute('content', resolvedDisplay);
  }

  if (resolvedDisplay) {
    document.title = `${resolvedDisplay} - StreamHUB`;
  }

  const descEl = document.querySelector('.profile-description');
  if (descEl && resolvedUsername) {
    descEl.setAttribute('data-twitch-description', resolvedUsername);
  }
}

function shuffleArray(list) {
  const arr = [...list];

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function createGameCard(game) {
  const card = document.createElement('article');
  card.className = 'game-card';

  const coverWrapper = document.createElement('div');
  coverWrapper.className = 'game-cover-wrapper';

  const img = document.createElement('img');
  img.className = 'game-cover';
  img.src = resolveAssetUrl(game?.cover) || GAME_PLACEHOLDER;
  img.alt = game?.name || 'Juego';
  img.loading = 'lazy';
  img.onerror = function () {
    this.onerror = null;
    this.src = GAME_PLACEHOLDER;
  };

  const title = document.createElement('p');
  title.className = 'game-title';
  title.textContent = game?.name || 'Juego sin nombre';

  coverWrapper.appendChild(img);
  card.appendChild(coverWrapper);
  card.appendChild(title);

  return card;
}

function createShowMoreCard(hiddenCount, onToggle, expanded) {
  const button = document.createElement('button');
  button.className = 'game-card game-card--more';
  button.type = 'button';
  button.setAttribute('aria-label', expanded ? 'Mostrar menos juegos' : 'Mostrar más juegos');
  button.setAttribute('aria-expanded', String(expanded));

  const coverWrapper = document.createElement('div');
  coverWrapper.className = 'game-cover-wrapper game-cover-wrapper--toggle';

  const icon = document.createElement('div');
  icon.className = 'game-cover-toggle-icon';
  icon.setAttribute('aria-hidden', 'true');

  icon.innerHTML = expanded
    ? `
      <svg viewBox="0 0 64 64" class="game-cover-toggle-svg" fill="none">
        <rect x="6" y="6" width="52" height="52" rx="14" />
        <path d="M20 32H44" />
      </svg>
    `
    : `
      <svg viewBox="0 0 64 64" class="game-cover-toggle-svg" fill="none">
        <rect x="6" y="6" width="52" height="52" rx="14" />
        <path d="M20 32H44" />
        <path d="M32 20V44" />
      </svg>
    `;

  const title = document.createElement('p');
  title.className = 'game-title';
  title.textContent = expanded ? 'Mostrar menos' : `+${hiddenCount} más`;

  coverWrapper.appendChild(icon);
  button.appendChild(coverWrapper);
  button.appendChild(title);
  button.addEventListener('click', onToggle);

  return button;
}

function renderGamesList(rawgGames, gamesContainer, expanded = false) {
  gamesContainer.innerHTML = '';

  if (!Array.isArray(rawgGames) || !rawgGames.length) {
    gamesContainer.innerHTML = '<p class="error-games">No se encontraron juegos</p>';
    return;
  }

  const hasMoreGames = rawgGames.length > MAX_VISIBLE_GAMES;

  if (!hasMoreGames) {
    rawgGames.forEach(game => {
      gamesContainer.appendChild(createGameCard(game));
    });
    gamesContainer.classList.remove('is-expanded');
    return;
  }

  const visibleGames = rawgGames.slice(0, MAX_VISIBLE_REAL_GAMES);
  const hiddenGames = rawgGames.slice(MAX_VISIBLE_REAL_GAMES);

  visibleGames.forEach(game => {
    gamesContainer.appendChild(createGameCard(game));
  });

  const toggleButton = createShowMoreCard(
    hiddenGames.length,
    () => renderGamesList(rawgGames, gamesContainer, !expanded),
    expanded
  );

  gamesContainer.appendChild(toggleButton);

  if (expanded) {
    hiddenGames.forEach(game => {
      gamesContainer.appendChild(createGameCard(game));
    });
  }

  gamesContainer.classList.toggle('is-expanded', expanded);
}

function createMiniCreatorCard(creator) {
  const link = document.createElement('a');
  link.className = 'featured-mini-card';
  link.href = getCreatorProfileUrl(creator);

  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'featured-mini-card__avatar-wrap';

  const img = document.createElement('img');
  img.className = 'featured-mini-card__avatar';
  img.loading = 'lazy';
  img.src = resolveAssetUrl(creator?.avatar_url) || MINI_CREATOR_PLACEHOLDER;
  img.alt = `Foto de perfil de ${creator?.username || 'creador'}`;
  img.onerror = function () {
    this.onerror = null;
    this.src = MINI_CREATOR_PLACEHOLDER;
  };

  const username = document.createElement('p');
  username.className = 'featured-mini-card__username';

  const safeUsername = String(creator?.username || '').trim();
  username.textContent = safeUsername
    ? (safeUsername.startsWith('@') ? safeUsername : `@${safeUsername}`)
    : '@creador';

  avatarWrap.appendChild(img);
  link.appendChild(avatarWrap);
  link.appendChild(username);

  return link;
}

function renderRandomMiniCreators(creators) {
  const container = document.getElementById('featured-mini-creators');
  if (!container) return;

  const current = String(CREATOR_TARGET || '').trim().toLowerCase();

  const validCreators = Array.isArray(creators)
    ? creators.filter(creator => {
        if (!creator || !(creator.username || creator.slug || creator.id)) return false;

        const id = String(creator.id || '').trim().toLowerCase();
        const slug = String(creator.slug || '').trim().toLowerCase();
        const username = String(creator.username || '').trim().toLowerCase();

        if (!current) return true;

        return id !== current && slug !== current && username !== current;
      })
    : [];

  if (!validCreators.length) {
    container.innerHTML = '<p class="games-empty-state">No hay creadores para mostrar.</p>';
    return;
  }

  const selectedCreators = shuffleArray(validCreators).slice(0, MINI_CREATORS_COUNT);

  container.innerHTML = '';
  selectedCreators.forEach(creator => {
    container.appendChild(createMiniCreatorCard(creator));
  });
}

function extractCountryName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const parts = raw.split(',').map(part => part.trim()).filter(Boolean);
  if (!parts.length) return '';

  return parts[parts.length - 1].toLowerCase();
}

function getCountryCodeFromLocation(value) {
  const countryName = extractCountryName(value);
  if (!countryName) return '';

  return countryCodes[countryName] || countryName.slice(0, 2).toUpperCase();
}

function loadFlags(creator) {
  if (creator?.nationality) {
    const natFlag = document.getElementById('creator-nationality-flag');
    if (natFlag) {
      const countryCode = getCountryCodeFromLocation(creator.nationality);
      if (countryCode) {
        natFlag.innerHTML = `<img src="https://flagsapi.com/${countryCode}/flat/24.png" alt="${creator.nationality}" width="24" height="18">`;
      } else {
        natFlag.innerHTML = '';
      }
    }
  }

  if (creator?.residence) {
    const resFlag = document.getElementById('creator-residence-flag');
    if (resFlag) {
      const countryCode = getCountryCodeFromLocation(creator.residence);
      if (countryCode) {
        resFlag.innerHTML = `<img src="https://flagsapi.com/${countryCode}/flat/24.png" alt="${creator.residence}" width="24" height="18">`;
      } else {
        resFlag.innerHTML = '';
      }
    }
  }
}

function normalizeHandle(value) {
  return String(value || '').trim().replace(/^@+/, '');
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('//')) {
    return raw;
  }
  return `https://${raw}`;
}

function buildSocialLinks(creator) {
  const socials = creator?.socials || {};

  const definitions = [
    {
      key: 'twitch',
      label: 'Twitch',
      getUrl: value => `https://www.twitch.tv/${normalizeHandle(value)}`
    },
    {
      key: 'kick',
      label: 'Kick',
      getUrl: value => `https://kick.com/${normalizeHandle(value)}`
    },
    {
      key: 'ig',
      label: 'Instagram',
      getUrl: value => `https://www.instagram.com/${normalizeHandle(value)}`
    },
    {
      key: 'x',
      label: 'X',
      getUrl: value => `https://x.com/${normalizeHandle(value)}`
    },
    {
      key: 'youtube',
      label: 'YouTube',
      getUrl: value => {
        const clean = String(value || '').trim();
        if (!clean) return '';
        if (
          clean.startsWith('http://') ||
          clean.startsWith('https://') ||
          clean.startsWith('//')
        ) {
          return clean;
        }
        return `https://www.youtube.com/@${normalizeHandle(clean)}`;
      }
    },
    {
      key: 'tiktok',
      label: 'TikTok',
      getUrl: value => `https://www.tiktok.com/@${normalizeHandle(value)}`
    },
    {
      key: 'email',
      label: 'Email',
      getUrl: value => `mailto:${String(value || '').trim()}`
    }
  ];

  return definitions
    .map(def => {
      const rawValue = socials?.[def.key];
      const cleanValue = String(rawValue || '').trim();

      if (!cleanValue) return null;

      const href = def.getUrl(cleanValue);
      if (!href) return null;

      return {
        key: def.key,
        label: def.label,
        href
      };
    })
    .filter(Boolean);
}

function renderCreatorSocials(creator) {
  const socialsContainer = document.getElementById('creator-socials');
  if (!socialsContainer) return;

  const socialLinks = buildSocialLinks(creator);

  if (!socialLinks.length) {
    socialsContainer.innerHTML = '';
    socialsContainer.hidden = true;
    return;
  }

  socialsContainer.hidden = false;
  socialsContainer.innerHTML = '';

  const creatorName = getCreatorLabel(creator);

  socialLinks.forEach(item => {
    const link = document.createElement('a');
    link.className = 'social-pill social-pill--' + item.key;
    link.href = item.href;
    link.setAttribute('aria-label', `${item.label} de ${creatorName}`);

    if (item.key === 'email') {
      link.rel = 'noopener noreferrer';
    } else {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }

    const iconPath = SOCIAL_ICON_MAP[item.key];
    if (iconPath) {
      const img = document.createElement('img');
      img.src = iconPath;
      img.alt = '';
      img.loading = 'lazy';
      img.className = 'social-pill__icon';
      link.appendChild(img);
    } else {
      link.textContent = item.label;
    }

    socialsContainer.appendChild(link);
  });
}

function fitTextSingleLine(textEl, containerEl, options = {}) {
  if (!textEl || !containerEl) return;
  if (!containerEl.clientWidth) return;

  const defaultSize = parseFloat(getComputedStyle(textEl).fontSize) || 16;
  const maxSize = Number(options.maxSize ?? defaultSize);
  const minSize = Number(options.minSize ?? 10);
  const step = Number(options.step ?? 1);
  const maxLoops = Number(options.maxLoops ?? 80);

  textEl.style.whiteSpace = 'nowrap';
  textEl.style.overflow = 'hidden';
  textEl.style.textOverflow = 'clip';
  textEl.style.fontSize = `${maxSize}px`;

  let loops = 0;
  while (textEl.scrollWidth > textEl.clientWidth && loops < maxLoops) {
    const currentSize = parseFloat(getComputedStyle(textEl).fontSize);
    if (currentSize <= minSize) break;

    const nextSize = Math.max(currentSize - step, minSize);
    textEl.style.fontSize = `${nextSize}px`;
    loops += 1;
  }
}

function fitUsernameSingleLine() {
  const title = document.querySelector('.username');
  const container = document.querySelector('.profile-username');

  fitTextSingleLine(title, container, {
    maxSize: 32,
    minSize: 10,
    step: 1,
    maxLoops: 100
  });
}

function fitMetaValueSingleLine(valueEl) {
  if (!valueEl) return;
  const container = valueEl.closest('.profile-meta');

  fitTextSingleLine(valueEl, container, {
    maxSize: 16,
    minSize: 10,
    step: 0.5,
    maxLoops: 60
  });
}

function fitProfileMetaValues() {
  fitMetaValueSingleLine(document.getElementById('creator-residence'));
  fitMetaValueSingleLine(document.getElementById('creator-nationality'));
}

function fitAllProfileTexts() {
  fitUsernameSingleLine();
  fitProfileMetaValues();
}

let fitAllTextsFrame = null;

function scheduleFitAllProfileTexts() {
  if (fitAllTextsFrame) {
    cancelAnimationFrame(fitAllTextsFrame);
  }

  fitAllTextsFrame = requestAnimationFrame(() => {
    fitAllTextsFrame = null;
    fitAllProfileTexts();
  });
}

let profileTextResizeObserver = null;

function refreshProfileTextObservers() {
  if (!('ResizeObserver' in window)) return;

  if (!profileTextResizeObserver) {
    profileTextResizeObserver = new ResizeObserver(() => {
      scheduleFitAllProfileTexts();
    });
  }

  profileTextResizeObserver.disconnect();

  const observedElements = [
    document.querySelector('.profile-username'),
    ...document.querySelectorAll('.profile-meta')
  ].filter(Boolean);

  observedElements.forEach(el => {
    profileTextResizeObserver.observe(el);
  });
}

function initTextFitting() {
  refreshProfileTextObservers();
  scheduleFitAllProfileTexts();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready
      .then(() => {
        scheduleFitAllProfileTexts();
      })
      .catch(() => {});
  }
}

function loadCreatorProfile() {
  if (!CREATOR_TARGET) {
    console.error('No se pudo resolver el creator target desde el HTML o la URL.');
    return;
  }

  fetch(`${BASE_PATH}data/creators.json`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error al cargar creators.json (${response.status})`);
      }
      return response.json();
    })
    .then(creators => {
      renderRandomMiniCreators(creators);

      const creator = findCreator(creators, CREATOR_TARGET);

      if (!creator) {
        console.error(`No se encontró el creador "${CREATOR_TARGET}" en creators.json`);
        return;
      }

      syncTemplateBindings(creator);

      const profilePhotoEl = document.querySelector('.profile-photo');
      if (profilePhotoEl) {
        const avatarUrl = resolveAssetUrl(creator.avatar_url);

        if (avatarUrl) {
          profilePhotoEl.src = avatarUrl;
          profilePhotoEl.alt = `Foto de perfil de ${getCreatorLabel(creator)}`;
          profilePhotoEl.onerror = function () {
            this.onerror = null;
            this.src = PROFILE_PLACEHOLDER;
          };
        } else {
          profilePhotoEl.src = PROFILE_PLACEHOLDER;
        }
      }

      const usernameEl = document.querySelector('.username');
      if (usernameEl) {
        usernameEl.textContent = getCreatorDisplayUsername(creator);
      }

      const descEl = document.querySelector('.profile-description');
      if (descEl) {
        descEl.textContent =
          creator.description ||
          descEl.getAttribute('data-twitch-description-fallback') ||
          '';
      }

      const natEl = document.getElementById('creator-nationality');
      const resEl = document.getElementById('creator-residence');

      if (natEl) {
        natEl.textContent = creator.nationality || '';
      }

      if (resEl) {
        resEl.textContent = creator.residence || '';
      }

      loadFlags(creator);
      renderCreatorSocials(creator);

      window.__STREAMHUB_PROFILE_CREATOR = creator;
      window.dispatchEvent(new CustomEvent('streamhub:profile-loaded', {
        detail: { creator }
      }));

      if (window.TwitchIntegration && typeof window.TwitchIntegration.init === 'function') {
        window.TwitchIntegration.init([creator]);
      }

      const tagsContainer = document.getElementById('creator-tags');
      if (tagsContainer && Array.isArray(creator.tags)) {
        tagsContainer.innerHTML = '';
        creator.tags.forEach(tag => {
          const span = document.createElement('span');
          span.className = 'tag';
          span.textContent = tag;
          tagsContainer.appendChild(span);
        });
      }

      const gamesContainer = document.getElementById('creator-games');
      if (gamesContainer && Array.isArray(creator.games)) {
        gamesContainer.innerHTML = '<div class="loading-games">Cargando juegos...</div>';

        const gameNames = creator.games
          .map(game => (typeof game === 'string' ? game : game?.title || game?.name))
          .filter(Boolean)
          .slice(0, 50);

        if (window.searchGamesRAWG) {
          window.searchGamesRAWG(gameNames)
            .then(rawgGames => {
              renderGamesList(rawgGames, gamesContainer, false);
            })
            .catch(error => {
              console.error('Error cargando juegos', error);
              gamesContainer.innerHTML = '<p class="error-games">Error cargando juegos</p>';
            });
        } else {
          console.error('searchGamesRAWG no está disponible');
          gamesContainer.innerHTML = '<p class="error-games">RAWG no está cargado</p>';
        }
      }

      refreshProfileTextObservers();
      scheduleFitAllProfileTexts();
    })
    .catch(error => {
      console.error(error);
    });
}

function initProfilePage() {
  initTextFitting();
  loadCreatorProfile();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePage);
} else {
  initProfilePage();
}

window.addEventListener('load', scheduleFitAllProfileTexts);
window.addEventListener('resize', scheduleFitAllProfileTexts);
window.addEventListener('streamhub:profile-loaded', scheduleFitAllProfileTexts);