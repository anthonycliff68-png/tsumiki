import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/** Where the magic link comes back to. In Expo Go this is an exp:// URL. */
export const authRedirectTo = Linking.createURL('/auth-callback');

type AuthState = {
  session: Session | null;
  /** True until the stored session has been read back from disk. */
  loading: boolean;
  /** True while a magic-link code is being exchanged for a session. */
  exchanging: boolean;
  /** Set when the exchange fails, so the callback screen can say so. */
  authError: string | null;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** The device's IANA time zone, e.g. "Europe/London". Local dates depend on it. */
function deviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [exchanging, setExchanging] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const url = Linking.useURL();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // The magic link comes back as tsumiki://auth-callback?code=… (PKCE).
  useEffect(() => {
    if (!url || !isSupabaseConfigured) return;
    const { queryParams } = Linking.parse(url);
    const code = queryParams?.code;
    if (typeof code !== 'string') return;

    setExchanging(true);
    setAuthError(null);
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) setAuthError(error.message);
      })
      .finally(() => setExchanging(false));
  }, [url]);

  // Keep the profile's time zone in step with the device, so "today" means the
  // same thing to the app, the reminders and the nightly streak job.
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    const timezone = deviceTimezone();
    void supabase.from('profiles').update({ timezone }).eq('id', userId);
  }, [session?.user.id]);

  const signInWithEmail = useCallback(async (email: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: authRedirectTo },
    });
    if (error) throw error;
  }, []);

  const signInWithApple = useCallback(async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) throw new Error('Apple did not return an identity token.');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw error;

    // Apple hands over the name only on the very first sign-in.
    const givenName = credential.fullName?.givenName?.trim();
    if (givenName && data.user) {
      await supabase
        .from('profiles')
        .update({ display_name: givenName })
        .eq('id', data.user.id)
        .eq('display_name', '');
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      exchanging,
      authError,
      signInWithEmail,
      signInWithApple,
      signOut,
    }),
    [session, loading, exchanging, authError, signInWithEmail, signInWithApple, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
