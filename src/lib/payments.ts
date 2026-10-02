// Every payment in the app goes through this file. Today it uses the simulator
// (simulate_payment). Going live replaces simulate/approve here plus two SQL
// functions; no screen needs to change.
import type { ListingStatus, PaymentKind, Provider, ReservationStatus, VerificationStatus } from './database.types';
import { supabase } from './supabase';

export type StartedPayment = {
  paymentId: string;
  amountNgwee: number;
  /** Reservations only. */
  reservationId?: string;
  reference?: string;
};

export type PaymentResult = {
  status: 'succeeded' | 'failed';
  kind: PaymentKind;
  reference?: string;
  reservation_status?: ReservationStatus;
  listing_status?: ListingStatus;
  problems?: string[];
  featured_until?: string;
  verification_status?: VerificationStatus;
  already_completed?: boolean;
};

function friendly(error: { message?: string } | null): Error {
  const m = error?.message ?? '';
  if (/failed to fetch|network/i.test(m)) return new Error("We couldn't reach BoardZM. Check your connection and try again.");
  // Our SQL functions already raise plain-words messages.
  return new Error(m || 'Something went wrong. Please try again.');
}

/** Tenant: hold a room and start the deposit + booking fee payment. */
export async function createReservation(listingId: string, provider: Provider, phone: string): Promise<StartedPayment> {
  const { data, error } = await supabase!.rpc('create_reservation', {
    p_listing_id: listingId,
    p_provider: provider,
    p_phone: phone,
  });
  if (error) throw friendly(error);
  const d = data as { payment_id: string; amount_ngwee: number; reservation_id: string; reference: string };
  return { paymentId: d.payment_id, amountNgwee: d.amount_ngwee, reservationId: d.reservation_id, reference: d.reference };
}

/** Landlord: start a listing, feature or verification fee. */
export async function startFeePayment(
  kind: Exclude<PaymentKind, 'reservation'>,
  targetId: string,
  provider: Provider,
  phone: string,
): Promise<StartedPayment> {
  const { data, error } = await supabase!.rpc('start_payment', {
    p_kind: kind,
    p_target_id: targetId,
    p_provider: provider,
    p_phone: phone,
  });
  if (error) throw friendly(error);
  const d = data as { payment_id: string; amount_ngwee: number };
  return { paymentId: d.payment_id, amountNgwee: d.amount_ngwee };
}

/** Test mode: the "Simulated phone prompt" Approve / Decline buttons. */
export async function simulatePayment(paymentId: string, approve: boolean): Promise<PaymentResult> {
  const { data, error } = await supabase!.rpc('simulate_payment', { p_payment_id: paymentId, p_approve: approve });
  if (error) throw friendly(error);
  return data as PaymentResult;
}

/** WhatsApp link with a friendly first message. */
export function whatsappLink(e164: string, message: string): string {
  return `https://wa.me/${e164.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}
