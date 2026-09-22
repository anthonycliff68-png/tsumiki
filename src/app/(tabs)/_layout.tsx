import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Dock } from '@/components/Dock';
import { useAnchors } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

export default function TabsLayout() {
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

  // A day with no anchors has nothing to stack onto: set the routine up first.
  // If the query failed, let the tabs render — better a thin screen than a
  // sign-up loop the user cannot escape.
  if (!isError && anchors && anchors.length === 0) {
    return <Redirect href="/routine" />;
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  holding: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
