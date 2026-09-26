import { Pressable, Text, View } from 'react-native';

import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import type { Advice, Verdict, WeekAdvice } from '@/lib/advice';
import { alpha, display, fonts, radii, spacing, type Palette } from '@/theme';

export type AdviceTab = 'needs-work' | 'going-well';

/**
 * The two lists live behind their own tabs and the screen always opens on
 * "needs work", so the first thing you see is the habit to do something
 * about. Each row carries one suggestion, never a pile of them.
 */
export function AdviceList({
  tab,
  onTab,
  needsWork,
  goingWell,
  onOpen,
  windowDays,
}: {
  tab: AdviceTab;
  onTab: (tab: AdviceTab) => void;
  needsWork: Verdict[];
  goingWell: Verdict[];
  onOpen: (habitId: string) => void;
  windowDays: number;
}) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const shown = tab === 'needs-work' ? needsWork : goingWell;

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        <Tab
          label={copy.stats.needsWork}
          count={needsWork.length}
          active={tab === 'needs-work'}
          onPress={() => onTab('needs-work')}
        />
        <Tab
          label={copy.stats.goingWell}
          count={goingWell.length}
          active={tab === 'going-well'}
          onPress={() => onTab('going-well')}
        />
      </View>

      <Text style={styles.basis}>{copy.stats.basedOn(windowDays)}</Text>

      {shown.length === 0 ? (
        <Text style={styles.empty}>
          {tab === 'needs-work' ? copy.stats.nothingToFix : copy.stats.nothingGoingYet}
        </Text>
      ) : (
        shown.map((verdict) => (
          <Pressable
            key={verdict.habitId}
            accessibilityRole="button"
            accessibilityLabel={copy.stats.openHabit(verdict.name)}
            onPress={() => onOpen(verdict.habitId)}
            style={({ pressed }) => [
              styles.card,
              { borderColor: alpha(verdict.color, 0.55), backgroundColor: alpha(verdict.color, 0.1) },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.cardHead}>
              <Text style={[display(20, 20), styles.cardName]} numberOfLines={1}>
                {verdict.name}
              </Text>
              <Text style={[styles.cardRate, { color: verdict.color }]}>
                {Math.round(verdict.rate * 100)}%
              </Text>
            </View>

            <View style={styles.bar}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.round(verdict.rate * 100)}%`, backgroundColor: verdict.color },
                ]}
              />
            </View>

            <Text style={styles.cardSub}>{copy.stats.doneOfDue(verdict.done, verdict.due)}</Text>

            {verdict.advice !== null && (
              <View style={[styles.suggestion, { borderColor: alpha(verdict.color, 0.4) }]}>
                <Text style={[styles.suggestionText, { color: colors.text }]}>
                  {adviceText(verdict.advice)}
                </Text>
              </View>
            )}
          </Pressable>
        ))
      )}
    </View>
  );
}

function Tab({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}, ${count}`}
      onPress={onPress}
      style={[styles.tab, active && styles.tabOn]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelOn]}>{label}</Text>
      <View style={[styles.badge, active && styles.badgeOn]}>
        <Text style={[styles.badgeText, active && styles.badgeTextOn]}>{count}</Text>
      </View>
    </Pressable>
  );
}

const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

function adviceText(advice: Advice): string {
  if (advice.kind === 'stack') return copy.stats.advice.stack;
  if (advice.kind === 'drop-day') {
    return copy.stats.advice.dropDay(WEEKDAYS[advice.weekday] ?? 'that day');
  }
  if (advice.kind === 'lighten') {
    return copy.stats.advice.lighten(advice.anchorLabel, advice.load);
  }
  if (advice.kind === 'ease-off') return copy.stats.advice.easeOff(advice.from, advice.to);
  if (advice.kind === 'let-go') return copy.stats.advice.letGo;
  return copy.stats.advice.run(advice.days);
}

/**
 * The week's own suggestion, above the per-habit lists.
 *
 * It sits outside the tabs because it is not about a habit: a crowded Monday
 * or a week with no gap in it belongs to the schedule, and filing it under
 * one habit would be picking a scapegoat.
 */
export function WeekAdviceBanner({ advice }: { advice: WeekAdvice | null }) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  if (advice === null) return null;
  return (
    <View style={[styles.weekBanner, { borderColor: alpha(colors.text, 0.22) }]}>
      <Text style={styles.weekLabel}>{copy.stats.weekAdvice.label}</Text>
      <Text style={styles.weekText}>{weekAdviceText(advice)}</Text>
    </View>
  );
}

/** The one thing worth saying about the whole week, or nothing. */
export function weekAdviceText(advice: WeekAdvice): string {
  if (advice.kind === 'crowded-day') {
    return copy.stats.weekAdvice.crowdedDay(WEEKDAYS[advice.weekday] ?? 'That day', advice.due);
  }
  return copy.stats.weekAdvice.restDay;
}

const makeStyles = (colors: Palette) => ({
  root: { marginTop: spacing.xl },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  tabOn: { backgroundColor: colors.text, borderColor: 'transparent' },
  tabLabel: { fontFamily: fonts.body, fontSize: 13, fontWeight: '700', color: colors.textMuted },
  tabLabelOn: { color: colors.bg },
  badge: {
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.chip,
    backgroundColor: alpha(colors.overlay, 0.1),
    alignItems: 'center',
  },
  badgeOn: { backgroundColor: alpha(colors.bg, 0.14) },
  badgeText: { fontFamily: fonts.body, fontSize: 11, fontWeight: '700', color: colors.textMuted },
  badgeTextOn: { color: colors.bg },

  basis: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textFaint,
    marginTop: spacing.md,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.lg,
    lineHeight: 20,
  },

  card: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  pressed: { opacity: 0.7 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardName: { flex: 1, color: colors.text },
  cardRate: { fontFamily: fonts.body, fontSize: 15, fontWeight: '700' },
  bar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: alpha(colors.overlay, 0.1),
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  cardSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  suggestion: {
    borderTopWidth: 1,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  suggestionText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, fontWeight: '500' },

  weekBanner: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.lg,
    marginTop: spacing.xl,
    gap: 4,
  },
  weekLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  weekText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
}) as const;
