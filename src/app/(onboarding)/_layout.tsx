import { Stack } from 'expo-router';

import { useTheme } from '@/lib/appearance';
export default function OnboardingLayout() {
  const colors = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
