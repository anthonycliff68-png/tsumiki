import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Welcome } from '@/components/Welcome';
import { useTheme } from '@/lib/appearance';

const SEEN = 'tsumiki.welcome.seen';

/**
 * The first run, and only the first run.
 *
 * Someone who has already been told what habit stacking is should not be
 * told again every time they sign out, so the carousel is skipped once it
 * has been through. The check happens before the first paint — a flash of
 * onboarding you then get yanked out of is worse than no onboarding.
 */
export default function WelcomeRoute() {
  const colors = useTheme();
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(SEEN)
      .then((seen) => {
        if (!alive) return;
        if (seen === 'yes') {
          router.replace('/(auth)/sign-in');
          return;
        }
        setShow(true);
      })
      // Unreadable storage should not block someone from signing up.
      .catch(() => alive && setShow(true));
    return () => {
      alive = false;
    };
  }, []);

  const done = () => {
    void AsyncStorage.setItem(SEEN, 'yes').catch(() => {});
    router.replace('/(auth)/sign-in');
  };

  if (show !== true) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return <Welcome onStart={done} onSkip={done} />;
}
