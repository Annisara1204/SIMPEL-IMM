import type { ImgHTMLAttributes } from "react";

type PrivateImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "alt"> & {
  /** Wajib diisi: deskripsi foto untuk pembaca layar. */
  alt: string;
};

/**
 * <img> untuk foto privat Supabase: signed URL yang kedaluwarsa sehingga
 * next/image tidak menawarkan manfaat (optimasi/CDN tidak berlaku).
 * Ini satu-satunya pengecualian terhadap aturan @next/next/no-img-element.
 */
export function PrivateImg({ alt, ...rest }: PrivateImgProps) {
  // eslint-disable-next-line @next/next/no-img-element -- signed URL privat kedaluwarsa
  return <img alt={alt} {...rest} />;
}
