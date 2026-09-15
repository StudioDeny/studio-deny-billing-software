import { createClient } from '@supabase/supabase-js';

// Fallback values match this project's real .env - the publishable key is
// meant to be public (it's protected by RLS, not secrecy), so hardcoding it
// as a fallback is safe. This just means a deployment that forgets to set
// the env vars (e.g. Vercel) still connects instead of crashing outright.
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) || 'https://ablejcrtuiohdrapgacb.supabase.co';
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  'sb_publishable_zUm3dp2CuyDLJvF4djpOLw_nW7U7PZB';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env - using this project\'s configured defaults.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
