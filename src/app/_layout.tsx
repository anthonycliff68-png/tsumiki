import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/lib/auth';
import { colors } from '@/theme';

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
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/** Signed in: the tabs. Signed out: the sign-in screen. Nothing in between. */
function RootNavigator() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

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
      </Stack.Protected>
      <Stack.Protected guard={session === null}>
        <Stack.Screen name="(auth)/sign-in" />
      </Stack.Protected>
      {/* The magic link lands here whether or not there is a session yet. */}
      <Stack.Screen name="auth-callback" />
    </Stack>
  );
}
