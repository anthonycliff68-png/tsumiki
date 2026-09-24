import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { SafetySheet } from '@/components/SafetySheet';
import { PrimaryButton, TextButton } from '@/components/Button';
import { CheckIcon, FlameIcon } from '@/components/icons';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import {
  useCheckIn,
  useCrew,
  useHeadingOut,
  useMyProfile,
  useNudgesForMe,
  useSendReaction,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { alpha, display, fonts, radii, spacing, type Palette } from '@/theme';

/** A nudge, opened. Artboards: NudgeOpen, then NudgeDone once you check in. */
export default function NudgeScreen() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: nudges = [], isPending } = useNudgesForMe(userId);
  const nudge = nudges.find((item) => item.id === id);
  const { data: profile } = useMyProfile(userId);
  const { data: crew } = useCrew(nudge?.crewId);
  const checkIn = useCheckIn(userId);
  const headingOut = useHeadingOut(userId);
  const react = useSendReaction(userId);
  const [reporting, setReporting] = useState(false);

  if (isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!nudge) {
    return (
      <View style={styles.loading}>
        <Text style={styles.gone}>{copy.nudge.notAllowed}</Text>
        <TextButton label={copy.crews.back} onPress={() => router.back()} />
      </View>
    );
  }

  const myName = profile?.display_name || copy.crews.you;
  const inCount = crew?.members.filter((member) => member.checkedIn).length ?? 0;
  const total = crew?.members.length ?? 0;

  return (
    <View style={styles.root}>
      <Bleed color={nudge.habitColor} />
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
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <View style={styles.pill}>
            <FlameIcon size={13} color={colors.text} />
            <Text style={styles.pillText}>
              {nudge.crewName} · {crew?.streakCurrent ?? 0}
            </Text>
          </View>
        </View>

        {nudge.checkedIn ? (
          <>
            <View style={styles.savedPill}>
              <CheckIcon size={14} color={colors.bg} strokeWidth={3} />
              <Text style={styles.savedText}>{copy.nudge.streakSaved}</Text>
            </View>

            <View style={styles.streakLine}>
              <Text style={[display(72, 64), { color: nudge.habitColor }]}>
                {crew?.streakCurrent ?? 0}
              </Text>
              <Text style={[display(30, 30), styles.streakWord]}>
                {copy.crews.daysStrong(crew?.streakCurrent ?? 0)}
              </Text>
            </View>

            <Text style={styles.body}>
              {copy.crews.crewLine(inCount, total)} · {nudge.habitName}
            </Text>

            <Text style={styles.label}>{copy.nudge.thanks}</Text>
            {nudge.reactionKind ? (
              <Text style={styles.body}>{copy.nudge.thanked}</Text>
            ) : (
              <View style={styles.chips}>
                <ReactionChip
                  label={copy.nudge.thanksForPush}
                  onPress={() => react.mutate({ nudgeId: nudge.id, kind: 'thanks' })}
                />
                <ReactionChip
                  label={copy.nudge.sameTimeTomorrow}
                  onPress={() => react.mutate({ nudgeId: nudge.id, kind: 'same_time_tmrw' })}
                />
              </View>
            )}

            <PrimaryButton label={copy.myDay.title} onPress={() => router.replace('/')} />
          </>
        ) : (
          <>
            <View style={styles.fromRow}>
              <View style={[styles.avatar, { backgroundColor: nudge.fromColor }]}>
                <Text style={styles.avatarText}>{nudge.fromName.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={styles.messageChip}>
                <Text style={styles.messageText}>{nudge.message}</Text>
              </View>
            </View>

            <Text style={display(46, 44)}>{copy.nudge.openTitle(myName)}</Text>

            <Text style={styles.body}>
              {copy.nudge.from(nudge.fromName)} · {copy.crews.crewLine(inCount, total)}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.today.checkInLabel(nudge.habitName)}
              onPress={() => checkIn.mutate({ habitId: nudge.habitId })}
              style={({ pressed }) => [
                styles.orb,
                { backgroundColor: nudge.habitColor, boxShadow: `0px 0px 40px ${alpha(nudge.habitColor, 0.8)}` },
                pressed && { opacity: 0.9 },
              ]}
            >
              <CheckIcon size={40} color={colors.white} strokeWidth={2.8} />
            </Pressable>
            <Text style={styles.orbLabel}>{copy.nudge.didIt}</Text>

            <Text
              accessibilityRole="button"
              onPress={() => setReporting(true)}
              style={styles.reportLink}
            >
              {copy.safety.report} · {copy.safety.block}
            </Text>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => headingOut.mutate(nudge.crewId, { onSuccess: () => router.back() })}
                style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.actionText}>{copy.nudge.headingOut}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.actionText}>{copy.nudge.skipToday}</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <SafetySheet
        visible={reporting}
        kind="nudge"
        refId={nudge.id}
        personId={nudge.fromUserId}
        personName={nudge.fromName}
        onClose={() => setReporting(false)}
        onBlocked={() => router.replace('/')}
      />
    </View>
  );
}

function ReactionChip({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.reaction, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.reactionText}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: {
    flex: 1,
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  gone: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  closeText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  fromRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
  messageChip: {
    flexShrink: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radii.chip,
    backgroundColor: colors.text,
  },
  messageText: { ...display(20, 22), color: colors.bg },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  orb: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  orbLabel: {
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  actions: { gap: spacing.sm },
  reportLink: {
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textFaint,
  },
  action: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  actionText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  savedPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    backgroundColor: colors.text,
  },
  savedText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.bg,
  },
  streakLine: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  streakWord: { color: colors.text, paddingBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reaction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  reactionText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
}) as const;
