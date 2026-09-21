import { Tabs } from 'expo-router/js-tabs';

import { Dock } from '@/components/Dock';
import { colors } from '@/theme';

export default function TabsLayout() {
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
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
