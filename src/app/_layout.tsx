import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/lib/auth';
import { takePendingInvite } from '@/lib/invite';
import { colors } from '@/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A phone loses the network constantly; one retry, then show what we have.
      retry: 1,
      staleTime: 30_000,
    },
  },
});

SplashScreen.preventAutoHideAsync().catch(() => {
  // The splash screen was already hidden — nothing to do.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Archivo, instanced at width 75% / weight 900, as the canvas specifies.
    'Archivo-Condensed-Black': require('../../assets/fonts/ArchivoCondensed-Black.ttf'),
    'DMSans-Regular': require('../../assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium': require('../../assets/fonts/DMSans-Medium.ttf'),
    'DMSans-Bold': require('../../assets/fonts/DMSans-Bold.ttf'),
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Signed in: the tabs, plus onboarding when the routine is still empty — the
 * tabs layout does that redirect, because it is the thing that needs anchors.
 * Signed out: the sign-in screen.
 */
function RootNavigator() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  // An invite tapped before signing in picks up where it left off.
  useEffect(() => {
    if (!session) return;
    void takePendingInvite().then((code) => {
      if (code) router.replace({ pathname: '/j/[code]', params: { code } });
    });
  }, [session]);

  if (loading) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="new-habit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="crew/[id]" />
        <Stack.Screen name="nudge/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="invite/[id]" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={session === null}>
        <Stack.Screen name="(auth)/sign-in" />
      </Stack.Protected>
      {/* These two work signed in or out: the magic link, and an invite link. */}
      <Stack.Screen name="auth-callback" />
      <Stack.Screen name="j/[code]" />
    </Stack>
  );
}
