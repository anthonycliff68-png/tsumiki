import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { TextButton } from '@/components/Button';
import { CheckIcon, FlameIcon } from '@/components/icons';
import { copy } from '@/copy';
import { formatTime } from '@/data/defaults';
import { useCheckIn, useCrew, useLeaveCrew, useUndoCheckIn, type CrewMemberState } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { alpha, colors, display, fonts, habitColors, radii, spacing, tint } from '@/theme';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** One crew: the shared streak, the week behind it, and who is in today. */
export default function CrewScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: crew, isPending, refetch } = useCrew(id);
  const checkIn = useCheckIn(userId);
  const undo = useUndoCheckIn(userId);
  const leaveCrew = useLeaveCrew();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  if (isPending || !crew) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  const inCount = crew.members.filter((member) => member.checkedIn).length;
  const me = crew.members.find((member) => member.userId === userId);

  return (
    <View style={styles.root}>
      <Bleed color={crew.habitColor} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.pill}>
            <Text style={styles.pillText}>‹ {copy.crews.back}</Text>
          </Pressable>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{copy.crews.spots(crew.members.length)}</Text>
          </View>
        </View>

        <View style={styles.streakPanel}>
          <View style={styles.streakTop}>
            <Text style={styles.streakLabel}>{copy.crews.groupStreak}</Text>
            <View style={styles.bestPill}>
              <FlameIcon size={13} color={colors.white} />
              <Text style={styles.bestText}>{copy.crews.best(crew.streakBest)}</Text>
            </View>
          </View>

          <View style={styles.streakLine}>
            <Text style={[display(72, 64), { color: crew.habitColor }]}>
              {crew.streakCurrent}
            </Text>
            <Text style={[display(30, 30), styles.streakWord]}>
              {crew.streakCurrent === 0 ? copy.crews.startToday : copy.crews.daysStrong}
            </Text>
          </View>

          <View style={styles.week}>
            {crew.lastSevenDays.map((day, index) => (
              <View key={day.date} style={styles.dayCell}>
                <View
                  style={[
                    styles.dayDot,
                    day.complete && { backgroundColor: crew.habitColor, borderColor: crew.habitColor },
                    day.isToday && !day.complete && styles.dayToday,
                  ]}
                >
                  {day.complete && <FlameIcon size={13} color={colors.white} />}
                </View>
                <Text style={styles.dayLetter}>
                  {DAY_LETTERS[new Date(`${day.date}T00:00:00`).getDay()] ?? ''}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.headerBlock}>
          <Text style={display(48, 44)}>{crew.name}</Text>
          <Text style={styles.subtitle}>{copy.crews.sameHabit(crew.habitName)}</Text>
        </View>

        <Text style={styles.crewLine}>{copy.crews.crewLine(inCount, crew.members.length)}</Text>

        <View style={styles.members}>
          {crew.members.map((member) => (
            <MemberTile
              key={member.userId}
              member={member}
              isMe={member.userId === userId}
              habitColor={crew.habitColor}
              onToggle={() => {
                if (member.userId !== userId) return;
                if (member.checkedIn) undo.mutate({ habitId: crew.habitId });
                else checkIn.mutate({ habitId: crew.habitId });
              }}
            />
          ))}
        </View>

        {me?.graceUsed && <Text style={styles.grace}>{copy.crews.graceUsed}</Text>}

        <Text style={styles.hint}>{copy.crews.invitesLater}</Text>
        <Text style={styles.hint}>{copy.crews.nudgesLater}</Text>

        <TextButton
          label={copy.crews.leave}
          onPress={() => leaveCrew.mutate(crew.id, { onSuccess: () => router.back() })}
        />
      </ScrollView>
    </View>
  );
}

function MemberTile({
  member,
  isMe,
  habitColor,
  onToggle,
}: {
  member: CrewMemberState;
  isMe: boolean;
  habitColor: string;
  onToggle: () => void;
}) {
  const moment =
    member.mode === 'after' && member.anchorLabel
      ? `After ${member.anchorLabel.toLowerCase()}`
      : member.mode === 'at' && member.atTime
        ? formatTime(member.atTime)
        : copy.today.anytime;

  return (
    <View style={styles.member}>
      <View style={[styles.tile, { backgroundColor: member.avatarColor }]}>
        <Text style={styles.tileInitials}>
          {isMe ? copy.crews.you.toUpperCase() : initials(member.displayName)}
        </Text>
      </View>
      <Text style={styles.memberName} numberOfLines={1}>
        {isMe ? copy.crews.you : member.displayName}
      </Text>
      <Text style={styles.memberMoment} numberOfLines={2}>
        {moment}
      </Text>

      {isMe ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={member.checkedIn ? copy.today.undoCheckIn : copy.crews.checkIn}
          onPress={onToggle}
          style={({ pressed }) => [
            styles.memberButton,
            member.checkedIn ? { backgroundColor: alpha(colors.success, 0.2) } : { backgroundColor: colors.text },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text
            style={[
              styles.memberButtonText,
              member.checkedIn ? { color: colors.success } : { color: colors.bg },
            ]}
          >
            {member.checkedIn ? copy.crews.checkedIn : copy.crews.checkIn}
          </Text>
        </Pressable>
      ) : member.checkedIn ? (
        <View style={styles.memberIn}>
          <CheckIcon size={14} color={colors.success} strokeWidth={3} />
          <Text style={[styles.memberButtonText, { color: colors.success }]}>
            {copy.crews.memberIn}
          </Text>
        </View>
      ) : (
        <Text style={[styles.memberButtonText, { color: tint(habitColor, 0.4) }]}>
          {copy.crews.memberNotYet}
        </Text>
      )}
    </View>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  streakPanel: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.bigCard,
    backgroundColor: 'rgba(11,11,12,0.55)',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  streakTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  bestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: radii.chip,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bestText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.white },
  streakLine: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  streakWord: { color: colors.text, paddingBottom: 6 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { alignItems: 'center', gap: 6 },
  dayDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dayToday: { borderStyle: 'dashed', borderColor: colors.textFaint },
  dayLetter: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textFaint },
  headerBlock: { gap: 6 },
  subtitle: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  crewLine: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  members: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  member: { width: 100, gap: 6 },
  tile: { width: 100, height: 100, borderRadius: radii.card, alignItems: 'center', justifyContent: 'center' },
  tileInitials: { ...display(34, 34), color: colors.white },
  memberName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  memberMoment: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  memberButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.chip,
    paddingHorizontal: 12,
  },
  memberButtonText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  memberIn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 },
  grace: { fontFamily: fonts.bodyMedium, fontSize: 13, color: habitColors[4] },
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textFaint },
});
