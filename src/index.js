import { USER_MAP } from "./user-map.js";

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
  "/404.html",
  "/Bonescraft/"
]);

const RESERVED_PREFIXES = [
  "/assets/",
  "/css/",
  "/js/",
  "/img/",
  "/images/",
  "/fonts/",
  "/data/",
  "/scripts/"
];

const FILE_EXTENSION_REGEX = /\.[a-zA-Z0-9]+$/;

function normalizePath(pathname) {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isReserved(pathname) {
  return RESERVED_EXACT.has(pathname) || RESERVED_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const originalPath = url.pathname;
    const cleanPath = normalizePath(originalPath);

    // 1) Redirige /u/usuario -> /usuario
    if (cleanPath.startsWith("/u/")) {
      const slug = cleanPath.slice(3);
      if (slug && !slug.includes("/")) {
        const redirectUrl = new URL(request.url);
        redirectUrl.pathname = `/${slug}`;
        return Response.redirect(redirectUrl.toString(), 301);
      }
    }

    // 2) Deja pasar rutas reservadas y archivos reales
    if (
      isReserved(originalPath) ||
      isReserved(cleanPath) ||
      FILE_EXTENSION_REGEX.test(cleanPath)
    ) {
      return env.ASSETS.fetch(request);
    }

    // 3) Solo intenta rewrite para rutas tipo /usuario
    const parts = cleanPath.split("/").filter(Boolean);

    if (parts.length === 1) {
      const slug = parts[0];
      const canonicalSlug = USER_MAP[slug.toLowerCase()] || slug;

      const candidateUrl = new URL("https://assets.local");
      candidateUrl.pathname = `/u/${canonicalSlug}/`;

      const candidateResponse = await env.ASSETS.fetch(candidateUrl.toString());

      if (candidateResponse.status !== 404) {
        return candidateResponse;
      }
    }

    // 4) Todo lo demás sigue flujo normal
    return env.ASSETS.fetch(request);
  }
};