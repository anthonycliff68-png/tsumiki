import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
// Supabase replaced the anon key with the publishable key (sb_publishable_…);
// the old one keeps working until they retire it, so accept either.
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  '';

/**
 * False until the project's URL and key are in .env.local. The sign-in screen
 * checks this so the app still runs — and says what is missing — on a machine
 * that has not been set up yet.
 */
export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseKey.length > 0;

// createClient throws on an empty URL, which would take the whole app down
// before it could explain itself. Stand-ins keep it constructible; every caller
// checks isSupabaseConfigured first.
export const supabase = createClient<Database>(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseKey : 'placeholder-publishable-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Native apps never land on a URL with a session in it; the deep-link
      // handler in @/lib/auth exchanges the magic-link code itself.
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);

// Refresh the access token while the app is in the foreground, and stop when it
// is backgrounded — Supabase's recommended setup for React Native.
AppState.addEventListener('change', (state) => {
  if (!isSupabaseConfigured) return;
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
