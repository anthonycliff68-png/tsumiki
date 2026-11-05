import { BlurView } from 'expo-blur';
import { useState } from 'react';
import { Dimensions, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

import { BrandMark } from '@/components/BrandHeader';
import { ProCollage } from '@/components/ProCollage';
import { APP_NAME, PRIVACY_URL, TERMS_URL } from '@/constants/brand';
import { copy } from '@/copy';
import type { TrialOffer } from '@/lib/trialOffer';
import { type Access } from '@/lib/entitlement';
import { darkPalette as c, display, fonts, habitColors, spacing } from '@/theme';

const { width: W, height: H } = Dimensions.get('window');
const backdrop = require('../../assets/backdrop.jpg');
// The photo is 1400×930. Taller than the screen and pinned to the top, so the
// peak sits behind the title rather than being cropped off.
const BD_H = H * 1.18;
const BD_W = (BD_H * 1400) / 930;

export type Plan = 'annual' | 'monthly' | 'lifetime';
// Left to right in the bar. Yearly is still what the screen opens on.
const PLANS: Plan[] = ['monthly', 'annual', 'lifetime'];

type Props = {
  access: Access;
  /** The live offering. Null in Expo Go, or if the store cannot be reached. */
  offering: PurchasesOffering | null | undefined;
  busy: boolean;
  error: string | null;
  onSubscribe: (pkg: PurchasesPackage | null, plan: Plan) => void;
  onRestore: () => void;
  /** The ✕, and the line at the bottom. Free is always behind this screen. */
  onDismiss: () => void;
  /** What the line at the bottom says. The offer and the screen you opened differ. */
  dismissLabel: string;
  /** False where the labelled way out is the only one, so nothing skips it unnamed. */
  closable?: boolean;
  /**
   * The trial this Apple ID would actually get on each plan, from StoreKit. Null
   * means they are charged straight away — because they have used their one
   * offer, or because none is configured. Never assumed: see lib/trialOffer.ts.
   */
  trial?: { annual: TrialOffer | null; monthly: TrialOffer | null };
};

/**
 * The paywall: TSUMIKI PRO over the mountains, what Pro adds, one bar of
 * plans, one button.
 *
 * Prices come from the store, not from copy.ts. A hardcoded "$29.99" is wrong
 * the moment App Store Connect changes, wrong in every country that is not
 * the United States, and wrong in a way nobody notices until a refund
 * request. The strings in copy are only a fallback for when the SDK is
 * absent — Expo Go, or a store that cannot be reached.
 *
 * One look in both themes: it sits on a photograph, so its colours are the
 * dark palette's whatever the app is set to.
 *
 * "Delete my account" lives on You. It used to be here because this screen
 * could be a wall; nobody is locked out any more, so You is always reachable.
 */
export function Paywall({ access, offering, busy, error, onSubscribe, onRestore, onDismiss, dismissLabel, closable = true, trial }: Props) {
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<Plan>('annual');

  const packages = {
    annual: offering?.annual ?? null,
    monthly: offering?.monthly ?? null,
    lifetime: offering?.lifetime ?? null,
  };
  // Lifetime is offered once the store has it. In Expo Go every plan shows,
  // with the fallback prices, so the screen can still be looked at.
  const plans = PLANS.filter((p) => !offering || packages[p] !== null);
  const chosen = packages[plan];

  const fallback = {
    annual: [copy.paywall.annualPrice, copy.paywall.perYear],
    monthly: [copy.paywall.monthlyPrice, copy.paywall.perMonth],
    lifetime: [copy.paywall.lifetimePrice, copy.paywall.perLifetime],
  } as const;
  const priceOf = (p: Plan) => packages[p]?.product.priceString ?? fallback[p][0];
  const price = priceOf(plan);
  const per = fallback[plan][1];

  const sub = {
    monthly: copy.paywall.planSub.monthly,
    annual: copy.paywall.planSub.annual(packages.annual?.product.pricePerMonthString ?? copy.paywall.annualPerMonth),
    lifetime: copy.paywall.planSub.lifetime,
  };
  // What yearly saves against twelve months, from the store's own numbers.
  const m = packages.monthly?.product.price ?? 3.99;
  const y = packages.annual?.product.price ?? 29.99;
  const saving = Math.round((1 - y / (m * 12)) * 100);

  // The line under the button says what will happen. "Start 3 days free" to
  // somebody who is about to be charged $29.99 is the single worst thing this
  // screen could do, so the words come from StoreKit's answer and never from a
  // constant.
  const planTrial = plan === 'lifetime' ? null : (trial?.[plan] ?? null);
  const cta = copy.paywall.subscribe;

  return (
    <View style={s.root}>
      <Image source={backdrop} style={s.backdrop} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="pwShade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.bg} stopOpacity="0.1" />
            <Stop offset="0.28" stopColor={c.bg} stopOpacity="0.35" />
            <Stop offset="0.46" stopColor={c.bg} stopOpacity="0.6" />
            <Stop offset="0.7" stopColor={c.bg} stopOpacity="0.8" />
            <Stop offset="1" stopColor={c.bg} stopOpacity="0.92" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#pwShade)" />
      </Svg>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.body, { paddingTop: insets.top + 218 }]}
        showsVerticalScrollIndicator={false}
      >
        <ProCollage top={insets.top} />

        <View style={s.word}>
          <BrandMark markOnly />
          <Text style={[display(58, 54), s.text]}>{APP_NAME}</Text>
          <Text style={[display(27), s.text, s.proBadge]}>{copy.paywall.pro}</Text>
        </View>
        <Text style={s.sub}>{access.state === 'subscribed' ? copy.paywall.browsingTitle : copy.paywall.overTitle}</Text>

        <View style={s.feats}>
          {copy.paywall.includes.map((f) => (
            <View key={f.title} style={s.feat}>
              <Svg width={20} height={20} viewBox="0 0 20 20">
                <Path d="M4 10.5l4 4 8-9" fill="none" stroke={habitColors[1]} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={s.featText}>{f.title}</Text>
              {f.note !== '' && <Text style={s.featNote}>{f.note}</Text>}
            </View>
          ))}
        </View>

        <BlurView intensity={28} tint="dark" style={s.plans} accessibilityRole="radiogroup">
          {plans.map((p) => (
            <Pressable
              key={p}
              accessibilityRole="radio"
              accessibilityState={{ selected: plan === p }}
              accessibilityLabel={`${copy.paywall.planName[p]}, ${priceOf(p)}, ${sub[p]}`}
              onPress={() => setPlan(p)}
              style={[s.seg, plan === p && s.segOn]}
            >
              <View style={s.segHead}>
                <Text style={[s.segName, plan === p && s.text]}>{copy.paywall.planName[p]}</Text>
                {p === 'annual' && saving > 0 && <Text style={s.tag}>{copy.paywall.save(saving)}</Text>}
              </View>
              <Text style={[s.segPrice, plan === p && s.text]} numberOfLines={1} adjustsFontSizeToFit>
                {priceOf(p)}
              </Text>
              <Text style={s.segSub} numberOfLines={1}>{sub[p]}</Text>
            </Pressable>
          ))}
        </BlurView>

        {error !== null && (
          <Text style={s.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
      </ScrollView>

      {/* Fixed at the bottom, so the choice is on screen at any text size. */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom - 18, spacing.md) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${cta}, ${price} ${per}`}
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          onPress={() => onSubscribe(chosen, plan)}
          style={({ pressed }) => [s.cta, (pressed || busy) && s.dim]}
        >
          <Text style={s.ctaLabel}>{busy ? copy.paywall.subscribing : cta}</Text>
        </Pressable>

        {/* Apple requires the length, the price that follows and the renewal
            stated together, before the purchase. Built from the same two facts
            the button is built from, so they cannot drift apart. */}
        <Text style={s.terms}>
          {plan === 'lifetime'
            ? copy.paywall.lifetimeTerms
            : planTrial
              ? copy.paywall.trialTerms(planTrial.days, price, per)
              : copy.paywall.terms}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={onDismiss}
          disabled={busy}
          style={({ pressed }) => [s.dismiss, pressed && s.dim]}
        >
          <Text style={s.dismissLabel}>{dismissLabel}</Text>
        </Pressable>
        <View style={s.legal}>
          <Link label={copy.paywall.termsLink} onPress={() => void Linking.openURL(TERMS_URL)} />
          <Text style={s.faint}>·</Text>
          <Link label={copy.paywall.privacyLink} onPress={() => void Linking.openURL(PRIVACY_URL)} />
        </View>
      </View>

      {/* Fixed over the cards, so the way out never scrolls away. */}
      <View style={[s.top, { top: insets.top + spacing.sm }]}>
        {closable ? <Chip label="✕" accessibilityLabel={copy.paywall.close} onPress={onDismiss} disabled={busy} round /> : <View />}
        <Chip label={copy.paywall.restore} onPress={onRestore} disabled={busy} />
      </View>
    </View>
  );
}

function Chip({ label, accessibilityLabel, onPress, disabled, round }: { label: string; accessibilityLabel?: string; onPress: () => void; disabled: boolean; round?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} disabled={disabled}
      style={({ pressed }) => pressed && s.dim}>
      <BlurView intensity={30} tint="dark" style={[s.chip, round && s.chipRound]}>
        <Text style={s.chipText}>{label}</Text>
      </BlurView>
    </Pressable>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}
      style={({ pressed }) => [s.link, pressed && s.dim]}>
      <Text style={s.faint}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, overflow: 'hidden' },
  backdrop: { position: 'absolute', top: 0, height: BD_H, width: BD_W, left: (W - BD_W) * 0.56 },
  scroll: { flex: 1 },
  body: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  footer: { paddingHorizontal: spacing.xl },
  text: { color: c.text },
  word: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  proBadge: { letterSpacing: 0.5, borderWidth: 2.5, borderColor: c.text, borderRadius: 9, paddingHorizontal: 8, paddingTop: 4, paddingBottom: 2 },
  sub: { fontFamily: fonts.body, fontSize: 16, color: '#D9D4CB', textAlign: 'center', marginTop: 8, marginBottom: 12 },
  feats: { gap: 8, paddingHorizontal: 4 },
  feat: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 16, color: c.text },
  featNote: { fontFamily: fonts.body, fontSize: 12.5, color: '#8E887E' },
  plans: {
    flexDirection: 'row',
    gap: 4,
    padding: 5,
    marginTop: 14,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(28,28,31,0.45)',
  },
  seg: { flex: 1, borderRadius: 17, paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: 'transparent' },
  segOn: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' },
  segHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  segName: { fontFamily: fonts.bodyBold, fontSize: 13, color: c.textMuted },
  tag: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
    color: habitColors[1],
    backgroundColor: 'rgba(232,85,43,0.16)',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  segPrice: { fontFamily: fonts.bodyBold, fontSize: 21, marginTop: 6, color: c.textMuted, fontVariant: ['tabular-nums'] },
  segSub: { fontFamily: fonts.body, fontSize: 11, marginTop: 2, color: '#8E887E' },
  cta: { height: 56, marginTop: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: habitColors[5] },
  dim: { opacity: 0.7 },
  ctaLabel: { fontFamily: fonts.bodyBold, fontSize: 16.5, letterSpacing: 0.6, color: '#FFFFFF' },
  terms: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: c.textFaint, textAlign: 'center', marginTop: 9 },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: habitColors[1], textAlign: 'center', marginTop: 12 },
  link: { alignSelf: 'center', paddingVertical: 6 },
  dismiss: { height: 44, marginTop: 4, alignItems: 'center', justifyContent: 'center' },
  dismissLabel: { fontFamily: fonts.body, fontSize: 14, color: c.textMuted },
  faint: { fontFamily: fonts.body, fontSize: 11.5, color: '#6F6A63' },
  legal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 2 },
  top: { position: 'absolute', left: 22, right: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(11,11,12,0.55)',
  },
  chipRound: { width: 34, height: 34, paddingVertical: 0, paddingHorizontal: 0, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.text },
});
