import { useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { TextButton } from '@/components/Button';
import { useStyles, useTheme } from '@/lib/appearance';
import { alpha, display, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

const { width: W } = Dimensions.get('window');

/**
 * The collage is the app's own content: habit cards, tilted, the way the
 * reference uses its generated images.
 *
 * The cards carry no names. They started with them, and it read as a bug —
 * the cards overlap each other and run off the edges, so half the words came
 * out chopped ("10 MIN STRETCH" as "MIN TCH"). A cropped photograph still
 * reads as a photograph; a cropped word just looks broken. The colours alone
 * say "these are habits" and the wordmark is what the eye is meant to land on.
 */
const CARDS = [
  { n: '10 MIN\nSTRETCH', c: habitColors[1], x: -0.34, y: 18, r: '-14deg' },
  { n: 'INBOX\nZERO', c: habitColors[0], x: 0.36, y: -14, r: '11deg' },
  { n: 'YOGURT\nBOWL', c: habitColors[4], x: -0.08, y: 92, r: '4deg' },
  { n: 'WALK AT\nLUNCH', c: habitColors[2], x: 0.62, y: 118, r: '-8deg' },
  { n: 'READ 10\nPAGES', c: habitColors[3], x: -0.52, y: 160, r: '9deg' },
  { n: 'WATER\nPLANTS', c: habitColors[5], x: 0.14, y: 186, r: '6deg' },
];

const FEATURES = [
  { c: habitColors[1], t: 'Unlimited habits and crews', s: 'Stack as many as your day can hold, with up to five friends on each' },
  { c: habitColors[0], t: 'Nudges and shared streaks', s: 'The part that makes people actually turn up, kept alive' },
];

/** D — THE COLLAGE. The reference style, built from Tsumiki's own cards. */
export default function PaywallD() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual');

  return (
    <View style={styles.root}>
      <View style={styles.collage} pointerEvents="none">
        {CARDS.map((c) => {
          const left = W * 0.5 + W * c.x;
          return (
            <View
              key={c.n}
              style={[
                styles.card,
                { backgroundColor: c.c, left, top: c.y, transform: [{ rotate: c.r }] },
              ]}
            >
            </View>
          );
        })}
      </View>

      <Svg width={W} height={320} style={styles.fade}>
        <Defs>
          <LinearGradient id="f" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.bg} stopOpacity="0" />
            <Stop offset="0.38" stopColor={colors.bg} stopOpacity="0.88" />
            <Stop offset="1" stopColor={colors.bg} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={320} fill="url(#f)" />
      </Svg>

      <View style={styles.body}>
        <Text style={[display(72, 62), styles.word]}>TSUMIKI</Text>
        <Text style={styles.sub}>Everything, for everyone you do it with.</Text>

        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: habitColors[1] }]}>
            {plan === 'annual' ? '$29.99' : '$3.99'}
          </Text>
          <Text style={styles.per}>{plan === 'annual' ? '/ year' : '/ month'}</Text>
        </View>

        {FEATURES.map((f) => (
          <View key={f.t} style={styles.feature}>
            <View style={[styles.chip, { backgroundColor: f.c }]} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.t}</Text>
              <Text style={styles.featureSub}>{f.s}</Text>
            </View>
          </View>
        ))}

        <Pressable accessibilityRole="button" accessibilityLabel="Subscribe" style={styles.cta}>
          <Svg width="100%" height={62} style={styles.ctaFill}>
            <Defs>
              <LinearGradient id="g" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={habitColors[5]} />
                <Stop offset="0.5" stopColor={habitColors[1]} />
                <Stop offset="1" stopColor={habitColors[4]} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="62" rx="31" fill="url(#g)" />
          </Svg>
          <Text style={styles.ctaLabel}>SUBSCRIBE</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={plan === 'annual' ? 'See monthly plan' : 'See annual plan'}
          onPress={() => setPlan(plan === 'annual' ? 'monthly' : 'annual')}
          style={styles.secondary}
        >
          <Text style={styles.secondaryLabel}>SEE ALL PLANS</Text>
        </Pressable>

        <TextButton label="Restore purchases" onPress={() => {}} />
        <Text style={styles.terms}>Auto-renews. Cancel any time in Settings.</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  collage: { position: 'absolute', top: 0, left: 0, right: 0, height: 400 },
  card: {
    position: 'absolute',
    width: 150,
    height: 190,
    borderRadius: 20,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  cardName: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: -0.6,
    color: '#FFFFFF',
  },
  fade: { position: 'absolute', top: 60, left: 0 },
  body: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: 300, gap: spacing.md },
  word: { color: colors.text, textAlign: 'center' },
  sub: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: -4,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 },
  price: { fontFamily: fonts.bodyBold, fontSize: 40 },
  per: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.text },
  feature: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', marginTop: spacing.sm },
  chip: { width: 12, height: 12, borderRadius: 3, marginTop: 5 },
  featureText: { flex: 1 },
  featureTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  featureSub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textMuted, marginTop: 2 },
  cta: { height: 62, justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  ctaFill: { position: 'absolute', top: 0, left: 0 },
  ctaLabel: { fontFamily: fonts.bodyBold, fontSize: 17, letterSpacing: 1.4, color: '#FFFFFF' },
  secondary: {
    height: 58,
    borderRadius: radii.chip,
    borderWidth: 1.5,
    borderColor: alpha(habitColors[5], 0.75),
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontFamily: fonts.bodyBold, fontSize: 15, letterSpacing: 1.2, color: colors.text },
  terms: { fontFamily: fonts.body, fontSize: 11, color: colors.textFaint, textAlign: 'center' },
}) as const;
