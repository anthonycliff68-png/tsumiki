import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { DayTimeline, type DropTarget } from '@/components/DayTimeline';
import { useDockClearance } from '@/components/Dock';
import { copy } from '@/copy';
import {
  useAnchors,
  useCheckIn,
  useMoveHabit,
  useToday,
  useUndoCheckIn,
  type TodayHabit,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, display, fonts, habitColors, radii, spacing } from '@/theme';

/** My Day. Artboard: MyDay, as a full hour grid you can rearrange. */
export default function MyDayScreen() {
  const insets = useSafeAreaInsets();
  const clearance = useDockClearance();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: anchors = [] } = useAnchors(userId);
  const { data: habits = [], refetch, isRefetching } = useToday(userId);
  const checkIn = useCheckIn(userId);
  const undo = useUndoCheckIn(userId);
  const moveHabit = useMoveHabit(userId);

  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const stacked = habits.filter((habit) => habit.mode === 'after').length;
  const timed = habits.filter((habit) => habit.mode === 'at').length;
  const heroColor = habits.find((habit) => !habit.checkedIn)?.color ?? habitColors[0];

  const toggle = (habit: TodayHabit) =>
    habit.checkedIn
      ? undo.mutate({ habitId: habit.id })
      : checkIn.mutate({ habitId: habit.id });

  const move = (habit: TodayHabit, target: DropTarget) => {
    setError(null);
    const input =
      target.kind === 'anchor'
        ? { habitId: habit.id, mode: 'after' as const, anchorId: target.anchorId }
        : {
            habitId: habit.id,
            mode: 'at' as const,
            atTime: `${String(target.hour).padStart(2, '0')}:00`,
          };
    moveHabit.mutate(input, { onError: () => setError(copy.myDay.moveFailed) });
  };

  return (
    <View style={styles.root}>
      <Bleed color={heroColor} />
      <ScrollView
        scrollEnabled={!dragging}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingBottom: clearance,
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.textMuted}
          />
        }
      >
        <View style={styles.topRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
          </View>
          <Text
            style={[styles.pillText, styles.link]}
            onPress={() => router.push('/schedule')}
            accessibilityRole="button"
          >
            {copy.myDay.editRoutine}
          </Text>
        </View>

        <View style={styles.header}>
          <Text style={display(56, 50)}>{copy.myDay.title}</Text>
          <View style={styles.counts}>
            <Text style={[display(24, 24), { color: colors.textMuted }]}>
              {copy.myDay.habitCount(habits.length)}
            </Text>
            <Text style={styles.countsSub}>{copy.myDay.breakdown(stacked, timed)}</Text>
          </View>
        </View>

        {anchors.length === 0 && <Text style={styles.empty}>{copy.myDay.empty}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}

        <DayTimeline
          anchors={anchors}
          habits={habits}
          nowMinutes={nowMinutes}
          onToggle={toggle}
          onEditHabit={(habit) =>
            router.push({ pathname: '/new-habit', params: { id: habit.id } })
          }
          onEditAnchor={(anchor) =>
            router.push({ pathname: '/schedule', params: { id: anchor.id } })
          }
          onMove={move}
          onDragChange={setDragging}
        />

        <Text
          accessibilityRole="button"
          onPress={() => router.push('/new-habit')}
          style={styles.newHabit}
        >
          + {copy.myDay.newHabit}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  link: { color: colors.textMuted },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  counts: { alignItems: 'flex-end', paddingBottom: 4 },
  countsSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  empty: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: habitColors[1] },
  newHabit: {
    minHeight: 52,
    textAlignVertical: 'center',
    textAlign: 'center',
    paddingTop: 16,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
});
