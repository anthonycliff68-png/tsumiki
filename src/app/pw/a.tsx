import { BlurView } from 'expo-blur';
import { useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { PrimaryButton, TextButton } from '@/components/Button';
import { useStyles, useTheme } from '@/lib/appearance';
import { alpha, display, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

const { width: W } = Dimensions.get('window');
const RUN = 6;

/** A — THE MONOLITH. The run is the whole screen. */
export default function PaywallA() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual');
  const accent = habitColors[1];

  return (
    <View style={styles.root}>
      <Svg width={W} height={620} style={styles.glow}>
        <Defs>
          <RadialGradient id="g" cx="50%" cy="35%" r="70%">
            <Stop offset="0" stopColor={accent} stopOpacity="0.85" />
            <Stop offset="0.55" stopColor={accent} stopOpacity="0.18" />
            <Stop offset="1" stopColor={accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={W / 2} cy={260} r={W * 0.85} fill="url(#g)" />
      </Svg>

      <View style={styles.hero}>
        <Text style={styles.kicker}>YOUR RUN</Text>
        <Text style={[display(196, 168), styles.number]}>{RUN}</Text>
        <Text style={styles.days}>DAYS</Text>
        <Text style={styles.line}>Don't let it be the longest one you ever had.</Text>
      </View>

      <BlurView intensity={40} tint="dark" style={styles.tray}>
        <View style={styles.plans}>
          {(['annual', 'monthly'] as const).map((p) => (
            <Pressable
              key={p}
              accessibilityRole="radio"
              accessibilityState={{ selected: plan === p }}
              accessibilityLabel={p === 'annual' ? 'Annual, $29.99 a year' : 'Monthly, $3.99 a month'}
              onPress={() => setPlan(p)}
              style={[styles.plan, plan === p && { borderColor: accent, backgroundColor: alpha(accent, 0.18) }]}
            >
              <Text style={styles.planName}>{p === 'annual' ? 'YEAR' : 'MONTH'}</Text>
              <Text style={[styles.planPrice, plan === p && { color: colors.text }]}>
                {p === 'annual' ? '$29.99' : '$3.99'}
              </Text>
              {p === 'annual' && <Text style={[styles.save, { color: accent }]}>SAVE 37%</Text>}
            </Pressable>
          ))}
        </View>
        <PrimaryButton label="Keep the run alive" onPress={() => {}} />
        <TextButton label="Restore purchases" onPress={() => {}} />
      </BlurView>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  glow: { position: 'absolute', top: -120, left: 0 },
  hero: { paddingTop: 110, alignItems: 'center' },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 4,
    color: colors.textMuted,
  },
  number: { color: colors.text, textAlign: 'center', marginTop: -6 },
  days: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    letterSpacing: 10,
    color: colors.text,
    marginTop: -10,
  },
  line: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.lg,
  },
  tray: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    padding: spacing.lg,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    gap: spacing.md,
  },
  plans: { flexDirection: 'row', gap: spacing.sm },
  plan: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  planName: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2, color: colors.textMuted },
  planPrice: { fontFamily: fonts.bodyBold, fontSize: 24, color: colors.textMuted, marginTop: 4 },
  save: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5, marginTop: 2 },
}) as const;
