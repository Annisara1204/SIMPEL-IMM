/** Nama cookie penanda bahwa akun pernah login di browser ini. */
export const SESSION_COOKIE = "imm_known_session";

/** Tujuan redirect berdasarkan penanda sesi. Murni, mudah diuji. */
export function sessionLoginPath(expired: boolean): string {
  return expired ? "/login?reason=session" : "/login";
}
