import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The browser only ever gets the Project URL and the publishable key.
// The secret / service_role key must never appear in this app.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && key);

// Null until .env.local has both values (Block 3). Creating the client
// doesn't contact Supabase; requests only start when the app makes one.
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
