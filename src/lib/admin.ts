// Data for /admin. Admin-only reads work because RLS lets is_admin() see every row.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListingCard, PointsSettings, ReportAction, Tables } from './database.types';
import { supabase } from './supabase';

type Names = Map<string, { full_name: string; headline: string }>;

async function namesFor(ids: string[]): Promise<Names> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data, error } = await supabase!.from('profiles').select('id, full_name, headline').in('id', unique);
  if (error) throw error;
  return new Map(data.map((p) => [p.id, { full_name: p.full_name, headline: p.headline }]));
}

/** Numbers for the tab labels (['admin', 'counts']). */
export function useAdminCounts() {
  return useQuery({
    queryKey: ['admin', 'counts'],
    enabled: Boolean(supabase),
    queryFn: async () => {
      const count = async (table: 'verifications' | 'listings' | 'reports' | 'reservations' | 'ads', col: string, val: string | boolean) => {
        const { count: n, error } = await supabase!.from(table).select('id', { count: 'exact', head: true }).eq(col, val);
        if (error) throw error;
        return n ?? 0;
      };
      const [verifications, listings, reports, reservations, ads] = await Promise.all([
        count('verifications', 'status', 'pending'),
        count('listings', 'status', 'in_review'),
        count('reports', 'status', 'open'),
        count('reservations', 'status', 'held'),
        count('ads', 'active', true),
      ]);
      return { verifications, listings, reports, reservations, ads, settings: 0 };
    },
  });
}

function useAdminRefresh() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin'] }),
      queryClient.invalidateQueries({ queryKey: ['listings'] }),
      queryClient.invalidateQueries({ queryKey: ['listing'] }),
      queryClient.invalidateQueries({ queryKey: ['ads'] }),
      queryClient.invalidateQueries({ queryKey: ['settings'] }),
    ]);
}

// ─── verifications ─────────────────────────────────────────────────────────

export type AdminVerification = Tables<'verifications'> & { landlord_name: string };

export function useAdminVerifications() {
  return useQuery({
    queryKey: ['admin', 'verifications'],
    queryFn: async (): Promise<AdminVerification[]> => {
      const { data, error } = await supabase!.from('verifications').select('*').eq('status', 'pending').order('submitted_at');
      if (error) throw error;
      const names = await namesFor(data.map((v) => v.landlord_id));
      return data.map((v) => ({ ...v, landlord_name: names.get(v.landlord_id)?.full_name || 'Landlord' }));
    },
  });
}

export function useReviewVerification() {
  const refresh = useAdminRefresh();
  return useMutation({
    mutationFn: async ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) => {
      const { error } = await supabase!.rpc('review_verification', { p_id: id, p_approve: approve, p_reason: reason });
      if (error) throw new Error(error.message);
    },
    onSuccess: refresh,
  });
}

// ─── listings ──────────────────────────────────────────────────────────────

export function useAdminListings(search: string) {
  return useQuery({
    queryKey: ['admin', 'listings', search],
    queryFn: async (): Promise<ListingCard[]> => {
      let q = supabase!.from('listing_cards').select('*').order('updated_at', { ascending: false }).limit(100);
      q = search.trim() ? q.ilike('title', `%${search.trim().replace(/[%_]/g, '')}%`) : q.eq('status', 'in_review');
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useListingPhotos(listingId: string | null) {
  return useQuery({
    queryKey: ['admin', 'photos', listingId],
    enabled: Boolean(listingId),
    queryFn: async () => {
      const { data, error } = await supabase!.from('listing_photos').select('path').eq('listing_id', listingId!).order('position');
      if (error) throw error;
      return data.map((p) => p.path);
    },
  });
}

export function useReviewListing() {
  const refresh = useAdminRefresh();
  return useMutation({
    mutationFn: async ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) => {
      const { error } = await supabase!.rpc('review_listing', { p_id: id, p_approve: approve, p_reason: reason });
      if (error) throw new Error(error.message);
    },
    onSuccess: refresh,
  });
}

// ─── reports ───────────────────────────────────────────────────────────────

export type AdminReport = Tables<'reports'> & { reporter_name: string; target_label: string; target_detail: string; target_link: string | null };

export function useAdminReports() {
  return useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: async (): Promise<AdminReport[]> => {
      const { data, error } = await supabase!.from('reports').select('*').eq('status', 'open').order('created_at');
      if (error) throw error;
      const ids = (t: string) => data.filter((r) => r.target_type === t).map((r) => r.target_id);
      const [listings, reviews, reservations] = await Promise.all([
        ids('listing').length ? supabase!.from('listings').select('id, title, area, status').in('id', ids('listing')) : { data: [], error: null },
        ids('review').length ? supabase!.from('reviews').select('id, body, rating, listing_id, status').in('id', ids('review')) : { data: [], error: null },
        ids('reservation').length ? supabase!.from('reservations').select('id, reference, status, listing_id').in('id', ids('reservation')) : { data: [], error: null },
      ]);
      if (listings.error) throw listings.error;
      if (reviews.error) throw reviews.error;
      if (reservations.error) throw reservations.error;
      const names = await namesFor([...data.map((r) => r.reporter_id), ...ids('user')]);

      return data.map((r) => {
        let target_label = 'Item';
        let target_detail = '';
        let target_link: string | null = null;
        if (r.target_type === 'listing') {
          const l = listings.data.find((x) => x.id === r.target_id);
          target_label = l ? `Listing: ${l.title}` : 'Listing (removed)';
          target_detail = l ? `${l.area} · now ${l.status.replace('_', ' ')}` : '';
          target_link = l ? `/listing/${l.id}` : null;
        } else if (r.target_type === 'review') {
          const v = reviews.data.find((x) => x.id === r.target_id);
          target_label = v ? `Review (${v.rating}/5, ${v.status})` : 'Review (removed)';
          target_detail = v?.body ?? '';
          target_link = v ? `/listing/${v.listing_id}` : null;
        } else if (r.target_type === 'reservation') {
          const s = reservations.data.find((x) => x.id === r.target_id);
          target_label = s ? `Reservation ${s.reference} (${s.status})` : 'Reservation';
          target_link = s ? `/listing/${s.listing_id}` : null;
        } else {
          target_label = `Member: ${names.get(r.target_id)?.full_name || 'unknown'}`;
        }
        return { ...r, reporter_name: names.get(r.reporter_id)?.full_name || 'Member', target_label, target_detail, target_link };
      });
    },
  });
}

export function useResolveReport() {
  const refresh = useAdminRefresh();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: ReportAction }) => {
      const { error } = await supabase!.rpc('resolve_report', { p_id: id, p_action: action });
      if (error) throw new Error(error.message);
    },
    onSuccess: refresh,
  });
}

