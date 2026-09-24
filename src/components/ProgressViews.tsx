import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import type { HabitStats } from '@/lib/stats';
import { alpha, fonts, spacing, type Palette } from '@/theme';

/**
 * Each period gets the shape that suits it. A day is a set of rings, because
 * one day is a yes or a no and the useful number beside it is the run you are
 * either keeping or breaking. A week is a wall, seven marks a row, sorted so
 * the habit in trouble is the top line. A month is a trend, because over
 * thirty days the shape of the line says more than any single figure.
 */

const RING = 72;
const RING_WIDTH = 7;

export function RingGrid({
  habits,
}: {
  habits: { stats: HabitStats; run: number; recent: number | null }[];
}) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  return (
    <View style={styles.rings}>
      {habits.map(({ stats, run, recent }) => {
        const done = stats.done > 0;
        const radius = (RING - RING_WIDTH) / 2;
        const circumference = 2 * Math.PI * radius;
        const filled = recent === null ? 0 : circumference * recent;
        return (
          <View key={stats.habitId} style={styles.ring}>
            <View style={styles.ringArt}>
              <Svg width={RING} height={RING}>
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={radius}
                  stroke={alpha(colors.overlay, 0.1)}
                  strokeWidth={RING_WIDTH}
                  fill="none"
                />
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={radius}
                  stroke={stats.color}
                  strokeWidth={RING_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={`${filled} ${circumference}`}
                  fill="none"
                  transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
                />
              </Svg>
              <View style={styles.ringCore}>
                <Text style={[styles.ringMark, { color: done ? stats.color : colors.textFaint }]}>
                  {done ? '✓' : '—'}
                </Text>
              </View>
            </View>
            <Text style={styles.ringName} numberOfLines={2}>
              {stats.name}
            </Text>
            <Text style={styles.ringSub}>
              {recent === null ? copy.stats.notDueToday : copy.stats.lately(Math.round(recent * 100))}
            </Text>
            {run > 0 && <Text style={[styles.ringRun, { color: stats.color }]}>{copy.stats.runDays(run)}</Text>}
          </View>
        );
      })}
    </View>
  );
}

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function HeatWall({ habits }: { habits: { stats: HabitStats; cells: HeatCell[] }[] }) {
  const colors = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View>
      <View style={styles.wallHead}>
        <View style={styles.wallName} />
        <View style={styles.wallCells}>
          {LETTERS.map((letter, i) => (
            <Text key={`${letter}-${i}`} style={styles.wallLetter}>
              {letter}
            </Text>
          ))}
        </View>
        <View style={styles.wallRate} />
      </View>

      {habits.map(({ stats, cells }) => (
        <View key={stats.habitId} style={styles.wallRow}>
          <Text style={styles.wallName} numberOfLines={1}>
            {stats.name}
          </Text>
          <View style={styles.wallCells}>
            {cells.map((cell) => (
              <View key={cell.date} style={[styles.wallCell, heatStyle(cell.state, stats.color, colors)]} />
            ))}
          </View>
          <Text
            style={[
              styles.wallRate,
              { color: stats.rate !== null && stats.rate < 0.8 ? stats.color : colors.textFaint },
            ]}
          >
            {stats.rate === null ? '—' : `${Math.round(stats.rate * 100)}%`}
          </Text>
        </View>
      ))}
    </View>
  );
}

export type HeatCell = { date: string; state: 'done' | 'missed' | 'not-due' | 'future' };

function heatStyle(state: HeatCell['state'], color: string, colors: Palette) {
  if (state === 'done') return { backgroundColor: color };
  if (state === 'missed') {
    return { backgroundColor: alpha(color, 0.18), borderWidth: 1, borderColor: alpha(color, 0.9) };
  }
  if (state === 'future') {
    return { borderWidth: 1, borderStyle: 'dashed' as const, borderColor: alpha(colors.overlay, 0.16) };
  }
  return { backgroundColor: alpha(colors.overlay, 0.04) };
}

const TREND_HEIGHT = 120;

export function TrendBars({
  days,
  color,
  from,
  to,
}: {
  days: { date: string; rate: number | null }[];
  color: string;
  from: string;
  to: string;
}) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  return (
    <View>
      <View style={styles.trend}>
        {/* Half and full marks, so a bar's height means something. */}
        <View style={[styles.trendRule, { bottom: TREND_HEIGHT }]} />
        <View style={[styles.trendRule, { bottom: TREND_HEIGHT / 2 }]} />
        {days.map((day) => (
          <View key={day.date} style={styles.trendSlot}>
            <View
              style={[
                styles.trendBar,
                {
                  height: day.rate === null ? 2 : Math.max(3, day.rate * TREND_HEIGHT),
                  backgroundColor: day.rate === null ? alpha(colors.overlay, 0.08) : color,
                  opacity: day.rate === null ? 1 : 0.35 + day.rate * 0.65,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.trendAxis}>
        <Text style={styles.trendTick}>{from}</Text>
        <Text style={styles.trendTick}>{copy.stats.everythingDone}</Text>
        <Text style={styles.trendTick}>{to}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  rings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.lg,
  },
  ring: { width: '31%', alignItems: 'center' },
  ringArt: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringCore: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringMark: { fontFamily: fonts.body, fontSize: 20, fontWeight: '700' },
  ringName: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  ringSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: 2,
  },
  ringRun: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },

  wallHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  wallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: alpha(colors.overlay, 0.06),
  },
  wallName: {
    width: 104,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  wallCells: { flex: 1, flexDirection: 'row', gap: 4, paddingHorizontal: spacing.sm },
  wallCell: { flex: 1, height: 20, borderRadius: 4 },
  wallLetter: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textFaint,
    textAlign: 'center',
  },
  wallRate: { width: 38, textAlign: 'right', fontFamily: fonts.body, fontSize: 12, fontWeight: '700' },

  trend: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: TREND_HEIGHT,
    gap: 3,
    position: 'relative',
  },
  trendRule: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: alpha(colors.overlay, 0.1),
  },
  trendSlot: { flex: 1, justifyContent: 'flex-end' },
  trendBar: { borderTopLeftRadius: 3, borderTopRightRadius: 3, width: '100%' },
  trendAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  trendTick: { fontFamily: fonts.body, fontSize: 10, color: colors.textFaint },
}) as const;
