// Data for the landlord dashboard and listing form.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth';
import type { ListingCard, Tables } from './database.types';
import { compressImage } from './images';
import { supabase } from './supabase';

export type DepositRow = Pick<
  Tables<'reservations'>,
  'id' | 'reference' | 'status' | 'deposit_ngwee' | 'booking_fee_ngwee' | 'listing_id' | 'held_at' | 'released_at' | 'refunded_at' | 'created_at'
> & { tenant_name: string; room: string };

export type Dashboard = {
  listings: ListingCard[];
  deposits: DepositRow[];
  paidOutThisYear: number;
  verification: Tables<'verifications'> | null;
};

/** Everything on /landlord (['landlord', 'dashboard']). */
export function useLandlordDashboard() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['landlord', 'dashboard', user?.id],
    enabled: Boolean(supabase && user),
    queryFn: async (): Promise<Dashboard> => {
      const uid = user!.id;
      const [listings, payouts, verification] = await Promise.all([
        supabase!.from('listing_cards').select('*').eq('landlord_id', uid).order('created_at', { ascending: false }),
        supabase!.from('payouts').select('amount_ngwee, paid_at, reason, status').eq('recipient_id', uid),
        supabase!
          .from('verifications')
          .select('*')
          .eq('landlord_id', uid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (listings.error) throw listings.error;
      if (payouts.error) throw payouts.error;
      if (verification.error) throw verification.error;

      const ids = listings.data.map((l) => l.id);
      const reservations = ids.length
        ? await supabase!
            .from('reservations')
            .select('id, reference, status, deposit_ngwee, booking_fee_ngwee, listing_id, tenant_id, held_at, released_at, refunded_at, created_at')
            .in('listing_id', ids)
            .in('status', ['held', 'released', 'refunded'])
            .order('created_at', { ascending: false })
        : { data: [], error: null };
      if (reservations.error) throw reservations.error;

      const tenantIds = [...new Set(reservations.data.map((r) => r.tenant_id))];
      const tenants = tenantIds.length
        ? await supabase!.from('profiles').select('id, full_name').in('id', tenantIds)
        : { data: [], error: null };
      if (tenants.error) throw tenants.error;
      const names = new Map(tenants.data.map((t) => [t.id, t.full_name]));
      const titles = new Map(listings.data.map((l) => [l.id, l.title]));

      const year = new Date().getFullYear();
      const paidOutThisYear = payouts.data
        .filter((p) => p.reason === 'release' && p.status === 'paid' && p.paid_at && new Date(p.paid_at).getFullYear() === year)
        .reduce((sum, p) => sum + p.amount_ngwee, 0);

      return {
        listings: listings.data,
        deposits: reservations.data.map(({ tenant_id, ...r }) => ({
          ...r,
          tenant_name: names.get(tenant_id) || 'Tenant',
          room: titles.get(r.listing_id) ?? 'Room',
        })),
        paidOutThisYear,
        verification: verification.data,
      };
    },
  });
}

export type Photo = Pick<Tables<'listing_photos'>, 'id' | 'path' | 'position'>;
export type EditableListing = { listing: Tables<'listings'>; photos: Photo[] };

/** One of my listings, any status, with its photos (['landlord', 'listing', id]). */
export function useMyListing(id: string | undefined) {
  return useQuery({
    queryKey: ['landlord', 'listing', id],
    enabled: Boolean(supabase && id),
    queryFn: async (): Promise<EditableListing | null> => {
      const [listing, photos] = await Promise.all([
        supabase!.from('listings').select('*').eq('id', id!).maybeSingle(),
        supabase!.from('listing_photos').select('id, path, position').eq('listing_id', id!).order('position'),
      ]);
      if (listing.error) throw listing.error;
      if (photos.error) throw photos.error;
      return listing.data ? { listing: listing.data, photos: photos.data } : null;
    },
  });
}

/** Refresh the dashboard, the form and public search after a change. */
export function useInvalidateLandlord() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['landlord'] }),
      queryClient.invalidateQueries({ queryKey: ['listings'] }),
      queryClient.invalidateQueries({ queryKey: ['listing'] }),
    ]);
}

/** Compress and upload one photo, then record it at the end of the listing's photos. */
export async function uploadListingPhoto(userId: string, listingId: string, file: File, position: number): Promise<Photo> {
  const blob = await compressImage(file);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${listingId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase!.storage.from('listing-photos').upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (up.error) throw new Error("A photo didn't upload. Check your connection and try again.");
  const row = await supabase!
    .from('listing_photos')
    .insert({ listing_id: listingId, path, position })
    .select('id, path, position')
    .single();
  if (row.error) {
    await supabase!.storage.from('listing-photos').remove([path]);
    throw new Error("A photo didn't save. Try again.");
  }
  return row.data;
}

export async function deleteListingPhoto(photo: Photo) {
  const { error } = await supabase!.from('listing_photos').delete().eq('id', photo.id);
  if (error) throw new Error("We couldn't remove that photo. Try again.");
  // Best effort: an orphaned file is harmless.
  await supabase!.storage.from('listing-photos').remove([photo.path]);
}

/** Save the new order (first = cover). */
export async function savePhotoOrder(photos: Photo[]) {
  const results = await Promise.all(
    photos.map((p, i) => supabase!.from('listing_photos').update({ position: i }).eq('id', p.id)),
  );
  if (results.some((r) => r.error)) throw new Error("We couldn't save the new photo order. Try again.");
}

export function useListingStatusAction() {
  const invalidate = useInvalidateLandlord();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'archive' | 'relist' }) => {
      const { data, error } =
        action === 'archive'
          ? await supabase!.rpc('archive_listing', { p_listing_id: id })
          : await supabase!.rpc('relist_listing', { p_listing_id: id });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: () => invalidate(),
  });
}

export function useCancelReservation() {
  const invalidate = useInvalidateLandlord();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reservationId, reason }: { reservationId: string; reason: string }) => {
      const { error } = await supabase!.rpc('cancel_reservation', { p_reservation_id: reservationId, p_reason: reason });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: ['reservations'] })]),
  });
}
