import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { palettes, type Palette } from '@/theme';

/** What someone chose, which is not the same as what is on screen. */
export type ThemeChoice = 'light' | 'dark' | 'system';
export type ThemeName = 'light' | 'dark';

const STORAGE_KEY = 'tsumiki.theme';

type Appearance = {
  /** What is actually on screen right now. */
  theme: ThemeName;
  /** What was chosen, including "follow the system". */
  choice: ThemeChoice;
  colors: Palette;
  setChoice: (choice: ThemeChoice) => void;
  /** False until the stored choice has been read back, so nothing flashes. */
  ready: boolean;
};

const AppearanceContext = createContext<Appearance | null>(null);

export function useAppearance(): Appearance {
  const value = use(AppearanceContext);
  if (!value) throw new Error('useAppearance must be used inside <AppearanceProvider>');
  return value;
}

/** The palette on screen. Most components only want this. */
export function useTheme(): Palette {
  return useAppearance().colors;
}

/**
 * Themed styles, built once per palette rather than once per render.
 *
 * `StyleSheet.create` at module scope is evaluated on import, which is why
 * the app could not change theme before: those objects were fixed before
 * anything had a chance to choose. Passing the palette in defers that.
 */
export function useStyles<T extends StyleSheet.NamedStyles<T>>(
  make: (colors: Palette) => T,
): T {
  const colors = useTheme();
  // The factory is a module-level function in every caller, so it is stable;
  // the palette is what actually changes.
  return useMemo(() => StyleSheet.create(make(colors)), [colors, make]);
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [choice, setChoiceState] = useState<ThemeChoice>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!alive) return;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setChoiceState(stored);
        }
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    // Remembering is not worth failing a tap over.
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  // 'system' tracks the OS live: useColorScheme re-renders when it changes.
  const theme: ThemeName = choice === 'system' ? (system === 'light' ? 'light' : 'dark') : choice;

  const value = useMemo<Appearance>(
    () => ({ theme, choice, colors: palettes[theme], setChoice, ready }),
    [theme, choice, setChoice, ready],
  );

  return <AppearanceContext value={value}>{children}</AppearanceContext>;
}
