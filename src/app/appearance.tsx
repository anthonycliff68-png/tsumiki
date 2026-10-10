import { Pressable, ScrollView, Text, View } from 'react-native';

import { Display, Screen } from '@/components/Screen';
import { copy } from '@/copy';
import { useAppearance, useStyles } from '@/lib/appearance';
import { goBack } from '@/lib/back';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

const THEME_LABEL = {
  light: copy.you.themeLight,
  dark: copy.you.themeDark,
  system: copy.you.themeSystem,
} as const;

/** Appearance, on its own. Three chips do not need a screen, but they do need
 *  to stop being the second thing on a list of eight unrelated settings. */
export default function AppearanceScreen() {
  const { choice, setChoice, colors } = useAppearance();
  const styles = useStyles(makeStyles);

  return (
    <Screen color={habitColors[3]} underDock={false}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" onPress={() => goBack()} style={styles.pill}>
            <Text style={styles.pillText}>{copy.newHabit.cancel}</Text>
          </Pressable>
        </View>

        <Display size={52} line={46}>{copy.you.appearance}</Display>

        <View style={styles.card}>
          <View style={styles.themes}>
            {(['light', 'dark', 'system'] as const).map((option) => {
              const picked = choice === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: picked }}
                  accessibilityLabel={THEME_LABEL[option]}
                  onPress={() => setChoice(option)}
                  style={[
                    styles.theme,
                    { borderColor: colors.border },
                    picked && { backgroundColor: colors.text, borderColor: 'transparent' },
                  ]}
                >
                  <Text
                    style={[styles.themeText, { color: picked ? colors.bg : colors.textMuted }]}
                  >
                    {THEME_LABEL[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.meta}>{copy.you.themeHint}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: Palette) => ({
  body: { gap: spacing.md, paddingBottom: spacing.xxl },
  topRow: { flexDirection: 'row', paddingBottom: spacing.sm },
  pill: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.06),
  },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.04),
  },
  themes: { flexDirection: 'row', gap: spacing.sm },
  theme: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: radii.chip,
    borderWidth: 1,
  },
  themeText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  meta: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textFaint },
}) as const;