// ─── reservations ──────────────────────────────────────────────────────────

export type AdminReservation = Tables<'reservations'> & { tenant_name: string; room: string };

export function useAdminReservations(status: string) {
  return useQuery({
    queryKey: ['admin', 'reservations', status],
    queryFn: async (): Promise<AdminReservation[]> => {
      let q = supabase!.from('reservations').select('*').order('created_at', { ascending: false }).limit(200);
      if (status !== 'all') q = q.eq('status', status as Tables<'reservations'>['status']);
      const { data, error } = await q;
      if (error) throw error;
      const listingIds = [...new Set(data.map((r) => r.listing_id))];
      const listings = listingIds.length ? await supabase!.from('listings').select('id, title').in('id', listingIds) : { data: [], error: null };
      if (listings.error) throw listings.error;
      const names = await namesFor(data.map((r) => r.tenant_id));
      return data.map((r) => ({
        ...r,
        tenant_name: names.get(r.tenant_id)?.full_name || 'Tenant',
        room: listings.data.find((l) => l.id === r.listing_id)?.title ?? 'Room',
      }));
    },
  });
}

export function useSettleReservation() {
  const refresh = useAdminRefresh();
  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: 'release' | 'refund'; reason?: string }) => {
      const { error } =
        action === 'release'
          ? await supabase!.rpc('confirm_move_in', { p_reservation_id: id })
          : await supabase!.rpc('cancel_reservation', { p_reservation_id: id, p_reason: reason ?? 'Refunded by CabinHub' });
      if (error) throw new Error(error.message);
    },
    onSuccess: refresh,
  });
}

// ─── ads ───────────────────────────────────────────────────────────────────

export type AdRow = Tables<'ads'>;
export type AdInput = Omit<AdRow, 'id' | 'clicks' | 'created_at'>;

export function useAdminAds() {
  return useQuery({
    queryKey: ['admin', 'ads'],
    queryFn: async (): Promise<AdRow[]> => {
      const { data, error } = await supabase!.from('ads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveAd() {
  const refresh = useAdminRefresh();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string | null; input: AdInput }) => {
      const { error } = id ? await supabase!.from('ads').update(input).eq('id', id) : await supabase!.from('ads').insert(input);
      if (error) throw new Error("We couldn't save the ad. Check the link starts with https:// and try again.");
    },
    onSuccess: refresh,
  });
}

export async function uploadAdImage(file: File): Promise<string> {
  const { compressImage } = await import('./images');
  const blob = await compressImage(file);
  const path = `${crypto.randomUUID()}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`;
  const { error } = await supabase!.storage.from('ad-images').upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (error) throw new Error("The image didn't upload. Try again.");
  return path;
}

// ─── settings ──────────────────────────────────────────────────────────────

export type SettingsInput = Pick<
  Tables<'app_settings'>,
  'deposit_ngwee' | 'booking_fee_ngwee' | 'feature_days' | 'banned_words'
> & Partial<PointsSettings>;

export function useSaveSettings() {
  const refresh = useAdminRefresh();
  return useMutation({
    mutationFn: async (input: SettingsInput) => {
      const { error } = await supabase!.from('app_settings').update(input).eq('id', 1);
      if (error) throw new Error("We couldn't save the settings. Try again.");
    },
    onSuccess: refresh,
  });
}

// ─── document retention ────────────────────────────────────────────────────

/**
 * Privacy policy: ID documents are deleted 30 days after review. Runs quietly whenever
 * an admin opens the Verifications tab. Returns how many submissions were cleared.
 */
export async function purgeExpiredDocs(): Promise<number> {
  const { data, error } = await supabase!.rpc('expired_verification_docs');
  if (error || !data?.length) return 0;
  let cleared = 0;
  for (const row of data) {
    const removed = row.paths.length ? await supabase!.storage.from('verification-docs').remove(row.paths) : { error: null };
    if (removed.error) continue;
    const { error: e } = await supabase!.rpc('clear_verification_docs', { p_verification_id: row.verification_id });
    if (!e) cleared++;
  }
  return cleared;
}
