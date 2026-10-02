import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// The browser only ever gets the Project URL and the publishable key.
// The secret / service_role key must never appear in this app.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && key);

// Private browsing or blocked site data can make localStorage throw. Fall back to
// memory so the app still works (the sign-in just won't survive a refresh).
const memory = new Map<string, string>();
const safeStorage = {
  getItem(k: string) {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return memory.get(k) ?? null;
    }
  },
  setItem(k: string, v: string) {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      memory.set(k, v);
    }
  },
  removeItem(k: string) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      memory.delete(k);
    }
  },
};

// Null until .env.local has both values. Creating the client doesn't contact
// Supabase; requests only start when the app makes one.
export const supabase: SupabaseClient<Database> | null = supabaseConfigured
  ? createClient<Database>(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // PKCE: email and Google links come back as ?code=…, which supabase-js exchanges on load.
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: safeStorage,
      },
    })
  : null;
