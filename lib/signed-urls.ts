/**
 * Tanda tangan grup (batch) signed URL — menghindari N+1 panggilan storage
 * saat merender daftar peserta/berkas. Dipakai hanya dari Server Components.
 */
type SignedUrlEntry = {
  error: string | null;
  path: string | null;
  signedURL: string | null;
  signedUrl: string | null;
};
type StorageBucket = {
  createSignedUrls: (
    paths: string[],
    expiresIn: number,
  ) => Promise<{ data: SignedUrlEntry[] | null; error: unknown }>;
};
type StorageClient = {
  storage: {
    from: (bucket: string) => StorageBucket;
  };
};

export async function signMany(
  client: StorageClient,
  bucket: string,
  paths: Array<string | null | undefined>,
  expiresIn = 3600,
): Promise<Map<string, string | null>> {
  const uniquePaths = [
    ...new Set(paths.filter((path): path is string => !!path)),
  ];
  const signed = new Map<string, string | null>();
  if (!uniquePaths.length) return signed;
  const { data } = await client.storage
    .from(bucket)
    .createSignedUrls(uniquePaths, expiresIn);
  for (const entry of data ?? []) {
    if (entry.path) {
      signed.set(entry.path, entry.error ? null : entry.signedUrl);
    }
  }
  return signed;
}
