import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton, TextButton } from '@/components/Button';
import { FlameIcon } from '@/components/icons';
import { TimePickerSheet } from '@/components/TimePickerSheet';
import { copy } from '@/copy';
import { formatTime, formatTimeShort } from '@/data/defaults';
import {
  CrewFullError,
  InviteNotFoundError,
  useAnchors,
  useInvitePreview,
  useJoinCrew,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { rememberInvite } from '@/lib/invite';
import type { ScheduleMode } from '@/lib/models';
import { colors, display, fonts, habitColors, radii, spacing } from '@/theme';

/** An invite link, opened. Artboards: InviteJoin, then InviteJoined. */
export default function JoinScreen() {
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: invite, isPending } = useInvitePreview(code);
  const { data: anchors = [] } = useAnchors(userId);
  const joinCrew = useJoinCrew();

  const [mode, setMode] = useState<ScheduleMode>('after');
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [atTime, setAtTime] = useState('12:30');
  const [picking, setPicking] = useState(false);
  const [joinedCrewId, setJoinedCrewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (anchorId === null && anchors.length > 0) setAnchorId(anchors[0]?.id ?? null);
  }, [anchors, anchorId]);

  // Signed out: hold the code so the join can finish after signing in.
  useEffect(() => {
    if (!session && code) void rememberInvite(code);
  }, [session, code]);

  if (isPending) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!invite || invite.expired) {
    return (
      <View style={styles.centre}>
        <Text style={styles.message}>{copy.invite.notFound}</Text>
        <TextButton label={copy.invite.notNow} onPress={() => router.replace('/')} />
      </View>
    );
  }

  const join = () => {
    setError(null);
    if (mode === 'after' && !anchorId) return setError(copy.newHabit.needAnchor);
    joinCrew.mutate(
      { code: invite.code, mode, anchorId, atTime },
      {
        onSuccess: (crewId) => setJoinedCrewId(crewId),
        onError: (e) => {
          if (e instanceof InviteNotFoundError) return setError(copy.invite.notFound);
          if (e instanceof CrewFullError) return setError(copy.invite.crewFull);
          setError(e instanceof Error ? e.message : copy.auth.genericError);
        },
      },
    );
  };

  return (
    <View style={styles.root}>
      <Bleed color={invite.habitColor} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xxl,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {joinedCrewId ? (
          <>
            <Text style={display(64, 58)}>{copy.invite.joinedTitle}</Text>
            <Text style={styles.body}>
              {copy.invite.joinedBody(invite.crewName, invite.memberCount + 1)}
            </Text>
            <View style={[styles.card, { backgroundColor: invite.habitColor }]}>
              <Text style={styles.cardLabel}>{copy.invite.firstCheckIn}</Text>
              <Text style={styles.cardHabit}>{invite.habitName}</Text>
              <Text style={styles.cardMeta}>
                {mode === 'after'
                  ? `After ${(anchors.find((a) => a.id === anchorId)?.label ?? '').toLowerCase()}`
                  : mode === 'at'
                    ? formatTime(atTime)
                    : copy.today.anytime}
              </Text>
            </View>
            <PrimaryButton
              label={copy.invite.seeMyDay}
              onPress={() => router.replace({ pathname: '/crew/[id]', params: { id: joinedCrewId } })}
            />
          </>
        ) : (
          <>
            <Text style={styles.eyebrow}>{copy.invite.invitedBy}</Text>
            <Text style={display(56, 50)}>{copy.invite.joinTitle(invite.crewName)}</Text>

            <View style={[styles.card, { backgroundColor: invite.habitColor }]}>
              <Text style={styles.cardHabit}>{invite.habitName}</Text>
              <View style={styles.cardRow}>
                <Text style={styles.cardMeta}>{copy.invite.spots(invite.memberCount)}</Text>
                {invite.streakCurrent > 0 && (
                  <View style={styles.streak}>
                    <FlameIcon size={13} color={colors.white} />
                    <Text style={styles.cardMeta}>{invite.streakCurrent}</Text>
                  </View>
                )}
              </View>
            </View>

            {invite.isFull && <Text style={styles.message}>{copy.invite.crewFull}</Text>}

            {!session ? (
              <>
                <Text style={styles.body}>{copy.invite.signInBlurb}</Text>
                <PrimaryButton
                  label={copy.invite.signInToJoin}
                  onPress={() => router.replace('/sign-in')}
                />
              </>
            ) : (
              !invite.isFull && (
                <>
                  <Text style={styles.label}>{copy.invite.yourMoment}</Text>
                  <View style={styles.chips}>
                    {anchors.map((anchor) => {
                      const active = mode === 'after' && anchor.id === anchorId;
                      return (
                        <Pressable
                          key={anchor.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          onPress={() => {
                            setMode('after');
                            setAnchorId(anchor.id);
                          }}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {anchor.label}
                          </Text>
                          <Text style={[styles.chipTime, active && styles.chipTextActive]}>
                            {formatTimeShort(anchor.usual_time)}
                          </Text>
                        </Pressable>
                      );
                    })}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: mode === 'at' }}
                      onPress={() => {
                        setMode('at');
                        setPicking(true);
                      }}
                      style={[styles.chip, mode === 'at' && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, mode === 'at' && styles.chipTextActive]}>
                        {formatTime(atTime)}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: mode === 'any' }}
                      onPress={() => setMode('any')}
                      style={[styles.chip, mode === 'any' && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, mode === 'any' && styles.chipTextActive]}>
                        {copy.today.anytime}
                      </Text>
                    </Pressable>
                  </View>

                  {error && <Text style={styles.message}>{error}</Text>}

                  <PrimaryButton
                    label={copy.invite.join}
                    busy={joinCrew.isPending}
                    onPress={join}
                  />
                  <TextButton label={copy.invite.notNow} onPress={() => router.replace('/')} />
                </>
              )
            )}
          </>
        )}
      </ScrollView>

      <TimePickerSheet
        visible={picking}
        value={atTime}
        label={copy.newHabit.atTime}
        onChange={setAtTime}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centre: {
    flex: 1,
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  message: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text, textAlign: 'center' },
  card: { gap: 6, padding: spacing.xl, borderRadius: radii.hero },
  cardLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  cardHabit: { ...display(34, 32), color: colors.white },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardMeta: { fontFamily: fonts.bodyBold, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipActive: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  chipTime: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  chipTextActive: { color: colors.bg },
});
