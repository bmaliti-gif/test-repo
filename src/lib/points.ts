// CabinHub points ("float"). Members top up with mobile money and spend points.
// Every price and rule is enforced in SQL (migration 0009); this file only calls it.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth';
import type { PointsReason, Provider, Tables } from './database.types';
import type { StartedPayment } from './payments';
import { supabase } from './supabase';

/** K50 → 100 points with the default rate (2 points per Kwacha). */
export function pointsFor(ngwee: number, pointsPerKwacha: number): number {
  return Math.floor(ngwee / 100) * pointsPerKwacha;
}

/** "1 point" / "20 points". */
export const pts = (n: number) => `${n.toLocaleString('en-US')} point${n === 1 ? '' : 's'}`;

export const REASON_LABEL: Record<PointsReason, string> = {
  topup: 'Top-up',
  contact_unlock: 'Landlord WhatsApp',
  area_pass: 'Area pass',
  extra_listing: 'Extra listing',
  verification: 'Verification',
  feature: 'Featured listing',
  refund: 'Refund from CabinHub',
  admin: 'Adjustment by CabinHub',
};

/** Thrown when the wallet is too low; the UI offers a top-up. */
export class NotEnoughPoints extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotEnoughPoints';
  }
}

function asError(error: { message?: string; hint?: string } | null): Error {
  const m = error?.message ?? 'Something went wrong. Please try again.';
  if (error?.hint === 'top_up' || /Not enough points/i.test(m)) return new NotEnoughPoints(m);
  if (/failed to fetch|network/i.test(m)) return new Error("We couldn't reach CabinHub. Check your connection and try again.");
  return new Error(m);
}

export type Wallet = { points: number; history: Tables<'point_transactions'>[]; areaPassUntil: string | null };

/** The signed-in member's balance, recent history and area pass (['wallet']). */
export function useWallet() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['wallet', user?.id],
    enabled: Boolean(supabase && user),
    queryFn: async (): Promise<Wallet> => {
      const [w, h, a] = await Promise.all([
        supabase!.from('wallets').select('points').eq('user_id', user!.id).maybeSingle(),
        supabase!.from('point_transactions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50),
        supabase!.from('area_passes').select('expires_at').eq('user_id', user!.id).maybeSingle(),
      ]);
      if (w.error) throw w.error;
      if (h.error) throw h.error;
      if (a.error) throw a.error;
      const until = a.data?.expires_at && new Date(a.data.expires_at) > new Date() ? a.data.expires_at : null;
      return { points: w.data?.points ?? 0, history: h.data, areaPassUntil: until };
    },
  });
}

function useRefreshPoints() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['wallet'] }),
      queryClient.invalidateQueries({ queryKey: ['landlord-contact'] }),
      queryClient.invalidateQueries({ queryKey: ['landlord'] }),
      queryClient.invalidateQueries({ queryKey: ['listings'] }),
      queryClient.invalidateQueries({ queryKey: ['listing'] }),
    ]);
}

/** Start a top-up payment (the PaymentDialog then asks the phone to approve). */
export async function startTopup(amountNgwee: number, provider: Provider, phone: string): Promise<StartedPayment> {
  const { data, error } = await supabase!.rpc('start_topup', { p_amount_ngwee: amountNgwee, p_provider: provider, p_phone: phone });
  if (error) throw asError(error);
  const d = data as { payment_id: string; amount_ngwee: number };
  return { paymentId: d.payment_id, amountNgwee: d.amount_ngwee };
}

export function useRefreshWallet() {
  return useRefreshPoints();
}

function useSpend<TArgs, TResult>(call: (args: TArgs) => Promise<TResult>) {
  const refresh = useRefreshPoints();
  return useMutation({ mutationFn: call, onSuccess: () => refresh() });
}

export function useUnlockContact() {
  return useSpend(async (listingId: string) => {
    const { data, error } = await supabase!.rpc('unlock_landlord_contact', { p_listing_id: listingId });
    if (error) throw asError(error);
    return data as { whatsapp: string | null; points_spent: number; points_balance: number | null };
  });
}

export function useBuyAreaPass() {
  return useSpend(async () => {
    const { data, error } = await supabase!.rpc('buy_area_pass');
    if (error) throw asError(error);
    return data as { expires_at: string; points_balance: number };
  });
}

export function usePublishListing() {
  return useSpend(async (listingId: string) => {
    const { data, error } = await supabase!.rpc('publish_listing', { p_listing_id: listingId });
    if (error) throw asError(error);
    return data as { listing_status: 'live' | 'in_review'; problems: string[]; points_spent: number; points_balance: number | null };
  });
}

export function useFeatureListing() {
  return useSpend(async (listingId: string) => {
    const { data, error } = await supabase!.rpc('feature_listing', { p_listing_id: listingId });
    if (error) throw asError(error);
    return data as { featured_until: string; points_spent: number; points_balance: number };
  });
}

export function useSubmitVerification() {
  return useSpend(async (verificationId: string) => {
    const { data, error } = await supabase!.rpc('submit_verification', { p_verification_id: verificationId });
    if (error) throw asError(error);
    return data as { verification_status: 'pending'; points_spent: number; points_balance: number };
  });
}

/** How many listings the landlord already has published (towards the free limit). */
export function useActiveListingCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['landlord', 'active-count', user?.id],
    enabled: Boolean(supabase && user),
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('active_listing_count', { p_landlord: user!.id });
      if (error) throw error;
      return data ?? 0;
    },
  });
}
