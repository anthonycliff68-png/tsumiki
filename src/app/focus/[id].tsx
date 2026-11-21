// ponytail: preview of duets/adhd-planner/spec.md. Timer lives in memory and
// nothing is saved: Finish just goes back. Real one persists the session and
// schedules the time's-up notification (Release 3).
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/Button';
import { StepStones } from '@/components/Stones';
import { TimerWater } from '@/components/Water';
import { copy } from '@/copy';
import { useStyles } from '@/lib/appearance';
import { goBack } from '@/lib/back';
import { alpha, display, fonts, spacing, type Palette } from '@/theme';

const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function FocusScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ title: string; emoji: string; color: string; minutes: string; steps: string; stones?: string }>();
  const steps: string[] = JSON.parse(params.steps ?? '[]');
  const asStones = params.stones === '1' && steps.length > 0;
  const color = params.color ?? '#7F77DD';
  const [planned, setPlanned] = useState(() => Number(params.minutes ?? 15) * 60000);
  const [deadline, setDeadline] = useState(() => Date.now() + planned);
  const [paused, setPaused] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [checked, setChecked] = useState<number[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [rising, setRising] = useState(true);
  const [level] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, []);

  const left = paused ?? Math.max(0, deadline - now);
  const up = left === 0;
  const seconds = Math.ceil(left / 1000);
  useEffect(() => {
    const leftPart = Math.min(1, (seconds * 1000) / planned);
    Animated.timing(level, { toValue: rising ? 1 - leftPart : leftPart, duration: 900, easing: Easing.linear, useNativeDriver: true }).start();
  }, [seconds, planned, rising, level]);

  const current = steps.findIndex((_, i) => !checked.includes(i));
  const check = (i: number) => {
    if (checked.includes(i)) return setChecked(checked.filter((x) => x !== i));
    if (checked.length + 1 === steps.length) return goBack(); // Last step finishes it.
    setChecked([...checked, i]);
  };
  const addFive = () => {
    setPlanned(planned + 300000);
    if (paused !== null) setPaused(paused + 300000);
    else setDeadline(Math.max(deadline, Date.now()) + 300000);
  };
  const pause = () => {
    if (paused === null) return setPaused(left);
    setDeadline(Date.now() + paused);
    setPaused(null);
  };
  const jump = () => {
    setPaused(null);
    setDeadline(Date.now() + 5000);
  };

  return (
    <View style={styles.root}>
      <TimerWater color={alpha(color, 0.6)} level={level} />
      <View style={[styles.page, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.top}>
          <TextButton label={`‹ ${copy.focus.back}`} onPress={goBack} />
          <Text style={styles.label}>{copy.focus.label}</Text>
        </View>

        <View style={styles.task}>
          <Text style={styles.title} numberOfLines={3}>
            {params.emoji ? `${params.emoji} ` : ''}
            {params.title}
          </Text>
          {asStones && <StepStones steps={steps} checked={checked} current={current} hint={copy.focus.tapWhenDone} onCheck={check} />}
          {!asStones && current >= 0 && !showAll && (
            <Pressable accessibilityRole="button" accessibilityLabel={`Finish step: ${steps[current]}`} onPress={() => check(current)} style={styles.step}>
              <Text style={styles.stepCount}>{copy.focus.step(current + 1, steps.length)}</Text>
              <Text style={styles.stepName}>{steps[current]}</Text>
              <Text style={styles.stepHint}>{copy.focus.tapWhenDone}</Text>
            </Pressable>
          )}
          {!asStones && showAll &&
            steps.map((s, i) => (
              <Pressable key={s} accessibilityRole="button" onPress={() => check(i)} style={styles.stepLine}>
                <Text style={[styles.stepLineText, checked.includes(i) && styles.stepDone]}>{s}</Text>
              </Pressable>
            ))}
          {!asStones && steps.length > 0 && <TextButton label={showAll ? copy.focus.hideSteps : copy.focus.allSteps} onPress={() => setShowAll(!showAll)} />}
        </View>

        <View style={styles.bottom}>
          {up ? (
            <>
              <Text style={styles.going}>{copy.focus.howsItGoing}</Text>
              <Text style={styles.timeUp}>{copy.focus.timeUp}</Text>
              <PrimaryButton label={copy.focus.finish} onPress={goBack} />
              <View style={styles.row}>
                <TextButton label={copy.focus.plusFive} onPress={addFive} />
                <TextButton label={copy.focus.backToDay} onPress={goBack} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.time}>{copy.focus.left(clock(left))}</Text>
              <PrimaryButton label={copy.focus.finish} onPress={goBack} />
              <View style={styles.row}>
                <TextButton label={paused === null ? copy.focus.pause : copy.focus.resume} onPress={pause} />
                <TextButton label={copy.focus.plusFive} onPress={addFive} />
              </View>
            </>
          )}
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>{copy.focus.preview}</Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setRising(!rising)}>
              <Text style={styles.previewLink}>{rising ? copy.focus.rising : copy.focus.draining}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={jump}>
              <Text style={styles.previewLink}>{copy.focus.jump}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  ({
    root: { flex: 1, backgroundColor: colors.bg },
    page: { flex: 1, paddingHorizontal: spacing.xl },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { fontFamily: fonts.bodyMedium, fontSize: 12, letterSpacing: 2, color: colors.textMuted },
    task: { flex: 1, justifyContent: 'center', gap: spacing.lg },
    title: { ...display(40, 44), color: colors.text },
    step: { gap: 4, padding: spacing.lg, borderRadius: 18, backgroundColor: alpha(colors.bg, 0.55) },
    stepCount: { fontFamily: fonts.bodyMedium, fontSize: 12, letterSpacing: 1, color: colors.textMuted },
    stepName: { fontFamily: fonts.bodyMedium, fontSize: 22, color: colors.text },
    stepHint: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
    stepLine: { paddingVertical: 8 },
    stepLineText: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.text },
    stepDone: { textDecorationLine: 'line-through', opacity: 0.6 },
    bottom: { gap: spacing.sm },
    time: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.text, textAlign: 'center' },
    going: { ...display(30, 34), color: colors.text, textAlign: 'center' },
    timeUp: { fontFamily: fonts.body, fontSize: 15, color: colors.text, textAlign: 'center' },
    row: { flexDirection: 'row', justifyContent: 'space-around' },
    preview: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, paddingTop: spacing.xs },
    previewLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
    previewLink: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.text, textDecorationLine: 'underline' },
  }) as const;
