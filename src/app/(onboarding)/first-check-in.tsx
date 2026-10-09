import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
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
 * How long "That was it" stays up before the app opens itself.
 *
 * Long enough to see the headline land and catch the first line; short enough
 * that it never feels like waiting. A second and a half read as a pause at the
 * end of setting something up, which is the one moment nobody wants a pause.
 */
const AFTER_CHECK_MS = 900;

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
  /**
   * Read from the habit, not held separately.
   *
   * This used to be its own piece of state, set to true the moment the orb was
   * tapped and never set back. So the screen said "That was it" for good — undo
   * the check-in and the words still congratulated you. Worse, the orb draws a
   * tick in both states and only changes colour, so somebody toggling it saw a
   * frozen headline above a circle that looked much the same either way, and
   * reasonably concluded the button was dead. It was working the whole time.
   */
  const done = habit?.checkedIn ?? false;

  const moment =
    !habit || habit.mode === 'any'
      ? copy.dock.upNextAnytime.toLowerCase()
      : habit.mode === 'after' && habit.anchorLabel
        ? `after ${habit.anchorLabel.toLowerCase()}`
        : habit.time
          ? `at ${formatTime(habit.time)}`
          : '';

  /**
   * Once it is checked off, the screen shows its piece and then leaves.
   *
   * Making somebody tap a second button to get into an app they have just
   * finished setting up is a tap too many, and a reader said so. But going
   * instantly would skip the only place onboarding explains what happens
   * tomorrow and how one missed day is forgiven, so the hold is the point
   * rather than a delay: long enough to read the headline and start the first
   * line, short enough not to feel stuck. Undo is still a tap away on Today.
   */
  const leaving = useRef(false);
  /**
   * The previous value of `done`, or null until the habit has loaded.
   *
   * What triggers the exit is the change from unchecked to checked while this
   * screen is open — not the state itself. Someone arriving on a habit they
   * have already done has not just done anything, and throwing them out a
   * second and a half later would read as a malfunction rather than a finish.
   * Checking that it merely *is* done was not enough: undo it and check it
   * again and the screen sat there, because it had only ever asked how things
   * started.
   */
  const wasDone = useRef<boolean | null>(null);
  useEffect(() => {
    if (!habit) return;
    const before = wasDone.current;
    wasDone.current = done;
    if (before !== false || !done || leaving.current) return;
    leaving.current = true;
    const timer = setTimeout(() => leave(), AFTER_CHECK_MS);
    return () => clearTimeout(timer);
    // leave only writes a flag and replaces the route, so it needs no deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habit, done]);

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
