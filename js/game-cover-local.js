const GAME_COVER_MAP = {
  '2XKO': '/assets/bbdd/g/2xKO.webp',
  'Among Us': '/assets/bbdd/g/amongus.webp',
  'Apex': '/assets/bbdd/g/Apexlegends.webp',
  'ARC Raiders': '/assets/bbdd/g/ARCRaiders.webp',
  'Arma Reforger': '/assets/bbdd/g/Arma-Reforger.webp',
  'Battelfield': '/assets/bbdd/g/Battlefield.webp',
  'Blasphemous': '/assets/bbdd/g/Blasphemous.webp',
  'Blood Strike': '/assets/bbdd/g/BloodStrike.webp',
  'Bloodstrike': '/assets/bbdd/g/BloodStrike.webp',
  'Brawl Stars': '/assets/bbdd/g/BrawlStars.webp',
  'Call of Duty': '/assets/bbdd/g/CallofDuty.webp',
  'Clash Royale': '/assets/bbdd/g/ClashRoyale.webp',
  'Counter-Strike': '/assets/bbdd/g/CounterStrike.webp',
  'Cozy Games': '/assets/bbdd/g/cozygames.webp',
  'Dead by Daylight': '/assets/bbdd/g/DeadByDaylight.webp',
  'Death Stranding': '/assets/bbdd/g/Death-Stranding.webp',
  'Devil May Cry': '/assets/bbdd/g/Devil-May-Cry.webp',
  'Dota 2': '/assets/bbdd/g/Dota2.webp',
  'Dungeons & Dragons': '/assets/bbdd/g/DungeonsandDragons.webp',
  'Euro Truck Simulator': '/assets/bbdd/g/eurotrucksimulator.webp',
  'FIFA (EA FC)': '/assets/bbdd/g/EAFC.webp',
  'Five Nights at Freddy\'s': '/assets/bbdd/g/Five-Nights-at-Freddys.webp',
  'Fortnite': '/assets/bbdd/g/Fortnite.webp',
  'Free Fire': '/assets/bbdd/g/FreeFire.webp',
  'Garry\'s Mod': '/assets/bbdd/g/GarrysMod.webp',
  'Genshin Impact': '/assets/bbdd/g/GenshinImpact.webp',
  'GTA V': '/assets/bbdd/g/GrandTheftAuto.webp',
  'Grayzone Warfare': '/assets/bbdd/g/Grayzone-Warfare.webp',
  'Half-Life': '/assets/bbdd/g/Half-Life.webp',
  'Heartopia': '/assets/bbdd/g/Heartopia.webp',
  'Hitman': '/assets/bbdd/g/Hitman.webp',
  'Hollow Knight': '/assets/bbdd/g/HollowKnight.webp',
  'HumanitZ': '/assets/bbdd/g/HumanitZ.webp',
  'Incursion Red River': '/assets/bbdd/g/Incursion-Red-River.webp',
  'JRPG': '/assets/bbdd/g/JRPGs.webp',
  'Juegos de carrera': '/assets/bbdd/g/JuegosCarrera.webp',
  'Juegos de historia': '/assets/bbdd/g/JuegosDeHistoria.webp',
  'Juegos de terror': '/assets/bbdd/g/horrorgame.webp',
  'Juegos indie': '/assets/bbdd/g/indiegame.webp',
  'Just Dance': '/assets/bbdd/g/Just-Dance.webp',
  'Kingdom Come': '/assets/bbdd/g/Kingdom-Come.webp',
  'Kukoro!': '/assets/bbdd/g/Kukoro.webp',
  'League of Legends': '/assets/bbdd/g/LeagueofLegends.webp',
  'Lies of P': '/assets/bbdd/g/Lies-of-P.webp',
  'Mario Kart': '/assets/bbdd/g/MarioKart.webp',
  'Marvel Rivals': '/assets/bbdd/g/MarvelRivals.webp',
  'Metal Gear Solid': '/assets/bbdd/g/Metal-Gear-Solid.webp',
  'Minecraft': '/assets/bbdd/g/Minecraft.webp',
  'MMORPG': '/assets/bbdd/g/MMORPG.webp',
  'Mobile Gaming': '/assets/bbdd/g/Mobile-Gaming.webp',
  'Monster Hunter': '/assets/bbdd/g/Monster-Hunter.webp',
  'Mortal Kombat': '/assets/bbdd/g/Mortal-Kombat.webp',
  'Multiplayer': '/assets/bbdd/g/Multiplayer.webp',
  'Once Human': '/assets/bbdd/g/Once-Human.webp',
  'Pokémon': '/assets/bbdd/g/pokemon.webp',
  'Red Dead Redemption': '/assets/bbdd/g/Red-Dead-Redemption.webp',
  'Red Dead Redemption 2': '/assets/bbdd/g/Red-Dead-Redemption-2.webp',
  'Resident Evil': '/assets/bbdd/g/Resident-Evil.webp',
  'Retos No Hit': '/assets/bbdd/g/Retos-No-Hit.webp',
  'Retro Games': '/assets/bbdd/g/Retro.webp',
  'Roblox': '/assets/bbdd/g/Roblox.webp',
  'Rocket League': '/assets/bbdd/g/RocketLeague.webp',
  'S.T.A.L.K.E.R.': '/assets/bbdd/g/S-T-A-L-K-E-R.webp',
  'Scape from Tarkov': '/assets/bbdd/g/Scape-from-Tarkov.webp',
  'SCUM': '/assets/bbdd/g/SCUM.webp',
  'Sea of Thieves': '/assets/bbdd/g/Sea-of-Thieves.webp',
  'Silent Hill': '/assets/bbdd/g/Silent-Hill.webp',
  'SimRacing': '/assets/bbdd/g/SimRacing.webp',
  'Sims': '/assets/bbdd/g/thesims.webp',
  'Sonic Racing Crossworlds': '/assets/bbdd/g/Sonic-Racing-Crossworlds.webp',
  'Soulslike': '/assets/bbdd/g/Soulslike.webp',
  'Stardew Valley': '/assets/bbdd/g/Stardew-Valley.webp',
  'Street Fighter': '/assets/bbdd/g/StreetFighter.webp',
  'Survival Horror': '/assets/bbdd/g/Survival-Horror.webp',
  'Terraria': '/assets/bbdd/g/Terraria.webp',
  'Tetris': '/assets/bbdd/g/tetris.webp',
  'TFT': '/assets/bbdd/g/TFT.webp',
  'The Legend of Zelda': '/assets/bbdd/g/The-Legend-of-Zelda.webp',
  'Undertale': '/assets/bbdd/g/Undertale.webp',
  'Valorant': '/assets/bbdd/g/Valorant.webp',
  'Variedad': '/assets/bbdd/g/varietygames.webp',
  'Visual Novel': '/assets/bbdd/g/Visual-Novel.webp',
  'VRChat': '/assets/bbdd/g/VRChat.webp',
  'Warhammer 40K': '/assets/bbdd/g/Warhammer-40K.webp',
  'Wuthering Waves': '/assets/bbdd/g/Wuthering-Waves.webp'
};


