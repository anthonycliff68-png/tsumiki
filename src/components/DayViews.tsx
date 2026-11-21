// My Day's month pull-down.
//
// Habits only for now. Calendar events join these once the calendar is
// connected (read-only, expo-calendar) — see docs/redesign-plan.md.
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { HabitInput } from '@/lib/stats';
import { isDue } from '@/lib/stats';
import { useStyles, useTheme } from '@/lib/appearance';
import { addDays, localDateString } from '@/lib/dates';
import { alpha, fonts, type Palette } from '@/theme';

/** Done over due for one day, across every habit, from the history. */
export function rateOn(history: readonly HabitInput[], date: Date, today: string): number | null {
  const key = localDateString(date);
  if (key > today) return null;
  const due = history.filter((h) => isDue(h, key, today));
  if (due.length === 0) return null;
  return due.filter((h) => h.checkedOn.includes(key)).length / due.length;
}

function DayRing({ rate, size, color, track }: { rate: number | null; size: number; color: string; track: string }) {
  const r = size / 2 - 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={3} fill="none" />
      {rate !== null && rate > 0 && (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * rate} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </Svg>
  );
}

/** The month as a grid, a ring per day for its habits. Tapping a day opens it. */
export function MonthGrid({
  month,
  today,
  shown,
  history,
  onPick,
}: {
  month: Date;
  today: Date;
  /** The day My Day is showing: its cell is the shaded one. Today keeps the bold number. */
  shown: Date;
  history: readonly HabitInput[];
  onPick: (d: Date) => void;
}) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const todayKey = localDateString(today);
  const shownKey = localDateString(shown);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const rows = cells[35] && cells[35].getMonth() !== month.getMonth() ? 5 : 6;

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.monthCard}>
        <View style={styles.monthHead}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((l, i) => (
            <Text key={i} style={styles.monthDow}>
              {l}
            </Text>
          ))}
        </View>
        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={styles.monthRow}>
            {cells.slice(r * 7, r * 7 + 7).map((d) => {
              const key = localDateString(d);
              const inMonth = d.getMonth() === month.getMonth();
              const isToday = key === todayKey;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={d.toDateString()}
                  onPress={() => onPick(d)}
                  style={[styles.cell, key === shownKey && styles.cellOn]}
                >
                  <View style={styles.cellRing}>
                    <DayRing
                      rate={inMonth ? rateOn(history, d, todayKey) : null}
                      size={34}
                      color={colors.success}
                      track={inMonth ? alpha(colors.overlay, 0.08) : 'transparent'}
                    />
                    <Text
                      style={[
                        styles.cellNum,
                        !inMonth && { color: alpha(colors.text, 0.25) },
                        isToday && { fontFamily: fonts.bodyBold },
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legendItem}>
        <View style={[styles.legendRing, { borderColor: colors.success }]} />
        <Text style={styles.legendText}>Habits done that day</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  monthCard: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardEdge,
    gap: 2,
  },
  monthHead: { flexDirection: 'row', paddingBottom: 6 },
  monthDow: { flex: 1, textAlign: 'center', fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textFaint },
  monthRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: 12 },
  cellOn: { backgroundColor: colors.raised },
  cellRing: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  cellNum: { position: 'absolute', fontFamily: fonts.body, fontSize: 13, color: colors.text },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  legendRing: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  legendText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
}) as const;
