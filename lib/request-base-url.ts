/** Base URL aplikasi di belakang proxy — Next memakai base internal localhost:3000
 *  untuk request.url/request.nextUrl, jadi jangan dipakai untuk redirect absolut. */
export function requestBaseUrl(request: { headers: Headers }): string {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "43.173.33.195:8080";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
