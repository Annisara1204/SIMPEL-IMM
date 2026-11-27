/** Base URL aplikasi di belakang proxy — Next memakai base internal localhost:3000
 *  untuk request.url/request.nextUrl, jadi jangan dipakai untuk redirect absolut. */

const DEFAULT_HOST = "43.173.33.195:8080";

function allowedHosts(): string[] {
  return (process.env.IMM_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
}

/** Hanya host yang dikenal yang dipakai untuk redirect absolut. */
export function requestBaseUrl(request: { headers: Headers }): string {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    DEFAULT_HOST;
  const hostname = host.split(":")[0].toLowerCase();
  const isKnown =
    allowedHosts().includes(host) ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    host === DEFAULT_HOST;
  const safeHost = isKnown ? host : DEFAULT_HOST;
  const proto =
    safeHost === DEFAULT_HOST
      ? "http"
      : (request.headers.get("x-forwarded-proto") ?? "http");
  return `${proto}://${safeHost}`;
}

/** Redirect `next` hanya ke path relatif pada origin aplikasi yang sama. */
export function safeNextPath(next: string | null, base: string): string {
  if (!next) return "/dashboard";
  try {
    const baseUrl = new URL(base);
    const target = new URL(next, base);
    if (target.origin !== baseUrl.origin || !target.pathname.startsWith("/"))
      return "/dashboard";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/dashboard";
  }
}
