import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { ActivityIndicator, View } from 'react-native';

import { Dock, DockClearanceProvider } from '@/components/Dock';
import { FirstRunPlans } from '@/components/FirstRunPlans';
import { StatusBarScrim } from '@/components/StatusBarScrim';
import { useAnchors } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useStyles, useTheme } from '@/lib/appearance';
import { type Palette } from '@/theme';

export default function TabsLayout() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: anchors, isPending, isError } = useAnchors(userId);

  // Hold here rather than flashing the tabs and bouncing into onboarding.
  if (isPending) {
    return (
      <View style={styles.holding}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  /**
   * No routine yet means setting up. A name is no longer asked for here: only
   * crews show it, so starting or joining one asks instead.
   */
  const settingUp = !isError && anchors && anchors.length === 0;
  if (settingUp) return <Redirect href="/setup" />;

  return (
    <>
      <FirstRunPlans />
      <DockClearanceProvider>
        <Tabs
          initialRouteName="my-day"
          tabBar={(props) => <Dock {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: colors.bg },
          }}
        >
          <Tabs.Screen name="my-day" />
          <Tabs.Screen name="notes" />
          <Tabs.Screen name="crews" />
          <Tabs.Screen name="you" />
          {/* Not a tab: only here so "/" can redirect to My Day. */}
          <Tabs.Screen name="index" />
        </Tabs>
        {/* Over the tabs, under the dock: every screen scrolls up into the
            status bar and none of them handled it. */}
        <StatusBarScrim />
      </DockClearanceProvider>
    </>
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
