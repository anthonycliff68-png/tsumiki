import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton, TextButton } from '@/components/Button';
import { DayPreview } from '@/components/DayPreview';
import { CheckIcon, PlusIcon } from '@/components/icons';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Display } from '@/components/Screen';
import { TimePickerSheet } from '@/components/TimePickerSheet';
import { ToggleRow } from '@/components/ToggleRow';
import { copy } from '@/copy';
import { useCreateFirstHabit, useSaveRoutine, useAnchors, useTodoActions } from '@/lib/api';
import { useAppearance, useStyles, useTheme } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { askForCalendar, useTodayEvents } from '@/lib/calendar';
import { messageFrom } from '@/lib/errors';
import { buildDay, HABIT_CHOICES, MOMENT_CHOICES, momentFor, PICKED_FIRST, type MomentKey } from '@/lib/onboardingDay';
import { formatTime, fromTimeString, toTimeString } from '@/lib/times';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

const PAGES = 5;
const t = copy.onboarding.setup;

/** One colour per suggestion, and one for a habit of your own. */
const HABIT_COLOR: Record<string, string> = {
  read: habitColors[2],
  walk: habitColors[0],
  water: habitColors[3],
  own: habitColors[1],
};

/**
 * Setting up, one question a page: wake and bed, moments, a first habit, the
 * calendar, today's to-dos. Every answer lives here until "Build my day",
 * which saves them all at once and hands over to the plans.
 */
