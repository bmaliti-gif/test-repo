import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SearchCard } from '../pages/search/filters';
import { CARD_COLUMNS } from '../pages/search/filters';
import { useAuth } from './auth';
import type { AppSettings, Database, ListingCard, ReportTarget, Tables } from './database.types';
import { supabase } from './supabase';

/** Fees, deposit and payments mode from app_settings (['settings']). */
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    enabled: Boolean(supabase),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase!.from('app_settings').select('*').eq('id', 1).single();
      if (error) throw error;
      return data;
    },
  });
}

/** Every live and reserved room, for search and the map (['listings', 'search']). Filtering is local. */
export function useSearchCards() {
  return useQuery({
    queryKey: ['listings', 'search'],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<SearchCard[]> => {
      const { data, error } = await supabase!
        .from('listing_cards')
        .select(CARD_COLUMNS)
        .in('status', ['live', 'reserved'])
        .limit(500);
      if (error) throw error;
      return data as unknown as SearchCard[];
    },
  });
}

export type Ad = Pick<Tables<'ads'>, 'id' | 'business_name' | 'headline' | 'body' | 'cta_label' | 'cta_url' | 'image_path' | 'areas'>;

/** Running local-business ads (RLS only returns active ones in their dates) (['ads']). */
export function useAds() {
  return useQuery({
    queryKey: ['ads'],
    enabled: Boolean(supabase),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Ad[]> => {
      const { data, error } = await supabase!
        .from('ads')
        .select('id, business_name, headline, body, cta_label, cta_url, image_path, areas')
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── one listing ───────────────────────────────────────────────────────────

export type ReviewWithAuthor = Pick<Tables<'reviews'>, 'id' | 'rating' | 'body' | 'created_at' | 'tenant_id' | 'status'> & {
  author: { full_name: string; headline: string } | null;
};

export type ListingDetail = {
  listing: ListingCard;
  photos: string[];
  reviews: ReviewWithAuthor[];
};

/** A listing with its photos and reviews (['listing', id]). null = not found or not visible. */
export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ['listing', id],
    enabled: Boolean(supabase && id),
    queryFn: async (): Promise<ListingDetail | null> => {
      const [listing, photos, reviews] = await Promise.all([
        supabase!.from('listing_cards').select('*').eq('id', id!).maybeSingle(),
        supabase!.from('listing_photos').select('path, position').eq('listing_id', id!).order('position'),
        supabase!
          .from('reviews')
          .select('id, rating, body, created_at, tenant_id, status')
          .eq('listing_id', id!)
          .order('created_at', { ascending: false }),
      ]);
      if (listing.error) throw listing.error;
      if (!listing.data) return null;
      if (photos.error) throw photos.error;
      if (reviews.error) throw reviews.error;

      // Reviewer names come from public profiles.
      const authorIds = [...new Set(reviews.data.map((r) => r.tenant_id))];
      const authors = authorIds.length
        ? await supabase!.from('profiles').select('id, full_name, headline').in('id', authorIds)
        : { data: [], error: null };
      if (authors.error) throw authors.error;
      const byId = new Map(authors.data.map((a) => [a.id, a]));

      return {
        listing: listing.data,
        photos: photos.data.map((p) => p.path),
        reviews: reviews.data.map((r) => ({ ...r, author: byId.get(r.tenant_id) ?? null })),
      };
    },
  });
}

// ─── saved rooms ───────────────────────────────────────────────────────────

/** Ids of the rooms the signed-in person saved (['saved']). Empty when signed out. */
export function useSavedIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['saved', user?.id],
    enabled: Boolean(supabase && user),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase!
        .from('saved_listings')
        .select('listing_id, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map((r) => r.listing_id);
    },
  });
}

/** Save / unsave a room. Updates the heart and header count instantly, then confirms with the server. */
export function useToggleSaved() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ['saved', user?.id];

  return useMutation({
    mutationFn: async ({ listingId, save }: { listingId: string; save: boolean }) => {
      const { error } = save
        ? await supabase!.from('saved_listings').insert({ listing_id: listingId })
        : await supabase!.from('saved_listings').delete().eq('listing_id', listingId).eq('user_id', user!.id);
      // Saving twice (e.g. two tabs) is fine.
      if (error && error.code !== '23505') throw error;
    },
    onMutate: async ({ listingId, save }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<string[]>(key) ?? [];
      queryClient.setQueryData<string[]>(key, save ? [listingId, ...before.filter((x) => x !== listingId)] : before.filter((x) => x !== listingId));
      return { before };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) queryClient.setQueryData(key, ctx.before);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['saved'] }),
  });
}

/** Cards for the saved rooms that are still visible (['saved', 'cards', ids]). */
export function useSavedCards(ids: string[] | undefined) {
  return useQuery({
    queryKey: ['saved', 'cards', ids],
    enabled: Boolean(supabase && ids && ids.length > 0),
    queryFn: async (): Promise<SearchCard[]> => {
      const { data, error } = await supabase!.from('listing_cards').select(CARD_COLUMNS).in('id', ids!);
      if (error) throw error;
      const cards = data as unknown as SearchCard[];
      // Keep the order they were saved in (newest first).
      return ids!.map((id) => cards.find((c) => c.id === id)).filter((c): c is SearchCard => Boolean(c));
    },
  });
}

// ─── reports ───────────────────────────────────────────────────────────────

export function useReport() {
  return useMutation({
    mutationFn: async (r: { targetType: ReportTarget; targetId: string; reason: string; note: string }) => {
      const { error } = await supabase!
        .from('reports')
        .insert({ target_type: r.targetType, target_id: r.targetId, reason: r.reason, note: r.note });
      if (error?.code === '23505') throw new Error("You've already reported this. Our team will look at it.");
      if (error) throw new Error("We couldn't send your report. Check your connection and try again.");
    },
  });
}

// ─── reservations ──────────────────────────────────────────────────────────

export type MyReservation = Database['public']['Functions']['my_reservations']['Returns'][number];

/** The signed-in tenant's held, released and refunded reservations (['reservations']). */
export function useMyReservations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['reservations', user?.id],
    enabled: Boolean(supabase && user),
    queryFn: async (): Promise<MyReservation[]> => {
      const { data, error } = await supabase!.rpc('my_reservations');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** The landlord's WhatsApp, only once this tenant has a held or released reservation. */
export function useLandlordContact(listingId: string, enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['landlord-contact', listingId, user?.id],
    enabled: Boolean(supabase && user && enabled),
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase!.rpc('get_landlord_contact', { p_listing_id: listingId });
      if (error) throw error;
      return data;
    },
  });
}

/** Refresh everything a reservation change affects. */
export function useInvalidateReservation() {
  const queryClient = useQueryClient();
  return (listingId?: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['reservations'] }),
      queryClient.invalidateQueries({ queryKey: ['listings'] }),
      queryClient.invalidateQueries({ queryKey: ['landlord-contact'] }),
      listingId ? queryClient.invalidateQueries({ queryKey: ['listing', listingId] }) : null,
    ]);
}

export function useConfirmMoveIn() {
  const invalidate = useInvalidateReservation();
  return useMutation({
    mutationFn: async ({ reservationId }: { reservationId: string; listingId: string }) => {
      const { error } = await supabase!.rpc('confirm_move_in', { p_reservation_id: reservationId });
      if (error) throw new Error(error.message || "We couldn't confirm your move-in. Try again.");
    },
    onSuccess: (_d, v) => invalidate(v.listingId),
  });
}
