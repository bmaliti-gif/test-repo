import { supabase } from './supabase';

/** Public URL of a room photo in the listing-photos bucket. */
export function listingPhotoUrl(path: string | null | undefined): string | null {
  if (!path || !supabase) return null;
  return supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl;
}

/** Public URL of an ad image in the ad-images bucket. */
export function adImageUrl(path: string | null | undefined): string | null {
  if (!path || !supabase) return null;
  return supabase.storage.from('ad-images').getPublicUrl(path).data.publicUrl;
}

export const MAX_PHOTO_EDGE = 1600;

/** Scale (w, h) so the longest side is at most `max`, keeping the shape. */
export function fitWithin(w: number, h: number, max = MAX_PHOTO_EDGE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

/**
 * Shrink a phone photo before upload: at most 1600 px on the long side, WebP at 80%
 * (JPEG where the browser can't make WebP). A 4 MB camera photo becomes ~200–400 KB,
 * which matters on expensive mobile data.
 */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("This browser can't prepare photos. Try Chrome.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await toBlob('image/webp', 0.8);
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await toBlob('image/jpeg', 0.82);
  if (!jpeg) throw new Error("We couldn't prepare that photo. Try another one.");
  return jpeg;
}
