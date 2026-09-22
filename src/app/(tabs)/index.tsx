import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton } from '@/components/Button';
import { useDockClearance } from '@/components/Dock';
import { HeroCard } from '@/components/HeroCard';
import { UpNextTile } from '@/components/UpNextTile';
import { copy } from '@/copy';
import { useCheckIn, useToday, useUndoCheckIn } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addDays, formatBigDate, formatDayName } from '@/lib/dates';
import { colors, display, fonts, habitColors, radii, spacing, tint } from '@/theme';

/** Today. Artboard: TodayDark. */
export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const clearance = useDockClearance();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: habits = [], isPending, isError, refetch, isRefetching } = useToday(userId);
  const checkIn = useCheckIn(userId);
  const undo = useUndoCheckIn(userId);

  // Whatever wrote while we were away, pick it up on the way back in.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const today = new Date();
  const done = habits.filter((habit) => habit.checkedIn).length;

  // The hero is the next habit still open; once everything is done it holds the
  // last one, so the screen never goes blank on a finished day.
  const hero = useMemo(
    () => habits.find((habit) => !habit.checkedIn) ?? habits[habits.length - 1],
    [habits],
  );
  const rest = useMemo(() => habits.filter((habit) => habit.id !== hero?.id), [habits, hero]);

  const bleedColor = hero?.color ?? habitColors[0];

  return (
    <View style={styles.root}>
      <Bleed color={bleedColor} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingBottom: clearance,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.textMuted} />
        }
      >
        <View style={styles.days}>
          <Text style={styles.dayMuted}>{formatDayName(addDays(today, -1))}</Text>
          <View style={styles.dayActive}>
            <Text style={styles.dayActiveText}>{copy.dock.tabs.today}</Text>
          </View>
          <Text style={styles.dayMuted}>{formatDayName(addDays(today, 1))}</Text>
        </View>

        <View style={styles.header}>
          <Text style={display(76, 62)}>{formatBigDate(today)}</Text>
          <View style={styles.count}>
            <Text style={[display(30, 30), { color: tint(bleedColor, 0.55) }]}>
              {done}/{habits.length}
            </Text>
            <Text style={styles.countLabel}>{copy.today.doneCount}</Text>
          </View>
        </View>

        {isError && <Text style={styles.notice}>{copy.today.loadFailed}</Text>}

        {!isPending && habits.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{copy.today.emptyTitle}</Text>
            <Text style={styles.emptyBody}>{copy.today.emptyBody}</Text>
            <PrimaryButton label={copy.today.addHabit} onPress={() => router.push('/new-habit')} />
          </View>
        )}

        {hero && (
          <View style={styles.padded}>
            <HeroCard
              habit={hero}
              onEdit={() => router.push({ pathname: '/new-habit', params: { id: hero.id } })}
              busy={checkIn.isPending}
              onCheckIn={() => checkIn.mutate({ habitId: hero.id })}
              onUndo={() => undo.mutate({ habitId: hero.id })}
            />
          </View>
        )}

        {rest.length > 0 && (
          <>
            <View style={[styles.padded, styles.sectionHead]}>
              <Text style={styles.sectionTitle}>{copy.today.upNext}</Text>
              <Text style={styles.sectionLink} onPress={() => router.push('/crews')}>
                {copy.today.allCrews}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tiles}
            >
              {rest.map((habit) => (
                <UpNextTile
                key={habit.id}
                habit={habit}
                onPress={() => router.push({ pathname: '/new-habit', params: { id: habit.id } })}
              />
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  padded: { paddingHorizontal: spacing.xl },
  days: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dayMuted: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingTop: 9,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textFaint,
  },
  dayActive: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    backgroundColor: colors.text,
  },
  dayActiveText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  count: { alignItems: 'flex-end', gap: 2, paddingBottom: 4 },
  countLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textFaint,
    textTransform: 'uppercase',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text },
  sectionLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: tint(habitColors[0], 0.55) },
  tiles: { gap: 12, paddingHorizontal: spacing.xl },
  notice: {
    marginHorizontal: spacing.xl,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  empty: {
    marginHorizontal: spacing.xl,
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.bigCard,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  emptyTitle: { ...display(30, 30) },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
});
