import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Dock, DockClearanceProvider } from '@/components/Dock';
import { PaywallGate } from '@/components/PaywallGate';
import { WALKTHROUGH_SEEN } from '@/app/(onboarding)/first-check-in';
import { useAnchors, useHabits, useMyProfile } from '@/lib/api';
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
  const { data: habits } = useHabits(userId);

  /**
   * Whether the walkthrough has been through. Null until storage answers, and
   * true if it cannot: unreadable storage should leave someone in the app, not
   * loop them through onboarding they have already done.
   */
  const [walked, setWalked] = useState<boolean | null>(null);
  useEffect(() => {
    void AsyncStorage.getItem(WALKTHROUGH_SEEN)
      .then((seen) => setWalked(seen === 'yes'))
      .catch(() => setWalked(true));
  }, []);

  // Hold here rather than flashing the tabs and bouncing into onboarding.
  if (isPending || profilePending || walked === null) {
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

  // Last: one real check-in on their own habit, because a reader told us the
  // app only made sense once they had used it. Needs a habit to check in, so
  // anyone who skipped that step gets it whenever they make their first one.
  if (walked === false && habits && habits.length > 0) {
    return <Redirect href="/first-check-in" />;
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
