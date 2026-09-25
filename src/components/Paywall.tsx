import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/Button';
import { Body, Eyebrow, Screen, Title } from '@/components/Screen';
import { copy } from '@/copy';
import { useStyles, useTheme } from '@/lib/appearance';
import type { Access } from '@/lib/entitlement';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

export type Plan = 'annual' | 'monthly';

type Props = {
  /** Why they are seeing this: locked out, or they came looking. */
  access: Access;
  /** Their own week, shown as a receipt. Null when we do not know yet. */
  checkIns: number | null;
  bestRun: number | null;
  busy: boolean;
  error: string | null;
  onSubscribe: (plan: Plan) => void;
  onRestore: () => void;
  onDeleteAccount: () => void;
};

/**
 * The paywall.
 *
 * It opens with what the week was actually worth — their own check-ins and
 * their own best run — because asking for money without reminding someone
 * what they got is how a paywall reads as a toll booth. The same numbers can
 * be written as a threat ("don't lose your streak"); they are deliberately
 * not, and the difference is entirely in the wording.
 *
 * It says plainly that nothing is deleted. The fear at a paywall in a habit
 * app is that the streak is gone, and that panic is what writes one-star
 * reviews — so it is answered before it is felt.
 *
 * And "Delete my account" stays on this screen. Apple requires the path to
 * remain reachable, and a paywall that traps someone who wants to leave would
 * be indefensible even if it did not.
 */
export function Paywall({
  access,
  checkIns,
  bestRun,
  busy,
  error,
  onSubscribe,
  onRestore,
  onDeleteAccount,
}: Props) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const [plan, setPlan] = useState<Plan>('annual');
  const locked = access.state === 'locked';

  return (
    <Screen color={habitColors[0]} underDock={false}>
      <View style={styles.head}>
        <Eyebrow>{locked ? copy.paywall.overEyebrow : copy.paywall.browsingEyebrow}</Eyebrow>
        <Title size={56}>{locked ? copy.paywall.overTitle : copy.paywall.browsingTitle}</Title>

        {access.state === 'trial' && <Body>{copy.paywall.trialLeft(access.daysLeft)}</Body>}

        {checkIns !== null && checkIns > 0 && (
          <Text style={styles.receipt}>
            {copy.paywall.done(checkIns)}
            {bestRun !== null && bestRun > 0 ? ` ${copy.paywall.run(bestRun)}` : ''}
          </Text>
        )}

        <Text style={styles.kept}>{copy.paywall.kept}</Text>
      </View>

      <View style={styles.list}>
        <Text style={styles.listTitle}>{copy.paywall.carriesOn}</Text>
        {copy.paywall.features.map((feature) => (
          <View key={feature} style={styles.row}>
            <View style={[styles.tick, { backgroundColor: colors.success }]} />
            <Text style={styles.rowText}>{feature}</Text>
          </View>
        ))}
      </View>

      <View style={styles.plans}>
        <PlanCard
          selected={plan === 'annual'}
          onPress={() => setPlan('annual')}
          name={copy.paywall.annual}
          price={copy.paywall.annualPrice}
          aside={copy.paywall.annualAside}
        />
        <PlanCard
          selected={plan === 'monthly'}
          onPress={() => setPlan('monthly')}
          name={copy.paywall.monthly}
          price={copy.paywall.monthlyPrice}
          aside={copy.paywall.monthlyAside}
        />
      </View>

      {error !== null && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}

      <PrimaryButton
        label={busy ? copy.paywall.subscribing : copy.paywall.subscribe}
        busy={busy}
        onPress={() => onSubscribe(plan)}
      />
      <TextButton label={copy.paywall.restore} onPress={onRestore} disabled={busy} />
      <Text style={styles.terms}>{copy.paywall.terms}</Text>

      {/* Apple requires this to stay reachable, paywall or not. */}
      <TextButton label={copy.paywall.deleteAccount} onPress={onDeleteAccount} disabled={busy} />
    </Screen>
  );
}

function PlanCard({
  selected,
  onPress,
  name,
  price,
  aside,
}: {
  selected: boolean;
  onPress: () => void;
  name: string;
  price: string;
  aside: string;
}) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name}, ${price}, ${aside}`}
      onPress={onPress}
      style={[styles.plan, selected && styles.planOn]}
    >
      <View style={styles.planText}>
        <Text style={[styles.planName, selected && styles.planNameOn]}>{name}</Text>
        <Text style={[styles.planAside, selected && styles.planAsideOn]}>{aside}</Text>
      </View>
      <Text style={[styles.planPrice, selected && styles.planNameOn]}>{price}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => ({
  head: { gap: spacing.md },
  receipt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  kept: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },

  list: { gap: spacing.sm, marginTop: spacing.lg },
  listTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textFaint,
    marginBottom: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tick: { width: 6, height: 6, borderRadius: 3 },
  rowText: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted },

  plans: { gap: spacing.sm, marginTop: spacing.lg },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planOn: { borderColor: colors.text, backgroundColor: alpha(colors.overlay, 0.06) },
  planText: { flex: 1 },
  planName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textMuted },
  planNameOn: { color: colors.text },
  planAside: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint, marginTop: 2 },
  planAsideOn: { color: colors.textMuted },
  planPrice: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },

  terms: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textFaint,
    textAlign: 'center',
  },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: habitColors[1] },
}) as const;
