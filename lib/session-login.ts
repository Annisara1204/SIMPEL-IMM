import { cookies } from "next/headers";
import { SESSION_COOKIE, sessionLoginPath } from "./session-login-path.ts";

/** Tujuan redirect saat sesi tidak ditemukan.
 * Cookie hanya dipakai untuk membedakan kunjungan baru dari sesi yang habis;
 * keputusan akses tetap dibuat oleh halaman dan Server Action. */
export async function sessionLoginUrl(): Promise<string> {
  const store = await cookies();
  return sessionLoginPath(store.has(SESSION_COOKIE));
}
