/** Pesan umum ketika detail teknis tidak boleh tampil ke pengguna. */
export const GENERAL_ERROR_MESSAGE =
  "Operasi gagal. Periksa kembali data dan coba lagi atau hubungi Admin sistem.";

const FORBIDDEN_DETAIL =
  /\b(select|insert|update|delete|violates|constraint|relation|column|syntax|schema|public\.|permission denied|duplicate key|uuid|error|detail|hint)\b/i;

/**
 * Pesan buatan aplikasi aman ditampilkan apa adanya. Pesan mentah dari basis
 * data atau teks yang tidak dikenal diganti dengan kalimat umum agar tidak
 * masuk ke URL, referrer, atau log browser.
 */
export function safeActionMessage(message: string): string {
  const trimmed = message.trim();
  if (
    !trimmed ||
    trimmed.length > 200 ||
    !/^[A-ZÀ-Ý]/.test(trimmed) ||
    FORBIDDEN_DETAIL.test(trimmed)
  )
    return GENERAL_ERROR_MESSAGE;
  return trimmed;
}
