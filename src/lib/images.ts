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
