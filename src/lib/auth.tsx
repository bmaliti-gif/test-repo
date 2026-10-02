import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Tables } from './database.types';

type AuthState = { session: Session | null; user: User | null; loading: boolean };

const AuthContext = createContext<AuthState>({ session: null, user: null, loading: true });

/** Keeps the Supabase session in React state. Sign-in links (?code=…) are handled by supabase-js. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ session: null, user: null, loading: Boolean(supabase) });

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ session: data.session, user: data.session?.user ?? null, loading: false });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ session, user: session?.user ?? null, loading: false });
      if (event === 'SIGNED_OUT') queryClient.clear();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export type Me = { profile: Tables<'profiles'>; contacts: Tables<'contacts'> | null };

/** The signed-in person's profile and private contact details (['me']). */
export function useMe() {
  const { user, loading } = useAuth();
  const query = useQuery({
    queryKey: ['me', user?.id],
    enabled: Boolean(supabase && user),
    queryFn: async (): Promise<Me> => {
      const [profile, contacts] = await Promise.all([
        supabase!.from('profiles').select('*').eq('id', user!.id).single(),
        supabase!.from('contacts').select('*').eq('user_id', user!.id).maybeSingle(),
      ]);
      if (profile.error) throw profile.error;
      if (contacts.error) throw contacts.error;
      return { profile: profile.data, contacts: contacts.data };
    },
  });
  return {
    ...query,
    me: query.data ?? null,
    // Still working out who this is (session or profile loading).
    pending: loading || (Boolean(user) && query.isPending),
  };
}

export async function signOut() {
  await supabase?.auth.signOut();
}

/** Only allow returning to a page inside this app (no "//evil.com"). */
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
  return next;
}

/** Address Supabase sends people back to after email links and Google. */
export function callbackUrl(next: string): string {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;
}

/** Where to go right after signing in: first-timers set up their profile on /welcome. */
export async function pathAfterSignIn(userId: string, next: string): Promise<string> {
  const target = safeNext(next);
  if (!supabase) return target;
  const { data } = await supabase.from('profiles').select('onboarded').eq('id', userId).maybeSingle();
  if (data && !data.onboarded) return `/welcome?next=${encodeURIComponent(target)}`;
  return target;
}

/** Supabase's English error messages, rewritten in plain, friendly words. */
export function friendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return "That email and password don't match. Try again, or reset your password.";
  if (m.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox (and the spam folder) for the link.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'There is already an account with that email. Sign in instead.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes'))
    return 'Too many tries in a short time. Please wait a minute and try again.';
  if (m.includes('password') && (m.includes('at least') || m.includes('weak') || m.includes('short')))
    return 'Choose a longer password: at least 8 characters.';
  if (m.includes('provider is not enabled') || m.includes('unsupported provider'))
    return "Google sign-in isn't switched on yet. Use email and password for now.";
  if (m.includes('failed to fetch') || m.includes('network'))
    return "We couldn't reach BoardZM. Check your internet connection and try again.";
  return message || 'Something went wrong. Please try again.';
}
