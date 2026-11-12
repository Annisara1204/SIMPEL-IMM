/** Bentuk relasi many-to-one hasil PostgREST. */
export type Relation<T> = T | T[] | null | undefined;

/**
 * Normalisasi relasi hasil bersarang dari Supabase/PostgREST.
 * Relasi many-to-one dapat dikembalikan sebagai objek, T[], atau null/undefined
 * tergantung versi klien — helper ini membuat bentuknya deterministik.
 */

/** Selalu kembalikan array (0..n elemen). */
export function relatedRows<T>(value: T | T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

/** Kembalikan item pertama tunggal, atau null bila tidak ada / array kosong. */
export function firstRelated<T>(
  relation: T | T[] | null | undefined,
): T | null {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}
