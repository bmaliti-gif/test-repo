import { useQuery } from '@tanstack/react-query';
import type { SearchCard } from '../pages/search/filters';
import { CARD_COLUMNS } from '../pages/search/filters';
import type { AppSettings, Tables } from './database.types';
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
