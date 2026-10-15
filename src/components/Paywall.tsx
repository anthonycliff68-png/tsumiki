import { useState } from 'react';
import { Dimensions, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

import { CardCollage } from '@/components/CardCollage';
import { TextButton } from '@/components/Button';
import { APP_NAME, PRIVACY_URL, TERMS_URL } from '@/constants/brand';
import { copy } from '@/copy';
import type { TrialOffer } from '@/lib/trialOffer';
import { useStyles } from '@/lib/appearance';
import { type Access } from '@/lib/entitlement';
import { alpha, display, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

const { width: W } = Dimensions.get('window');

export type Plan = 'annual' | 'monthly';

type Props = {
  access: Access;
  /** The live offering. Null in Expo Go, or if the store cannot be reached. */
  offering: PurchasesOffering | null | undefined;
  busy: boolean;
  error: string | null;
  onSubscribe: (pkg: PurchasesPackage | null, plan: Plan) => void;
  onRestore: () => void;
  onDeleteAccount: () => void;
  /**
   * Shown when the paywall is an offer rather than a wall: after sign-up, and
   * on a reinstall. Absent when somebody's week is actually up, because then
   * there is nothing to dismiss to.
   */
  onDismiss?: () => void;
  /** What the way out says. The offer and the screen you opened differ. */
  dismissLabel?: string;
  /**
   * The trial this Apple ID would actually get, from StoreKit. Null means they
   * are charged straight away — because they have used their one offer, or
   * because none is configured. Never assumed: see lib/trialOffer.ts.
   */
  trial?: TrialOffer | null;
};

/**
 * The paywall.
 *
 * Prices come from the store, not from copy.ts. A hardcoded "$29.99" is wrong
 * the moment App Store Connect changes, wrong in every country that is not
 * the United States, and wrong in a way nobody notices until a refund
 * request. The strings in copy are only a fallback for when the SDK is
 * absent — Expo Go, or a store that cannot be reached.
 *
 * "Delete my account" stays on this screen. Apple requires the path to remain
 * reachable, and a paywall that traps someone who wants to leave would be
 * indefensible even if Apple did not care.
 */
export function Paywall({
  access,
  offering,
  busy,
  error,
  onSubscribe,
  onRestore,
  onDeleteAccount,
  onDismiss,
  dismissLabel,
  trial,
}: Props) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<Plan>('annual');

  const annual = offering?.annual ?? null;
  const monthly = offering?.monthly ?? null;
  const chosen = plan === 'annual' ? annual : monthly;

  const price =
    chosen?.product.priceString ??
    (plan === 'annual' ? copy.paywall.annualPrice : copy.paywall.monthlyPrice);
  const per = plan === 'annual' ? copy.paywall.perYear : copy.paywall.perMonth;

  // The button says what will happen. "Start free trial" to somebody who is
  // about to be charged $29.99 is the single worst thing this screen could do,
  // so the words come from StoreKit's answer and never from a constant.
  const cta = trial ? copy.paywall.startTrial(trial.days) : copy.paywall.subscribe;

  return (
    <View style={styles.root}>
      {/* The collage is absolutely placed at the top of its parent, so it is
          nudged down here rather than by padding the root: left at zero its
          sheets of habit cards run under the clock and the battery. */}
      <View style={[styles.collageHolder, { top: insets.top }]} pointerEvents="none">
        <CardCollage height={400} fadeFrom={60} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingTop: 300 + insets.top, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[display(72, 62), styles.word]}>{APP_NAME.toUpperCase()}</Text>
        <Text style={styles.sub}>
          {access.state === 'locked' ? copy.paywall.overTitle : copy.paywall.browsingTitle}
        </Text>

        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: habitColors[1] }]}>{price}</Text>
          <Text style={styles.per}>{per}</Text>
        </View>

        {copy.paywall.features.map((f, i) => (
          <View key={f.title} style={styles.feature}>
            <View style={[styles.chip, { backgroundColor: habitColors[i === 0 ? 1 : 0] }]} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureSub}>{f.sub}</Text>
            </View>
          </View>
        ))}

        {error !== null && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${cta}, ${price} ${per}`}
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          onPress={() => onSubscribe(chosen, plan)}
          style={({ pressed }) => [styles.cta, (pressed || busy) && styles.ctaDim]}
        >
          <Svg width="100%" height={62} style={styles.ctaFill}>
            <Defs>
              <LinearGradient id="ctaGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={habitColors[5]} />
                <Stop offset="0.5" stopColor={habitColors[1]} />
                <Stop offset="1" stopColor={habitColors[4]} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="62" rx="31" fill="url(#ctaGrad)" />
          </Svg>
          <Text style={styles.ctaLabel}>{busy ? copy.paywall.subscribing : cta}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: plan === 'monthly' }}
          accessibilityLabel={plan === 'annual' ? copy.paywall.seeMonthly : copy.paywall.seeAnnual}
          onPress={() => setPlan(plan === 'annual' ? 'monthly' : 'annual')}
          style={styles.secondary}
        >
          <Text style={styles.secondaryLabel}>
            {plan === 'annual' ? copy.paywall.seeMonthly : copy.paywall.seeAnnual}
          </Text>
        </Pressable>

        {onDismiss && (
          <TextButton
            label={dismissLabel ?? copy.paywall.back}
            onPress={onDismiss}
            disabled={busy}
          />
        )}
        <TextButton label={copy.paywall.restore} onPress={onRestore} disabled={busy} />
        {/* Apple requires the length, the price that follows and the renewal
            stated together, before the purchase. Built from the same two facts
            the button is built from, so they cannot drift apart. */}
        <Text style={styles.terms}>
          {trial ? copy.paywall.trialTerms(trial.days, price, per) : copy.paywall.terms}
        </Text>
        <View style={styles.legal}>
          <TextButton
            label={copy.paywall.termsLink}
            onPress={() => void Linking.openURL(TERMS_URL)}
          />
          <Text style={styles.terms}>·</Text>
          <TextButton
            label={copy.paywall.privacyLink}
            onPress={() => void Linking.openURL(PRIVACY_URL)}
          />
        </View>
        {/* Apple requires this to stay reachable, paywall or not. */}
        <TextButton label={copy.paywall.deleteAccount} onPress={onDeleteAccount} disabled={busy} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  // Out of the flow entirely, so the scroll view below starts at the top of
  // the screen and the collage can be nudged clear of the clock on its own.
  collageHolder: { position: 'absolute', left: 0, right: 0 },
  // Scrolls because it has to. Terms of Use and Privacy Policy sit at the
  // bottom and Apple requires both to be reachable; on a short screen they
  // were simply cut off, which is a rejection waiting to happen.
  scroll: { flex: 1 },
  body: { paddingHorizontal: spacing.xl, gap: spacing.md },
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
  ctaDim: { opacity: 0.7 },
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
  legal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  terms: { fontFamily: fonts.body, fontSize: 11, lineHeight: 17, color: colors.textFaint, textAlign: 'center' },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: habitColors[1], textAlign: 'center' },
}) as const;
