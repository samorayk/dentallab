import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn(
    '⚠️  Missing Supabase env vars. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anon || 'placeholder', {
  auth: { persistSession: true, autoRefreshToken: true },
});
