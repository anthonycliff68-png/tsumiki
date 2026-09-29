import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { ActivityIndicator, View } from 'react-native';

import { Dock, DockClearanceProvider } from '@/components/Dock';
import { PaywallGate } from '@/components/PaywallGate';
import { useAnchors, useMyProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useStyles, useTheme } from '@/lib/appearance';
import { type Palette } from '@/theme';

export default function TabsLayout() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: anchors, isPending, isError } = useAnchors(userId);
  const { data: profile, isPending: profilePending, isError: profileError } = useMyProfile(userId);

  // Hold here rather than flashing the tabs and bouncing into onboarding.
  if (isPending || profilePending) {
    return (
      <View style={styles.holding}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  // No name means a blank tile to everyone sharing a crew with you, so this
  // comes before the routine. It also catches accounts made before the step
  // existed — anyone who signed in by email was never asked.
  if (!profileError && profile && profile.display_name.trim() === '') {
    return <Redirect href="/profile" />;
  }

  // A day with no anchors has nothing to stack onto: set the routine up first.
  // If the query failed, let the tabs render — better a thin screen than a
  // sign-up loop the user cannot escape.
  if (!isError && anchors && anchors.length === 0) {
    return <Redirect href="/routine" />;
  }

  return (
    <PaywallGate>
      <DockClearanceProvider>
        <Tabs
          tabBar={(props) => <Dock {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: colors.bg },
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="my-day" />
          <Tabs.Screen name="crews" />
          <Tabs.Screen name="progress" />
          <Tabs.Screen name="you" />
        </Tabs>
      </DockClearanceProvider>
    </PaywallGate>
  );
}

const makeStyles = (colors: Palette) => ({
  holding: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
}) as const;