export default function SetupScreen() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const { theme } = useAppearance();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;
  const anchors = useAnchors(userId);
  const saveRoutine = useSaveRoutine(userId);
  const createHabit = useCreateFirstHabit(userId);
  const todoActions = useTodoActions(userId);

  // Somebody with a routine already has nothing to set up, and saving would lay
  // a second day on top of theirs. Only what was true on arrival counts: this
  // screen's own save makes the answer "yes" a moment later.
  const arrived = useRef<boolean | null>(null);
  useEffect(() => {
    if (!anchors.data) return;
    if (arrived.current === null) arrived.current = anchors.data.length > 0;
    if (arrived.current) router.replace('/');
  }, [anchors.data]);

  const [page, setPage] = useState(0);
  const [wake, setWake] = useState('07:00');
  const [bed, setBed] = useState('23:00');
  const [picking, setPicking] = useState<'wake' | 'bed' | null>(null);
  const [picked, setPicked] = useState<MomentKey[]>(PICKED_FIRST);
  const [own, setOwn] = useState<string[]>([]);
  const [habitId, setHabitId] = useState('read');
  const [ownHabit, setOwnHabit] = useState('');
  const [calendarOn, setCalendarOn] = useState(false);
  const [denied, setDenied] = useState(false);
  const [todos, setTodos] = useState<string[]>(['']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const events = useTodayEvents(calendarOn).data ?? [];
  const day = buildDay(wake, bed, picked, own);
  const choice = HABIT_CHOICES.find((h) => h.id === habitId);
  const habit =
    habitId === 'own'
      ? ownHabit.trim()
        ? {
            name: ownHabit.trim(),
            emoji: '✨',
            color: HABIT_COLOR.own as string,
            after: 'wake',
          }
        : undefined
      : choice && {
          name: choice.name,
          emoji: choice.emoji,
          color: HABIT_COLOR[choice.id] as string,
          after: choice.after,
        };

  const toggleMoment = (key: MomentKey) =>
    setPicked((now) => (now.includes(key) ? now.filter((k) => k !== key) : [...now, key]));

  const toggleCalendar = async (on: boolean) => {
    if (!on) return setCalendarOn(false);
    const granted = await askForCalendar();
    setDenied(!granted);
    setCalendarOn(granted);
  };

  const build = async (withTodos: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await saveRoutine.mutateAsync(
        day.map((m) => ({
          label: m.label,
          usualTime: m.time,
          isDefault: !m.key.startsWith('own'),
        })),
      );
      // The save returns only rows it added, so a retry reads the day back.
      const { data: saved = [] } = await anchors.refetch();
      if (habit) {
        const moment = momentFor(habit.after, day);
        const anchor = saved.find((a) => a.label === moment.label) ?? saved[0];
        if (anchor)
          await createHabit.mutateAsync({
            name: habit.name,
            color: habit.color,
            anchorId: anchor.id,
          });
      }
      if (withTodos)
        todos
          .map((x) => x.trim())
          .filter(Boolean)
          .forEach((title) => todoActions.add(title));
      router.replace({
        pathname: '/plans',
        params: { first: '1', then: '/my-day' },
      });
    } catch (e) {
      setError(messageFrom(e, t.failed));
      setBusy(false);
    }
  };

  const timeWheel = (which: 'wake' | 'bed') => {
    const value = which === 'wake' ? wake : bed;
    const set = which === 'wake' ? setWake : setBed;
    return (
      <View style={styles.wheel}>
        <Text style={styles.wheelLabel}>{which === 'wake' ? t.day.wake : t.day.bed}</Text>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            mode="time"
            display="spinner"
            themeVariant={theme}
            textColor={colors.text}
            minuteInterval={5}
            value={fromTimeString(value)}
            onChange={(_e, date) => date && set(toTimeString(date))}
            style={styles.picker}
          />
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setPicking(which)} style={styles.timeChip}>
            <Text style={styles.timeChipLabel}>{formatTime(value)}</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const pages = [
    {
      eyebrow: t.day.eyebrow,
      title: t.day.title,
      body: (
        <View style={styles.wheels}>
          {timeWheel('wake')}
          {timeWheel('bed')}
        </View>
      ),
    },
    {
      eyebrow: t.moments.eyebrow,
      title: t.moments.title,
      blurb: t.moments.blurb,
      body: (
        <View style={styles.chips}>
          {MOMENT_CHOICES.map((m) => {
            const on = picked.includes(m.key);
            return (
              <Pressable
                key={m.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => toggleMoment(m.key)}
                style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
              >
                <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{`${m.emoji} ${m.label}`}</Text>
              </Pressable>
            );
          })}
          {own.map((label, i) => (
            <TextInput
              key={i}
              autoFocus
              value={label}
              onChangeText={(text) => setOwn((now) => now.map((x, j) => (j === i ? text : x)))}
              placeholder={t.moments.ownPlaceholder}
              placeholderTextColor={colors.textFaint}
              style={[styles.chip, styles.chipInput]}
            />
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.moments.addOwn}
            onPress={() => setOwn((now) => [...now, ''])}
            style={({ pressed }) => [styles.chip, styles.chipAdd, pressed && styles.pressed]}
          >
            <PlusIcon size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      ),
    },
    {
      eyebrow: t.habit.eyebrow,
      title: t.habit.title,
      body: (
        <View style={styles.cards}>
          {HABIT_CHOICES.map((h) => {
            const on = h.id === habitId;
            const color = HABIT_COLOR[h.id] as string;
            return (
              <Pressable
                key={h.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setHabitId(h.id)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: on ? color : alpha(color, 0.28) },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.cardName}>{`${h.emoji} ${h.name}`}</Text>
                <Text style={styles.cardAfter}>{t.habit.after(momentFor(h.after, day).label)}</Text>
                <View style={[styles.check, !on && { opacity: 0 }]}>
                  <CheckIcon size={13} color={color} strokeWidth={3.2} />
                </View>
              </Pressable>
            );
          })}
          {habitId === 'own' ? (
            <TextInput
              autoFocus
              value={ownHabit}
              onChangeText={setOwnHabit}
              placeholder={t.habit.ownPlaceholder}
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />
          ) : (
            <TextButton label={`+ ${t.habit.writeOwn}`} onPress={() => setHabitId('own')} />
          )}
        </View>
      ),
    },
    {
      eyebrow: t.calendar.eyebrow,
      title: t.calendar.title,
      blurb: t.calendar.blurb,
      body: (
        <View style={styles.gap}>
          <ToggleRow
            label={`📅 ${t.calendar.toggle}`}
            value={calendarOn}
            onValueChange={(on) => void toggleCalendar(on)}
          />
          {denied && <Text style={styles.hint}>{t.calendar.denied}</Text>}
        </View>
      ),
      secondary: { label: t.calendar.notNow, onPress: () => setPage(4) },
    },
    {
      eyebrow: t.todos.eyebrow,
      title: t.todos.title,
      blurb: t.todos.blurb,
      body: (
        <View style={styles.gap}>
          {todos.map((todo, i) => (
            <View key={i} style={styles.todoRow}>
              <View style={styles.box} />
              <TextInput
                autoFocus={i > 0}
                value={todo}
                onChangeText={(text) => setTodos((now) => now.map((x, j) => (j === i ? text : x)))}
                onSubmitEditing={() => todo.trim() && setTodos((now) => [...now, ''])}
                blurOnSubmit={false}
                returnKeyType="next"
                placeholder={t.todos.placeholder}
                placeholderTextColor={colors.textFaint}
                style={styles.todoInput}
              />
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={() => setTodos((now) => [...now, ''])} style={styles.todoRow}>
            <View style={[styles.box, styles.boxFaint]} />
            <Text style={styles.hint}>{t.todos.addAnother}</Text>
          </Pressable>
        </View>
      ),
      next: {
        label: busy ? t.saving : t.todos.build,
        onPress: () => void build(true),
      },
      secondary: { label: t.todos.skip, onPress: () => void build(false) },
    },
  ];
  const current = pages[page] as (typeof pages)[number] & {
    blurb?: string;
    next?: { label: string; onPress: () => void };
    secondary?: { label: string; onPress: () => void };
  };

  return (
    <View style={styles.root}>
      <Bleed color={habit?.color ?? habitColors[2]} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: 180,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <OnboardingHeader step={page + 1} total={PAGES} onBack={page > 0 ? () => setPage(page - 1) : undefined} />

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>{current.eyebrow}</Text>
          <Display size={44} line={40}>
            {current.title}
          </Display>
          {current.blurb && <Text style={styles.blurb}>{current.blurb}</Text>}
        </View>

        {current.body}

        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}

        <DayPreview day={day} habit={page >= 2 ? habit : undefined} events={calendarOn ? events : []} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <PrimaryButton
          label={current.next?.label ?? t.next}
          busy={busy}
          onPress={current.next?.onPress ?? (() => setPage(page + 1))}
        />
        {current.secondary && !busy && (
          <TextButton label={current.secondary.label} onPress={current.secondary.onPress} />
        )}
      </View>

      {picking && (
        <TimePickerSheet
          visible
          value={picking === 'wake' ? wake : bed}
          label={picking === 'wake' ? t.day.wake : t.day.bed}
          onChange={(value) => (picking === 'wake' ? setWake(value) : setBed(value))}
          onClose={() => setPicking(null)}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  ({
    root: { flex: 1, backgroundColor: colors.bg },
    intro: { gap: spacing.sm },
    gap: { gap: spacing.md },
    eyebrow: {
      fontFamily: fonts.bodyBold,
      fontSize: 12,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: colors.textFaint,
    },
    blurb: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 21,
      color: colors.textMuted,
    },
    wheels: { flexDirection: 'row', gap: spacing.sm },
    wheel: { flex: 1, alignItems: 'center', gap: 2 },
    wheelLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 12,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: colors.textFaint,
    },
    picker: { width: '100%', height: 150 },
    timeChip: {
      minHeight: 56,
      paddingHorizontal: 18,
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: alpha(colors.overlay, 0.1),
    },
    timeChipLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 22,
      color: colors.text,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 16,
      borderRadius: radii.chip,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: alpha(colors.overlay, 0.05),
    },
    chipOn: { backgroundColor: colors.text, borderColor: colors.text },
    chipLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    chipLabelOn: { color: colors.bg },
    chipInput: {
      minWidth: 150,
      color: colors.text,
      fontFamily: fonts.bodyBold,
      fontSize: 15,
    },
    chipAdd: {
      width: 44,
      paddingHorizontal: 0,
      alignItems: 'center',
      borderStyle: 'dashed',
    },
    cards: { gap: 10 },
    card: {
      minHeight: 64,
      padding: 14,
      borderRadius: radii.card,
      justifyContent: 'center',
      gap: 2,
    },
    cardName: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: '#FFFFFF',
      paddingRight: 36,
    },
    cardAfter: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: 'rgba(255,255,255,0.8)',
    },
    check: {
      position: 'absolute',
      right: 14,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    input: {
      minHeight: 52,
      paddingHorizontal: 16,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontFamily: fonts.bodyBold,
      fontSize: 16,
    },
    hint: { fontFamily: fonts.body, fontSize: 14, color: colors.textFaint },
    todoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 48,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    box: {
      width: 18,
      height: 18,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: colors.textMuted,
    },
    boxFaint: { borderColor: colors.textFaint, opacity: 0.6 },
    todoInput: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 16,
      color: colors.text,
      paddingVertical: 10,
    },
    footer: {
      position: 'absolute',
      left: spacing.xl,
      right: spacing.xl,
      bottom: 0,
      gap: 4,
    },
    error: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      lineHeight: 21,
      color: habitColors[1],
    },
    pressed: { opacity: 0.8 },
  }) as const;
