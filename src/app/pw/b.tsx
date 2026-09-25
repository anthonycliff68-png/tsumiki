import { BlurView } from 'expo-blur';
import { useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { PrimaryButton, TextButton } from '@/components/Button';
import { useStyles, useTheme } from '@/lib/appearance';
import { alpha, display, fonts, habitColors, spacing, type Palette } from '@/theme';

const { width: W, height: H } = Dimensions.get('window');

const BLOBS = [
  { c: habitColors[0], x: 0.18, y: 0.14, r: 0.72 },
  { c: habitColors[5], x: 0.88, y: 0.30, r: 0.62 },
  { c: habitColors[2], x: 0.52, y: 0.62, r: 0.70 },
];

/** B — AURORA. Layered colour, frosted glass, everything glowing. */
export default function PaywallB() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual');

  return (
    <View style={styles.root}>
      <Svg width={W} height={H} style={styles.sky}>
        <Defs>
          {BLOBS.map((b, i) => (
            <RadialGradient key={i} id={`b${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={b.c} stopOpacity="0.95" />
              <Stop offset="1" stopColor={b.c} stopOpacity="0" />
            </RadialGradient>
          ))}
        </Defs>
        {BLOBS.map((b, i) => (
          <Circle key={i} cx={W * b.x} cy={H * b.y} r={W * b.r} fill={`url(#b${i})`} />
        ))}
      </Svg>
      <BlurView intensity={70} tint="dark" style={styles.veil} />

      <View style={styles.body}>
        <Text style={styles.eyebrow}>SEVEN DAYS IN</Text>
        <Text style={[display(64, 56), styles.title]}>THE HABIT{'\n'}IS YOURS.{'\n'}KEEP IT.</Text>

        <View style={styles.stats}>
          <Stat n="17" l="check-ins" />
          <Stat n="6" l="day run" />
          <Stat n="3" l="habits" />
        </View>

        <View style={styles.plans}>
          {(['annual', 'monthly'] as const).map((p) => {
            const on = plan === p;
            return (
              <Pressable
                key={p}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={p === 'annual' ? 'Annual, $29.99' : 'Monthly, $3.99'}
                onPress={() => setPlan(p)}
                style={styles.planWrap}
              >
                <BlurView
                  intensity={on ? 55 : 22}
                  tint="light"
                  style={[styles.plan, on && styles.planOn]}
                >
                  <Text style={[styles.planName, on && styles.onText]}>
                    {p === 'annual' ? 'Annual' : 'Monthly'}
                  </Text>
                  <Text style={[styles.planPrice, on && styles.onText]}>
                    {p === 'annual' ? '$29.99' : '$3.99'}
                  </Text>
                  <Text style={styles.planAside}>
                    {p === 'annual' ? '$2.50 / mo · save 37%' : 'cancel anytime'}
                  </Text>
                </BlurView>
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton label="Continue" onPress={() => {}} />
        <TextButton label="Restore purchases" onPress={() => {}} />
      </View>
    </View>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text style={[display(34, 32), styles.statN]}>{n}</Text>
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  sky: { position: 'absolute', top: 0, left: 0 },
  veil: { ...({ position: 'absolute' } as const), top: 0, left: 0, right: 0, bottom: 0 },
  body: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: 96, gap: spacing.lg },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 3.4,
    color: colors.textMuted,
  },
  title: { color: colors.text },
  stats: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm },
  stat: {},
  statN: { color: colors.text },
  statL: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  plans: { flexDirection: 'row', gap: spacing.md, marginTop: 'auto' },
  planWrap: { flex: 1 },
  plan: {
    borderRadius: 22,
    padding: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: alpha(colors.overlay, 0.14),
    minHeight: 112,
    justifyContent: 'center',
  },
  planOn: { borderColor: colors.text, borderWidth: 2 },
  planName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
  planPrice: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.textMuted, marginTop: 2 },
  onText: { color: colors.text },
  planAside: { fontFamily: fonts.body, fontSize: 11, color: colors.textFaint, marginTop: 4 },
}) as const;
