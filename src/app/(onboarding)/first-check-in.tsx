import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton, TextButton } from '@/components/Button';
import { CheckInOrb } from '@/components/CheckInOrb';
import { Display } from '@/components/Screen';
import { useStyles } from '@/lib/appearance';
import { copy } from '@/copy';
import { formatTime } from '@/data/defaults';
import { useCheckIn, useToday, useUndoCheckIn } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { orderForDay } from '@/lib/today';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

/** Set once the walkthrough has been through, so it never interrupts twice. */
export const WALKTHROUGH_SEEN = 'tsumiki.walkthrough.seen';

/**
 * The last step: doing it, rather than being told about it.
 *
 * The welcome carousel makes the case before sign-up and the setup steps name
 * each idea as it is used, but a reader still said the app only made sense once
 * they had actually used it. So this is a real check-in, on their own habit,
 * about a minute in — the whole loop happening to them instead of being
 * described.
 *
 * Reachable by route rather than wired to the end of one path, because there
 * are two ways out of the crew step and both need to arrive here.
 */
export default function FirstCheckInScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: habits = [] } = useToday(userId);
  const checkIn = useCheckIn(userId);
  const undo = useUndoCheckIn(userId);

  const habit = useMemo(() => orderForDay(habits)[0], [habits]);
  const [done, setDone] = useState(false);

  const moment =
    !habit || habit.mode === 'any'
      ? copy.dock.upNextAnytime.toLowerCase()
      : habit.mode === 'after' && habit.anchorLabel
        ? `after ${habit.anchorLabel.toLowerCase()}`
        : habit.time
          ? `at ${formatTime(habit.time)}`
          : '';

  const leave = () => {
    // Remembered before navigating: arriving in the app and being bounced
    // back here would undo the point of it.
    void AsyncStorage.setItem(WALKTHROUGH_SEEN, 'yes').catch(() => {});
    router.replace('/');
  };

  const colour = habit?.color ?? habitColors[0];

  return (
    <View style={styles.root}>
      <Bleed color={colour} />

      <View style={[styles.body, { paddingTop: insets.top + 80 }]}>
        <View style={styles.words}>
          <Text style={[styles.eyebrow, { color: colour }]}>{copy.walkthrough.eyebrow}</Text>
          <Display size={48} line={42}>
            {done ? copy.walkthrough.doneTitle : copy.walkthrough.title}
          </Display>
          <Text style={styles.blurb}>
            {done ? copy.walkthrough.doneBlurb(moment) : copy.walkthrough.blurb}
          </Text>
          {done && habit && !habit.crewId && (
            <Text style={styles.blurb}>{copy.walkthrough.doneSolo}</Text>
          )}
        </View>

        {habit && (
          <View style={styles.stage}>
            <View style={[styles.card, { borderColor: alpha(colour, 0.5) }]}>
              <Text style={[styles.when, { color: colour }]}>{copy.walkthrough.when(moment)}</Text>
              <Display size={30} line={28}>
                {habit.name}
              </Display>
            </View>

            {/* The real orb, not a picture of one, and the real mutation behind
                it — the point is that this is the move they will make every
                day, not a demonstration of it. */}
            <View style={styles.orb}>
              <CheckInOrb
                color={colour}
                done={habit.checkedIn ? 1 : 0}
                total={1}
                checkedIn={habit.checkedIn}
                accessibilityLabel={
                  habit.checkedIn
                    ? copy.dock.checkedInLabel(habit.name)
                    : copy.dock.checkInLabel(habit.name)
                }
                onPress={() => {
                  if (habit.checkedIn) {
                    undo.mutate({ habitId: habit.id });
                  } else {
                    checkIn.mutate({ habitId: habit.id });
                    setDone(true);
                  }
                }}
              />
            </View>
          </View>
        )}
      </View>

      <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
        {done || !habit ? (
          <PrimaryButton label={copy.walkthrough.go} onPress={leave} />
        ) : (
          <TextButton label={copy.walkthrough.skip} onPress={leave} />
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: spacing.xl, gap: spacing.xxl },
  words: { gap: spacing.sm },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  blurb: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  stage: { alignItems: 'center', gap: spacing.xxl },
  card: {
    alignSelf: 'stretch',
    gap: 4,
    padding: spacing.lg,
    borderRadius: radii.bigCard,
    borderWidth: 1,
    backgroundColor: alpha(colors.overlay, 0.05),
  },
  when: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  // The orb draws a 32px glow, so it needs room around it or the shadow clips.
  orb: { paddingVertical: spacing.lg },
  foot: { paddingHorizontal: spacing.xl, gap: spacing.sm },
}) as const;