const LOCAL_GAME_CACHE_PREFIX = 'streamhub_local_games_';
const LOCAL_GAME_CACHE_TTL_MS = 1000 * 60 * 60 * 12;

function normalizeGameName(input) {
  if (!input) return '';
  return String(input).trim();
}

function getCacheKey(gameName) {
  return `${LOCAL_GAME_CACHE_PREFIX}${gameName.toLowerCase().trim()}`;
}

function getCachedGame(gameName) {
  try {
    const key = getCacheKey(gameName);
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (!parsed.timestamp || !parsed.data) return null;

    const isExpired = (Date.now() - parsed.timestamp) > LOCAL_GAME_CACHE_TTL_MS;
    if (isExpired) {
      sessionStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error('Local game cache read error:', error);
    return null;
  }
}

function setCachedGame(gameName, data) {
  try {
    const key = getCacheKey(gameName);
    sessionStorage.setItem(
      key,
      JSON.stringify({
        timestamp: Date.now(),
        data
      })
    );
  } catch (error) {
    console.error('Local game cache write error:', error);
  }
}

function resolveGameCover(gameName) {
  return GAME_COVER_MAP[gameName] || '';
}

async function searchSingleGameRAWG(rawName) {
  const originalName = typeof rawName === 'string'
    ? rawName
    : (rawName?.title || rawName?.name || '');

  if (!originalName) return null;

  const normalizedName = normalizeGameName(originalName);

  const cached = getCachedGame(normalizedName);
  if (cached) {
    return cached;
  }

  const result = {
    requestedName: originalName,
    matchedName: normalizedName,
    cover: resolveGameCover(normalizedName),
    slug: '',
    rawgId: null,
    hasCover: Boolean(resolveGameCover(normalizedName))
  };

  setCachedGame(normalizedName, result);
  return result;
}

async function searchGamesRAWG(gameNames) {
  const safeList = Array.isArray(gameNames) ? gameNames.slice(0, 50) : [];
  const results = [];

  for (const gameName of safeList) {
    const result = await searchSingleGameRAWG(gameName);
    if (result) {
      results.push({
        name: result.matchedName || result.requestedName,
        cover: result.cover,
        slug: result.slug,
        rawgId: result.rawgId,
        hasCover: result.hasCover
      });
    }
  }

  return results;
}

window.searchGamesRAWG = searchGamesRAWG;
window.searchSingleGameRAWG = searchSingleGameRAWG;
window.GAME_COVER_MAP = GAME_COVER_MAP;