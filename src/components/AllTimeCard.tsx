import { Text, View } from 'react-native';

import { ProgressRing } from '@/components/ProgressRing';
import { copy } from '@/copy';
import { useStyles, useTheme } from '@/lib/appearance';
import type { AllTime } from '@/lib/stats';
import { alpha, display, fonts, radii, spacing, type Palette } from '@/theme';

/**
 * The whole record, at the top of Progress.
 *
 * One number large enough to be the answer to "how am I doing", and three
 * small ones under it that say what it is made of. The ring is the share of
 * times a habit was due that it actually got done, all time — not a rolling
 * window, so it moves slowly and cannot be rescued or ruined by one week.
 *
 * "Habits done" counts every check-in there has ever been, which is a larger
 * number with a different denominator: a check-in on a day nothing was
 * scheduled still happened, it just was not owed. The labels carry that
 * difference because the figures cannot.
 */
export function AllTimeCard({ stats, color }: { stats: AllTime; color: string }) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const percent = stats.rate === null ? null : Math.round(stats.rate * 100);

  return (
    <View style={styles.card}>
      <View style={styles.ringWrap}>
        <ProgressRing
          size={168}
          strokeWidth={14}
          progress={stats.rate ?? 0}
          color={color}
          trackColor={alpha(colors.text, 0.1)}
        />
        <View style={styles.ringCentre} pointerEvents="none">
          <Text style={styles.percent}>{percent === null ? '—' : `${percent}%`}</Text>
        </View>
      </View>

      <Text style={styles.title}>{copy.stats.allTimeTitle}</Text>
      <Text style={styles.caption}>
        {percent === null ? copy.stats.allTimeEmpty : copy.stats.allTimeOf(stats.timesDue)}
      </Text>

      <View style={styles.figures}>
        <Figure value={stats.checkins} label={copy.stats.allTimeDone} />
        <Figure value={stats.perfectDays} label={copy.stats.allTimePerfect} />
        <Figure value={stats.daysTracked} label={copy.stats.allTimeTracked} />
      </View>
    </View>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.figure}>
      <Text style={styles.figureValue}>{value}</Text>
      <Text style={styles.figureLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  card: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radii.bigCard,
    backgroundColor: alpha(colors.text, 0.04),
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  ringWrap: { width: 168, height: 168, alignItems: 'center', justifyContent: 'center' },
  ringCentre: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  percent: {
    ...display(46, 44),
    color: colors.text,
  },
  title: {
    fontFamily: fonts.body,
    fontWeight: '700',
    fontSize: 17,
    color: colors.text,
    marginTop: spacing.sm,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textFaint,
    textAlign: 'center',
  },
  figures: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  figure: { flex: 1, alignItems: 'center', gap: 2 },
  figureValue: { ...display(28, 28), color: colors.text },
  figureLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
  },
}) as const;
