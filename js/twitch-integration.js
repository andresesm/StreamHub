(function() {
    'use strict';

    const TWITCH_API_URL = 'https://apis-kuumedia-twitch-streamhub.lighdx.live/twitch';
    const ALLOWED_ORIGIN = 'https://streamhub.kuumedia.com.es';
    const CACHE_DURATION = 30000;
    const UPDATE_INTERVAL = 60000;

    let twitchDataCache = new Map();
    let pendingRequests = new Map();
    let abortController = null;
    let updateTimer = null;
    let allTwitchUsernames = [];
    let allCreators = [];

    function extractTwitchUsernames(creators) {
        const usernames = [];
        
        creators.forEach(creator => {
            if (creator.socials && creator.socials.twitch) {
                let twitchHandle = creator.socials.twitch;
                twitchHandle = twitchHandle.trim().replace(/^@/, '').toLowerCase();
                if (twitchHandle) {
                    usernames.push(twitchHandle);
                }
            }
        });
        
        return [...new Set(usernames)];
    }

    const TwitchClient = {
        async getUsersData(usernames) {
            if (!Array.isArray(usernames) || usernames.length === 0) {
                throw new Error('No hay usernames para consultar');
            }

            const cleanUsernames = [...new Set(usernames
                .map(u => u.trim().toLowerCase())
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
                    headers: {
                        'Content-Type': 'application/json',
                        'Origin': ALLOWED_ORIGIN
                    },
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
                this._userDataMap.set(username.toLowerCase(), info);
            }
        },

        getUserData(username) {
            return this._userDataMap.get(username.toLowerCase()) || null;
        },

        isUserLive(username) {
            const data = this.getUserData(username);
            return data ? data.isLive : false;
        },

        getUserFollowers(username) {
            const data = this.getUserData(username);
            return data ? data.followerCount || 0 : 0;
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
        twitchBtn.dataset.followers = twitchData ? (twitchData.followerCount || 0) : 0;
        twitchBtn.dataset.isLive = twitchData ? !!twitchData.isLive : false;

        if (!twitchBtn.__twitchTooltipInit) {
            twitchBtn.__twitchTooltipInit = true;

            twitchBtn.addEventListener('mouseenter', function (e) {
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
                visible.textContent = `${(twitchBtn.dataset.followers || 0).toLocaleString()} seguidores`;
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

    function enhanceModalWithTwitchData(creator) {
        if (!creator || !creator.socials || !creator.socials.twitch) return;

        const twitchHandle = creator.socials.twitch.replace(/^@/, '').trim().toLowerCase();
        const twitchData = TwitchClient.getUserData(twitchHandle);
        
        const modalContent = document.querySelector('.modal-content');
        if (!modalContent) return;

        const oldLiveIndicator = document.getElementById('twitch-live-indicator');
        if (oldLiveIndicator) oldLiveIndicator.remove();

        const oldModalBadge = modalContent.querySelector('.creator-live-badge-modal');
        if (oldModalBadge) oldModalBadge.remove();

        const avatar = document.getElementById('modalAvatar');
        if (avatar) {
            avatar.style.boxShadow = '';
        }

        if (twitchData) {
            updateModalTwitchButton(twitchData.followerCount);

            if (twitchData.isLive) {
                addLiveIndicatorToModal();
            }
        }
    }

    function updateModalTwitchButton(followers) {
        const twitchBtn = document.getElementById('modalTwitchButton');
        if (!twitchBtn) return;
        twitchBtn.dataset.followers = followers || 0;

        if (!twitchBtn.__twitchTooltipInit) {
            twitchBtn.__twitchTooltipInit = true;

            twitchBtn.addEventListener('mouseenter', function () {
                const count = parseInt(this.dataset.followers || '0', 10) || 0;
                const existing = this.querySelector('.twitch-followers-tooltip');
                if (existing) existing.remove();
                const tip = document.createElement('span');
                tip.className = 'twitch-followers-tooltip';
                tip.textContent = `${count.toLocaleString()} seguidores`;
                this.appendChild(tip);
            });

            twitchBtn.addEventListener('mouseleave', function () {
                const tooltip = this.querySelector('.twitch-followers-tooltip');
                if (tooltip) tooltip.remove();
            });
        } else {
            const visible = twitchBtn.querySelector('.twitch-followers-tooltip');
            if (visible) visible.textContent = `${(twitchBtn.dataset.followers || 0).toLocaleString()} seguidores`;
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

    async function initTwitchIntegration(creators) {
        if (!creators || creators.length === 0) return;

        allCreators = creators;
        
        allTwitchUsernames = extractTwitchUsernames(creators);
        
        if (allTwitchUsernames.length === 0) {
            return;
        }

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
                padding: 6px 20px;
                border-radius: 30px;
                font-size: 0.85rem;
                font-weight: bold;
                box-shadow: 0 4px 15px rgba(255,0,0,0.6);
                animation: modalPulse 2s infinite;
                border: 1px solid rgba(255,255,255,0.3);
                text-transform: uppercase;
                letter-spacing: 0.5px;
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
                bottom: -6px;
                left: 50%;
                transform: translateX(-50%);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                background: linear-gradient(135deg, #ff0000, #cc0000);
                color: white;
                padding: 3px 8px;
                min-width: 80px;
                border-radius: 12px;
                font-size: 0.65rem;
                font-weight: 700;
                box-shadow: 0 4px 10px rgba(255, 0, 0, 0.25);
                border: 1px solid rgba(255,255,255,0.2);
                z-index: 6;
                text-transform: uppercase;
                pointer-events: none;
                line-height: 1.2;
                backdrop-filter: blur(2px);
            }

            .creator-live-badge-card .live-dot {
                width: 6px;
                height: 6px;
                background: white;
                border-radius: 50%;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                animation: dotPulse 1s infinite;
            }

            .creator-live-badge-card .live-text {
                font-size: 0.6rem;
                letter-spacing: 0.4px;
                font-weight: 800;
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
                border-radius: 4px;
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

            #modalTwitchButton {
                position: relative;
                transition: all 0.3s ease;
            }

            #modalTwitchButton .twitch-followers-tooltip {
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #6441a5, #2a0845);
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 0.8rem;
                white-space: nowrap;
                z-index: 1000;
                margin-bottom: 10px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                border: 1px solid rgba(255,255,255,0.2);
                animation: tooltipFade 0.2s ease;
                pointer-events: none;
                font-weight: 500;
            }

            #modalTwitchButton .twitch-followers-tooltip::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border-width: 6px;
                border-style: solid;
                border-color: #2a0845 transparent transparent transparent;
            }

            @keyframes modalPulse {
                0% { box-shadow: 0 4px 15px rgba(255,0,0,0.6); }
                50% { box-shadow: 0 4px 25px rgba(255,0,0,1); }
                100% { box-shadow: 0 4px 15px rgba(255,0,0,0.6); }
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
                border: 1px solid rgba(255,255,255,0.5);
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