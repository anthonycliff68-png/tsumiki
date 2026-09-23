import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { TextButton } from '@/components/Button';
import { CheckIcon, FlameIcon } from '@/components/icons';
import { copy } from '@/copy';
import { formatTime } from '@/data/defaults';
import {
  useCheckIn,
  useCrew,
  useCrewStatuses,
  useHeadingOut,
  useLeaveCrew,
  useNudgesSentToday,
  useUndoCheckIn,
  type CrewMemberState,
} from '@/lib/api';
import { NudgeSheet } from '@/components/NudgeSheet';
import { SafetySheet } from '@/components/SafetySheet';
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
  const { data: onTheWay = [] } = useCrewStatuses(id);
  const { data: nudgedToday = [] } = useNudgesSentToday(userId);
  const checkIn = useCheckIn(userId);
  const undo = useUndoCheckIn(userId);
  const headingOut = useHeadingOut(userId);
  const leaveCrew = useLeaveCrew();
  const [nudging, setNudging] = useState<CrewMemberState | null>(null);
  const [reporting, setReporting] = useState<CrewMemberState | null>(null);

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
  const remaining = crew.members.length - inCount;

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
              {crew.streakCurrent === 0
                ? copy.crews.startToday
                : copy.crews.daysStrong(crew.streakCurrent)}
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

        <View style={styles.crewLineRow}>
          <Text style={styles.crewLine}>{copy.crews.crewLine(inCount, crew.members.length)}</Text>
          {crew.members.length < 5 && (
            <Text
              accessibilityRole="button"
              style={[styles.crewLine, { color: tint(crew.habitColor, 0.5) }]}
              onPress={() => router.push({ pathname: '/invite/[id]', params: { id: crew.id } })}
            >
              {copy.crews.invite}
            </Text>
          )}
        </View>

        <View style={styles.members}>
          {crew.members.map((member) => (
            <MemberTile
              key={member.userId}
              member={member}
              isMe={member.userId === userId}
              habitColor={crew.habitColor}
              onTheWay={onTheWay.includes(member.userId)}
              alreadyNudged={nudgedToday.includes(member.userId)}
              onNudge={() => setNudging(member)}
              onReport={() => setReporting(member)}
              onToggle={() => {
                if (member.userId !== userId) return;
                if (member.checkedIn) undo.mutate({ habitId: crew.habitId });
                else checkIn.mutate({ habitId: crew.habitId });
              }}
            />
          ))}
        </View>

        {me && !me.checkedIn && (
          <Pressable
            accessibilityRole="button"
            onPress={() => headingOut.mutate(crew.id)}
            style={({ pressed }) => [styles.headingOut, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.headingOutText}>{copy.nudge.headingOut}</Text>
          </Pressable>
        )}

        {me?.graceUsed && <Text style={styles.grace}>{copy.crews.graceUsed}</Text>}

        <Text style={styles.hint}>{copy.nudge.pushLater}</Text>

        <TextButton
          label={copy.crews.leave}
          onPress={() => leaveCrew.mutate(crew.id, { onSuccess: () => router.back() })}
        />
      </ScrollView>

      <SafetySheet
        visible={reporting !== null}
        kind="profile"
        personId={reporting?.userId ?? ''}
        personName={reporting?.displayName ?? ''}
        onClose={() => setReporting(null)}
        onBlocked={() => void refetch()}
      />

      <NudgeSheet
        visible={nudging !== null}
        crewId={crew.id}
        member={nudging}
        remaining={remaining}
        moment={momentOf(nudging)}
        onClose={() => setNudging(null)}
      />
    </View>
  );
}

/** "After lunch", "6:30 pm", or anytime — how someone describes their moment. */
function momentOf(member: CrewMemberState | null): string {
  if (!member) return '';
  if (member.mode === 'after' && member.anchorLabel) return `After ${member.anchorLabel.toLowerCase()}`;
  if (member.mode === 'at' && member.atTime) return formatTime(member.atTime);
  return copy.today.anytime;
}

function MemberTile({
  member,
  isMe,
  habitColor,
  onTheWay,
  alreadyNudged,
  onNudge,
  onReport,
  onToggle,
}: {
  member: CrewMemberState;
  isMe: boolean;
  habitColor: string;
  onTheWay: boolean;
  alreadyNudged: boolean;
  onNudge: () => void;
  onReport: () => void;
  onToggle: () => void;
}) {
  const moment = momentOf(member);

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
        {onTheWay
          ? isMe
            ? copy.nudge.youAreOnTheWay
            : copy.nudge.onTheWay(member.displayName)
          : moment}
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
      ) : null}

      {!isMe && (
        <Text
          accessibilityRole="button"
          onPress={onReport}
          style={styles.reportLink}
        >
          {copy.safety.report}
        </Text>
      )}

      {isMe ? null : member.checkedIn ? (
        <View style={styles.memberIn}>
          <CheckIcon size={14} color={colors.success} strokeWidth={3} />
          <Text style={[styles.memberButtonText, { color: colors.success }]}>
            {copy.crews.memberIn}
          </Text>
        </View>
      ) : alreadyNudged ? (
        <Text style={[styles.memberButtonText, { color: colors.textFaint }]}>
          {copy.nudge.nudged}
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.nudge.sendTitle(member.displayName)}
          onPress={onNudge}
          style={({ pressed }) => [
            styles.memberButton,
            { backgroundColor: habitColors[1] },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.memberButtonText, { color: colors.white }]}>{copy.nudge.nudge}</Text>
        </Pressable>
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
  crewLineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  reportLink: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textFaint },
  headingOut: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headingOutText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textFaint },
});
