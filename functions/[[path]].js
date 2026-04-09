const RESERVED_EXACT = new Set([
  "",
  "/",
  "/FAQ",
  "/FAQ/",
  "/nota",
  "/nota/",
  "/registro",
  "/registro/",
  "/directorio",
  "/directorio/",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/404.html"
]);

const RESERVED_PREFIXES = [
  "/assets/",
  "/css/",
  "/js/",
  "/img/",
  "/images/",
  "/fonts/",
  "/data/",
  "/scripts/",
  "/u/"
];

function trimTrailingSlash(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isReserved(pathname) {
  if (RESERVED_EXACT.has(pathname)) return true;
  return RESERVED_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const originalPath = url.pathname;
  const cleanPath = trimTrailingSlash(originalPath);

  if (cleanPath.startsWith("/u/")) {
    const shortPath = cleanPath.replace(/^\/u\/(.+)$/, "/$1");
    return Response.redirect(new URL(shortPath, url.origin), 301);
  }

  if (isReserved(originalPath) || isReserved(cleanPath)) {
    return context.env.ASSETS.fetch(context.request.url);
  }

  const parts = cleanPath.split("/").filter(Boolean);

  if (parts.length === 1) {
    const username = parts[0];
    const candidateUrl = new URL(context.request.url);
    candidateUrl.pathname = `/u/${username}/`;

    const candidateResponse = await context.env.ASSETS.fetch(candidateUrl.toString());

    if (candidateResponse.status !== 404) {
      return candidateResponse;
    }
  }

  return context.env.ASSETS.fetch(context.request.url);
}