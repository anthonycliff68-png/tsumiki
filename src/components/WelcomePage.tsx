import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { BrandMark } from '@/components/BrandHeader';
import { copy } from '@/copy';
import { darkPalette as c, display, fonts, spacing } from '@/theme';

const { height: H } = Dimensions.get('window');
const backdrop = require('../../assets/backdrop.jpg');
// Same photo as the paywall, so the first screen and the last one match.
const BD_H = H * 1.05;
const BD_W = (BD_H * 1400) / 930;

/** The mountain, shaded down to the ground so words can sit on it. */
export function PhotoBackdrop() {
  return (
    <>
      <Image source={backdrop} style={s.backdrop} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="wShade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.bg} stopOpacity="0.35" />
            <Stop offset="0.45" stopColor={c.bg} stopOpacity="0.55" />
            <Stop offset="0.75" stopColor={c.bg} stopOpacity="0.85" />
            <Stop offset="1" stopColor={c.bg} stopOpacity="0.97" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#wShade)" />
      </Svg>
    </>
  );
}

/**
 * The first thing anyone sees: the logo, one line about the app, and the two
 * ways in. It sits on a photograph, so it keeps the dark palette whatever the
 * app is set to.
 */
export function WelcomePage({ onStart }: { onStart: (firstTime: boolean) => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <PhotoBackdrop />

      <View style={[s.page, { paddingTop: insets.top + spacing.lg, paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
        <BrandMark large />

        <View style={s.middle}>
          <Text style={[display(44, 44), s.title]}>{copy.onboarding.welcome.title}</Text>
          <Text style={s.blurb}>{copy.onboarding.welcome.blurb}</Text>
        </View>

        <View style={s.actions}>
          <Pressable accessibilityRole="button" onPress={() => onStart(true)} style={({ pressed }) => [s.cta, pressed && s.dim]}>
            <Text style={s.ctaLabel}>{copy.onboarding.welcome.start}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => onStart(false)} hitSlop={8} style={({ pressed }) => [s.link, pressed && s.dim]}>
            <Text style={s.accountLabel}>{copy.onboarding.welcome.haveAccount}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, overflow: 'hidden' },
  backdrop: { position: 'absolute', top: 0, height: BD_H, width: BD_W, left: -BD_W * 0.28 },
  page: { flex: 1, paddingHorizontal: spacing.xl },
  middle: { flex: 1, justifyContent: 'center', gap: spacing.md },
  actions: { gap: spacing.sm },
  title: { color: c.text, textAlign: 'center' },
  blurb: { fontFamily: fonts.body, fontSize: 17, lineHeight: 24, color: c.textMuted, textAlign: 'center' },
  cta: { minHeight: 58, borderRadius: 999, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' },
  ctaLabel: { fontFamily: fonts.bodyBold, fontSize: 17, color: c.bg },
  link: { alignSelf: 'center', paddingVertical: spacing.sm },
  accountLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: c.text },
  dim: { opacity: 0.75 },
});
