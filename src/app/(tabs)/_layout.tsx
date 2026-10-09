import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Dock, DockClearanceProvider } from '@/components/Dock';
import { FirstRunPlans } from '@/components/FirstRunPlans';
import { PaywallGate } from '@/components/PaywallGate';
import { StatusBarScrim } from '@/components/StatusBarScrim';
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

  /**
   * Step 1, for everyone setting up, and for anyone still missing a name.
   *
   * It used to be skipped whenever a name was already there, which Sign in
   * with Apple always provides — so half the people who installed the app
   * opened it on a screen headed "Step 2" with the third of five dots lit, and
   * no idea what they had missed. The numbering was honest about a sequence
   * that had quietly had a step removed from it, which is not the same as
   * being right.
   *
   * Nobody is asked for something we already know: the field arrives filled in
   * with whatever Apple told us, so it costs one tap and buys the same five
   * screens for everybody. A blank name is still caught on its own, because an
   * account made before this step existed has a routine and no name.
   */
  const settingUp = !isError && anchors && anchors.length === 0;
  const unnamed = !profileError && profile && profile.display_name.trim() === '';
  if (settingUp || unnamed) {
    return <Redirect href="/profile" />;
  }

  return (
    <PaywallGate>
      <FirstRunPlans />
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
        {/* Over the tabs, under the dock: every screen scrolls up into the
            status bar and none of them handled it. */}
        <StatusBarScrim />
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
