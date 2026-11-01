import { router } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Image, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { copy } from '@/copy';
import { darkPalette as c, display, fonts, spacing } from '@/theme';

const { height: H } = Dimensions.get('window');
const backdrop = require('../../assets/backdrop.jpg');
// Same photo as the paywall, so the first screen and the last one match.
const BD_H = H * 1.05;
const BD_W = (BD_H * 1400) / 930;

/** "https://…/j/AB12CD", "/j/AB12CD" or just "AB12CD" → "AB12CD". */
const codeFrom = (text: string) => text.trim().split('/').filter(Boolean).pop() ?? '';

/**
 * The first thing anyone sees: one line about the app and one button. It sits
 * on a photograph, so it keeps the dark palette whatever the app is set to.
 */
export function WelcomePage({ onStart }: { onStart: () => void }) {
  const insets = useSafeAreaInsets();
  const [inviting, setInviting] = useState(false);
  const [link, setLink] = useState('');

  const openInvite = () => {
    const code = codeFrom(link);
    if (code) router.push({ pathname: '/j/[code]', params: { code } });
  };

  return (
    <View style={s.root}>
      <Image source={backdrop} style={s.backdrop} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="wShade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.bg} stopOpacity="0.05" />
            <Stop offset="0.45" stopColor={c.bg} stopOpacity="0.35" />
            <Stop offset="0.75" stopColor={c.bg} stopOpacity="0.85" />
            <Stop offset="1" stopColor={c.bg} stopOpacity="0.97" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#wShade)" />
      </Svg>

      <KeyboardAvoidingView behavior="padding" style={[s.body, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
        <Text style={[display(56, 52), s.title]}>{copy.onboarding.welcome.title}</Text>
        <Text style={s.blurb}>{copy.onboarding.welcome.blurb}</Text>

        <Pressable accessibilityRole="button" onPress={onStart} style={({ pressed }) => [s.cta, pressed && s.dim]}>
          <Text style={s.ctaLabel}>{copy.onboarding.welcome.start}</Text>
        </Pressable>

        {inviting ? (
          <View style={s.inviteRow}>
            <TextInput
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              value={link}
              onChangeText={setLink}
              onSubmitEditing={openInvite}
              returnKeyType="go"
              placeholder={copy.onboarding.welcome.invitePlaceholder}
              placeholderTextColor={c.textFaint}
              style={s.input}
            />
            <Pressable accessibilityRole="button" onPress={openInvite} hitSlop={8} style={({ pressed }) => pressed && s.dim}>
              <Text style={s.go}>{copy.onboarding.welcome.inviteGo}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setInviting(true)} hitSlop={8} style={({ pressed }) => [s.link, pressed && s.dim]}>
            <Text style={s.linkLabel}>{copy.onboarding.welcome.invite}</Text>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, overflow: 'hidden' },
  backdrop: { position: 'absolute', top: 0, height: BD_H, width: BD_W, left: -BD_W * 0.28 },
  body: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.xl, gap: spacing.md },
  title: { color: c.text },
  blurb: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: c.textMuted, marginBottom: spacing.sm },
  cta: { minHeight: 58, borderRadius: 999, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' },
  ctaLabel: { fontFamily: fonts.bodyBold, fontSize: 17, color: c.bg },
  link: { alignSelf: 'center', paddingVertical: spacing.sm },
  linkLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: c.textMuted },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    color: c.text,
    fontFamily: fonts.body,
    fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  go: { fontFamily: fonts.bodyBold, fontSize: 15, color: c.text },
  dim: { opacity: 0.75 },
});
