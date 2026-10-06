import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth';
import type { Tables } from './database.types';
import { supabase } from './supabase';

export type RoommateProfile = Tables<'roommate_profiles'>;
export type Mate = RoommateProfile & { full_name: string; headline: string };
export type Request = Tables<'roommate_requests'>;

/** Campus choices for roommates. "Working" is for young professionals (city centre). */
export const MATE_CAMPUSES = [
  { id: 'unza', label: 'UNZA' },
  { id: 'unilus', label: 'UNILUS' },
  { id: 'unilus-silverest', label: 'UNILUS Silverest' },
  { id: 'lmmu', label: 'LMMU' },
  { id: 'evelyn-hone', label: 'Evelyn Hone' },
  { id: 'city-centre', label: 'Working' },
];
export const mateCampusLabel = (id: string) => MATE_CAMPUSES.find((c) => c.id === id)?.label ?? id;

/** My roommate profile, every visible profile, and requests I'm part of (['roommates']). */
export function useRoommates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['roommates', user?.id],
    enabled: Boolean(supabase && user),
    queryFn: async () => {
      const [profiles, requests] = await Promise.all([
        supabase!.from('roommate_profiles').select('*').order('updated_at', { ascending: false }).limit(300),
        supabase!.from('roommate_requests').select('*').order('created_at', { ascending: false }),
      ]);
      if (profiles.error) throw profiles.error;
      if (requests.error) throw requests.error;

      const ids = [...new Set([...profiles.data.map((p) => p.user_id), ...requests.data.flatMap((r) => [r.from_user, r.to_user])])];
      const people = ids.length ? await supabase!.from('profiles').select('id, full_name, headline').in('id', ids) : { data: [], error: null };
      if (people.error) throw people.error;
      const byId = new Map(people.data.map((p) => [p.id, p]));

      const withNames = (p: RoommateProfile): Mate => ({
        ...p,
        full_name: byId.get(p.user_id)?.full_name || 'CabinHub member',
        headline: byId.get(p.user_id)?.headline || '',
      });
      return {
        mine: profiles.data.find((p) => p.user_id === user!.id) ?? null,
        others: profiles.data.filter((p) => p.user_id !== user!.id && p.visible).map(withNames),
        requests: requests.data,
        names: byId,
      };
    },
  });
}

function useRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['roommates'] });
}

export type ProfileInput = Omit<RoommateProfile, 'user_id' | 'updated_at'>;

export function useSaveRoommateProfile() {
  const { user } = useAuth();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ input, exists }: { input: ProfileInput; exists: boolean }) => {
      const { error } = exists
        ? await supabase!.from('roommate_profiles').update(input).eq('user_id', user!.id)
        : await supabase!.from('roommate_profiles').insert(input);
      if (error) throw new Error("We couldn't save your roommate profile. Try again.");
    },
    onSuccess: refresh,
  });
}

export function useSendRequest() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (toUser: string) => {
      const { error } = await supabase!.from('roommate_requests').insert({ to_user: toUser });
      if (error?.code === '23505') return; // already sent
      if (error) throw new Error("We couldn't send that request. Try again.");
    },
    onSuccess: refresh,
  });
}

export function useWithdrawRequest() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase!.from('roommate_requests').delete().eq('id', requestId);
      if (error) throw new Error("We couldn't withdraw that request. Try again.");
    },
    onSuccess: refresh,
  });
}

export function useRespondRequest() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ requestId, accept }: { requestId: string; accept: boolean }) => {
      const { error } = await supabase!.rpc('respond_roommate_request', { p_request_id: requestId, p_accept: accept });
      if (error) throw new Error(error.message || "We couldn't answer that request.");
      return accept;
    },
    onSuccess: refresh,
  });
}

/** WhatsApp of a roommate, only after a request between us was accepted. */
export function useRoommateContact(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['roommates', 'contact', userId],
    enabled: Boolean(supabase && enabled),
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('get_roommate_contact', { p_user_id: userId });
      if (error) throw error;
      return data;
    },
  });
}
