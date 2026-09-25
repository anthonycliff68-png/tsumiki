import { useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { PrimaryButton, TextButton } from '@/components/Button';
import { useStyles, useTheme } from '@/lib/appearance';
import { alpha, display, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

const { width: W } = Dimensions.get('window');

/** The app is named after stacking blocks. This is that, literally. */
const BLOCKS = [
  { label: 'PROGRESS', c: habitColors[4], w: 0.52 },
  { label: 'NUDGES', c: habitColors[2], w: 0.64 },
  { label: 'CREWS', c: habitColors[1], w: 0.78 },
  { label: 'HABITS', c: habitColors[0], w: 0.92 },
];

/** C — THE STACK. The icon's own metaphor, built on screen. */
export default function PaywallC() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual');

  return (
    <View style={styles.root}>
      <Svg width={W} height={460} style={styles.glow}>
        <Defs>
          <RadialGradient id="c" cx="50%" cy="80%" r="75%">
            <Stop offset="0" stopColor={habitColors[0]} stopOpacity="0.55" />
            <Stop offset="1" stopColor={habitColors[0]} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={W / 2} cy={300} r={W * 0.9} fill="url(#c)" />
      </Svg>

      <View style={styles.head}>
        <Text style={styles.eyebrow}>SEVEN DAYS, BUILT</Text>
        <Text style={[display(58, 52), styles.title]}>KEEP{'\n'}STACKING.</Text>
      </View>

      <View style={styles.stack}>
        {BLOCKS.map((b) => (
          <View
            key={b.label}
            style={[
              styles.block,
              { width: W * b.w, backgroundColor: b.c, shadowColor: b.c },
            ]}
          >
            <Text style={styles.blockLabel}>{b.label}</Text>
          </View>
        ))}
        <View style={styles.ground} />
      </View>

      <View style={styles.foot}>
        <View style={styles.plans}>
          {(['annual', 'monthly'] as const).map((p) => {
            const on = plan === p;
            return (
              <Pressable
                key={p}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={p === 'annual' ? 'Annual, $29.99 a year' : 'Monthly, $3.99 a month'}
                onPress={() => setPlan(p)}
                style={[styles.plan, on && styles.planOn]}
              >
                <Text style={[styles.planName, on && styles.onText]}>
                  {p === 'annual' ? '$29.99 / year' : '$3.99 / month'}
                </Text>
                <Text style={styles.planAside}>
                  {p === 'annual' ? 'Save 37%' : 'Cancel anytime'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <PrimaryButton label="Subscribe" onPress={() => {}} />
        <TextButton label="Restore purchases" onPress={() => {}} />
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  glow: { position: 'absolute', top: 40, left: 0 },
  head: { paddingTop: 90, paddingHorizontal: spacing.xl, gap: spacing.sm },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 3.2, color: colors.textMuted },
  title: { color: colors.text },
  stack: { alignItems: 'center', marginTop: spacing.xl },
  block: {
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    paddingLeft: spacing.lg,
    marginBottom: 6,
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  blockLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 2.6,
    color: '#FFFFFF',
  },
  ground: {
    width: W * 0.96,
    height: 1,
    backgroundColor: alpha(colors.overlay, 0.18),
    marginTop: 4,
  },
  foot: { marginTop: 'auto', padding: spacing.xl, gap: spacing.sm },
  plans: { gap: spacing.sm, marginBottom: spacing.sm },
  plan: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  planOn: { borderColor: colors.text, borderWidth: 2, backgroundColor: alpha(colors.overlay, 0.06) },
  planName: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textMuted },
  onText: { color: colors.text },
  planAside: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint, marginTop: 2 },
}) as const;
