import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton } from '@/components/Button';
import { DayPreview } from '@/components/DayPreview';
import { laterBy, MomentSheet, type MomentDraft } from '@/components/MomentSheet';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Display } from '@/components/Screen';
import { TimePickerSheet } from '@/components/TimePickerSheet';
import { copy } from '@/copy';
import { useCreateFirstHabit, useSaveRoutine, useAnchors, useTodoActions } from '@/lib/api';
import { useStyles, useTheme } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { useAccess } from '@/lib/access';
import { minutesOfDay } from '@/lib/dates';
import { hasAccess } from '@/lib/entitlement';
import { messageFrom } from '@/lib/errors';
import {
  buildDay,
  emojiFor,
  guessTime,
  HABIT_CHOICES,
  MOMENT_CHOICES,
  MOMENT_LIMIT,
  momentFor,
  ownTime,
  type DayMoment,
  type MomentEdit,
  type MomentKey,
  type SetupHabit,
  type SetupTodo,
} from '@/lib/onboardingDay';
import { FREE_HABITS, FREE_TODOS, showUpgrade } from '@/lib/pro';
import { formatTime } from '@/lib/times';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

const PAGES = 5;
const t = copy.onboarding.setup;

/** A colour each, the suggestions first and then anything written in. */
const colorAt = (i: number) => habitColors[i % habitColors.length] as string;
const HABIT_KEY = 'habit:';
const TODO_KEY = 'todo:';

/**
 * Setting up, one question a page: wake and bed, moments, habits, today's
 * to-dos, the calendar. Nothing is chosen for anybody. Every answer lives here
 * until "Build my day", which saves them all at once and hands over to the
 * plans. The calendar is Pro, so asking the phone for it waits until My Day,
 * for those who end up with Pro.
 */
export default function SetupScreen() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
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
  const [picked, setPicked] = useState<MomentKey[]>([]);
  const [own, setOwn] = useState<string[]>([]);
  const [edits, setEdits] = useState<Record<string, MomentEdit>>({});
  const [editing, setEditing] = useState<MomentDraft | null>(null);
  const [habits, setHabits] = useState<SetupHabit[]>([]);
  const [todos, setTodos] = useState<SetupTodo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const day = buildDay(wake, bed, picked, own, edits);
  const { access, loading } = useAccess();
  // Loading counts as Free here: a cap that lifts beats one that lands on five
  // and a half habits.
  const isPro = !loading && hasAccess(access);
  const habitsFull = !isPro && habits.length >= FREE_HABITS;
  const todosFull = !isPro && todos.length >= FREE_TODOS;
  const momentsFull = picked.length + own.filter((x) => x.trim()).length >= MOMENT_LIMIT;
  // Survives a failed save, so trying again does not make a second of each.
  const [made] = useState(() => new Set<string>());

  // Every chip and every row opens the same sheet, whether it is in the day yet
  // or not. Saving is what adds it, so Cancel leaves nothing behind.
  const openMoment = (m: DayMoment) =>
    setEditing({ id: m.key, label: m.label, usualTime: m.time, endsAt: m.endsAt ?? null, color: null });

  const openHabit = (h: SetupHabit) => {
    const time = h.at ?? momentFor(h.after, day).time;
    setEditing({
      id: `${HABIT_KEY}${h.id}`,
      label: h.name,
      usualTime: time,
      endsAt: h.minutes ? laterBy(time, h.minutes) : null,
      color: h.color,
    });
  };

  const openTodo = (todo: SetupTodo) => {
    const time = todo.at ?? '09:00';
    setEditing({
      id: `${TODO_KEY}${todo.id}`,
      label: todo.title,
      usualTime: time,
      endsAt: todo.minutes ? laterBy(time, todo.minutes) : null,
      color: null,
      noTime: !todo.at,
    });
  };

  const tapMoment = (choice: (typeof MOMENT_CHOICES)[number]) => {
    const there = day.find((m) => m.key === choice.key);
    if (there) return openMoment(there);
    if (!momentsFull) openMoment({ ...choice, time: guessTime(choice.key, wake, bed) });
  };

  /** A habit on its way in: one of the suggestions, or one being written. */
  const habitFor = (id: string): SetupHabit => {
    const i = HABIT_CHOICES.findIndex((c) => c.id === id);
    const choice = HABIT_CHOICES[i];
    if (choice) return { id, name: choice.name, emoji: choice.emoji, after: choice.after, color: colorAt(i) };
    const n = habits.filter((h) => h.id.startsWith('own')).length;
    return { id, name: '', emoji: '✨', after: 'wake', color: colorAt(HABIT_CHOICES.length + n) };
  };

  const tapHabit = (id: string) => {
    const chosen = habits.find((h) => h.id === id);
    if (chosen) return openHabit(chosen);
    if (habitsFull) return showUpgrade();
    openHabit(habitFor(id));
  };

  const editingKey = editing?.id ?? '';
  const editingHabit = editingKey.startsWith(HABIT_KEY);
  const editingTodo = editingKey.startsWith(TODO_KEY);
  const inDay = editingHabit
    ? habits.some((h) => h.id === editingKey.slice(HABIT_KEY.length))
    : editingTodo
      ? todos.some((x) => x.id === editingKey.slice(TODO_KEY.length))
      : day.some((m) => m.key === editingKey);

  const saveEditing = () => {
    if (!editing?.id) return;
    const { id: key, usualTime: time, endsAt } = editing;
    const name = editing.label.trim();
    const minutes = (endsAt && minutesOfDay(endsAt) - minutesOfDay(time)) || undefined;
    if (editingHabit) {
      const id = key.slice(HABIT_KEY.length);
      const old = habits.find((h) => h.id === id) ?? habitFor(id);
      if (name || old.name) {
        // Left on its moment's time it keeps following that moment.
        const saved = { ...old, name: name || old.name, at: time === momentFor(old.after, day).time ? undefined : time, minutes };
        setHabits((now) => (inDay ? now.map((h) => (h.id === id ? saved : h)) : [...now, saved]));
      }
      return setEditing(null);
    }
    if (editingTodo) {
      const id = key.slice(TODO_KEY.length);
      const old = todos.find((x) => x.id === id);
      if (name || old) {
        const saved: SetupTodo = {
          id,
          title: name || (old?.title ?? ''),
          ...(editing.noTime ? {} : { at: time, minutes }),
        };
        setTodos((now) => (old ? now.map((x) => (x.id === id ? saved : x)) : [...now, saved]));
      }
      return setEditing(null);
    }
    const label = name || day.find((m) => m.key === key)?.label;
    if (key.startsWith('own') && !label) return setEditing(null);
    // Wake and bed already have a home for their time; an own moment for its name.
    if (key === 'wake') setWake(time);
    else if (key === 'bed') setBed(time);
    if (key.startsWith('own') && label) {
      setOwn((now) => (inDay ? now.map((x, i) => (`own-${i}` === key ? label : x)) : [...now, label]));
    } else if (!inDay) {
      setPicked((now) => [...now, key as MomentKey]);
    }
    // Only what has no other home goes in edits, or it would outrank the chips later.
    const edit: MomentEdit = {};
    if (!key.startsWith('own')) edit.label = label;
    if (key !== 'wake' && key !== 'bed') {
      edit.time = time;
      edit.endsAt = endsAt;
    }
    setEdits((now) => ({ ...now, [key]: edit }));
    setEditing(null);
  };

  const removeEditing = () => {
    if (editingHabit) setHabits((now) => now.filter((h) => h.id !== editingKey.slice(HABIT_KEY.length)));
    else if (editingTodo) setTodos((now) => now.filter((x) => x.id !== editingKey.slice(TODO_KEY.length)));
    else {
      // An own moment is blanked rather than taken out: its key is its place in the list.
      if (editingKey.startsWith('own')) setOwn((now) => now.map((x, i) => (`own-${i}` === editingKey ? '' : x)));
      else setPicked((now) => now.filter((k) => k !== editingKey));
      setEdits(({ [editingKey]: _gone, ...rest }) => rest);
    }
    setEditing(null);
  };

  const build = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveRoutine.mutateAsync(
        day.map((m) => ({
          label: m.label,
          usualTime: m.time,
          endsAt: m.endsAt ?? null,
          isDefault: !m.key.startsWith('own'),
        })),
      );
      // The save returns only rows it added, so a retry reads the day back.
      const { data: saved = [] } = await anchors.refetch();
      for (const h of habits) {
        if (made.has(h.id)) continue;
        const moment = momentFor(h.after, day);
        const anchor = saved.find((a) => a.label === moment.label) ?? saved[0];
        if (!h.at && !anchor) continue;
        await createHabit.mutateAsync({
          name: h.name.trim(),
          color: h.color,
          ...(h.at ? { atTime: h.at } : { anchorId: anchor?.id }),
          ...(h.minutes ? { durationMinutes: h.minutes } : {}),
        });
        made.add(h.id);
      }
      todos.forEach((x) => todoActions.add(x.title, x.at ? { at: x.at } : 'any', x.minutes ?? null));
      router.replace({
        pathname: '/plans',
        params: { first: '1', then: '/my-day' },
      });
    } catch (e) {
      setError(messageFrom(e, t.failed));
      setBusy(false);
    }
  };

  // A chip and a sheet, not a wheel each: two iOS spinners do not fit side by
  // side on a phone, and the first one's AM/PM ends up under the second.
  const timeChip = (which: 'wake' | 'bed') => (
    <View style={styles.wheel}>
      <Text style={styles.wheelLabel}>{which === 'wake' ? t.day.wake : t.day.bed}</Text>
      <Pressable accessibilityRole="button" onPress={() => setPicking(which)} style={styles.timeChip}>
        <Text style={styles.timeChipLabel}>{formatTime(which === 'wake' ? wake : bed)}</Text>
      </Pressable>
    </View>
  );

  const pages = [
    {
      eyebrow: t.day.eyebrow,
      title: t.day.title,
      body: (
        <View style={styles.wheels}>
          {timeChip('wake')}
          {timeChip('bed')}
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
            const name = edits[m.key]?.label ?? m.label;
            return (
              <Pressable
                key={m.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => tapMoment(m)}
                style={({ pressed }) => [styles.chip, on && styles.chipOn, !on && momentsFull && styles.chipDim, pressed && styles.pressed]}
              >
                <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{`${name === m.label ? m.emoji : emojiFor(name)} ${name}`}</Text>
              </Pressable>
            );
          })}
          {day
            .filter((m) => m.key.startsWith('own'))
            .map((m) => (
              <Pressable
                key={m.key}
                accessibilityRole="button"
                accessibilityState={{ selected: true }}
                onPress={() => openMoment(m)}
                style={({ pressed }) => [styles.chip, styles.chipOn, pressed && styles.pressed]}
              >
                <Text style={[styles.chipLabel, styles.chipLabelOn]} numberOfLines={1}>{`${m.emoji} ${m.label}`}</Text>
              </Pressable>
            ))}
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              !momentsFull && openMoment({ key: `own-${own.length}`, label: '', emoji: '✨', time: ownTime(wake, bed) })
            }
            style={({ pressed }) => [styles.chip, styles.chipDashed, momentsFull && styles.chipDim, pressed && styles.pressed]}
          >
            <Text style={styles.chipLabel}>{`+ ${t.moments.addOwn}`}</Text>
          </Pressable>
        </View>
      ),
    },
    {
      eyebrow: t.habit.eyebrow,
      title: t.habit.title,
      size: 38,
      blurb: habitsFull ? t.habit.limit : t.habit.blurb,
      body: (
        <View style={styles.chips}>
          {HABIT_CHOICES.map((h) => {
            const chosen = habits.find((x) => x.id === h.id);
            return (
              <Pressable
                key={h.id}
                accessibilityRole="button"
                accessibilityState={{ selected: Boolean(chosen) }}
                onPress={() => tapHabit(h.id)}
                style={({ pressed }) => [
                  styles.chip,
                  chosen && { backgroundColor: chosen.color, borderColor: chosen.color },
                  !chosen && habitsFull && styles.chipDim,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipLabel, chosen && styles.chipLabelFilled]}>{`${h.emoji} ${chosen?.name ?? h.name}`}</Text>
              </Pressable>
            );
          })}
          {habits
            .filter((h) => h.id.startsWith('own'))
            .map((h) => (
              <Pressable
                key={h.id}
                accessibilityRole="button"
                accessibilityState={{ selected: true }}
                onPress={() => openHabit(h)}
                style={({ pressed }) => [styles.chip, { backgroundColor: h.color, borderColor: h.color }, pressed && styles.pressed]}
              >
                <Text style={[styles.chipLabel, styles.chipLabelFilled]} numberOfLines={1}>{`${h.emoji} ${h.name}`}</Text>
              </Pressable>
            ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => tapHabit(`own-${Date.now()}`)}
            style={({ pressed }) => [styles.chip, styles.chipDashed, habitsFull && styles.chipDim, pressed && styles.pressed]}
          >
            <Text style={styles.chipLabel}>{`+ ${t.habit.writeOwn}`}</Text>
          </Pressable>
        </View>
      ),
    },
    {
      eyebrow: t.todos.eyebrow,
      title: t.todos.title,
      blurb: todosFull ? t.todos.limit : t.todos.blurb,
      body: (
        <View style={styles.chips}>
          {todos.map((todo) => (
            <Pressable
              key={todo.id}
              accessibilityRole="button"
              accessibilityState={{ selected: true }}
              onPress={() => openTodo(todo)}
              style={({ pressed }) => [styles.chip, styles.chipOn, pressed && styles.pressed]}
            >
              <Text style={[styles.chipLabel, styles.chipLabelOn]} numberOfLines={1}>{todo.title}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => (todosFull ? showUpgrade() : openTodo({ id: String(Date.now()), title: '' }))}
            style={({ pressed }) => [styles.chip, styles.chipDashed, todosFull && styles.chipDim, pressed && styles.pressed]}
          >
            <Text style={styles.chipLabel}>{`+ ${t.todos.addAnother}`}</Text>
          </Pressable>
        </View>
      ),
    },
    {
      eyebrow: t.calendar.eyebrow,
      title: t.calendar.title,
      blurb: t.calendar.blurb,
      body: (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.calendar.add}. ${t.calendar.included}`}
          disabled={busy}
          onPress={() => void build()}
          style={({ pressed }) => [styles.calendar, pressed && styles.pressed]}
        >
          <Text style={styles.calendarEmoji}>📅</Text>
          <View style={styles.calendarWords}>
            <Text style={styles.calendarTitle}>{t.calendar.add}</Text>
            <Text style={styles.hint}>{t.calendar.included}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>{t.calendar.pro}</Text>
          </View>
        </Pressable>
      ),
      next: {
        label: busy ? t.saving : t.calendar.build,
        onPress: () => void build(),
      },
    },
  ];
  const current = pages[page] as (typeof pages)[number] & {
    blurb?: string;
    size?: number;
    next?: { label: string; onPress: () => void };
  };

  return (
    <View style={styles.root}>
      <Bleed color={habits[0]?.color ?? habitColors[2]} />

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
          <Display size={current.size ?? 44} line={(current.size ?? 44) - 4}>
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

        <DayPreview
          day={day}
          habits={habits}
          todos={todos}
          onEdit={openMoment}
          onEditHabit={openHabit}
          onEditTodo={openTodo}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {/* The day scrolls under the button, so it needs something to sit on. */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="setupFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.bg} stopOpacity="0" />
              <Stop offset="0.35" stopColor={colors.bg} stopOpacity="0.9" />
              <Stop offset="1" stopColor={colors.bg} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#setupFade)" />
        </Svg>
        <PrimaryButton
          label={current.next?.label ?? t.next}
          busy={busy}
          onPress={current.next?.onPress ?? (() => setPage(page + 1))}
        />
      </View>

      <MomentSheet
        basic
        noLength={editingKey === 'wake' || editingKey === 'bed'}
        timeOptional={editingTodo}
        placeholder={editingHabit ? t.habit.ownPlaceholder : editingTodo ? t.todos.placeholder : t.moments.ownPlaceholder}
        title={
          editingHabit
            ? inDay ? t.habit.edit : t.habit.add
            : editingTodo
              ? inDay ? t.todos.edit : t.todos.add
              : inDay ? copy.schedule.editMoment : copy.schedule.newMoment
        }
        onRemove={inDay && editingKey !== 'wake' && editingKey !== 'bed' ? removeEditing : undefined}
        draft={editing}
        stacked={0}
        busy={false}
        onChange={setEditing}
        onSave={saveEditing}
        onDelete={() => {}}
        onClose={() => setEditing(null)}
        error={null}
      />

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
    wheel: { flex: 1, gap: 6 },
    wheelLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 12,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: colors.textFaint,
    },
    timeChip: {
      minHeight: 64,
      alignItems: 'center',
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
    chipLabelFilled: { color: '#FFFFFF' },
    chipDim: { opacity: 0.4 },
    chipDashed: { borderStyle: 'dashed' },
    calendar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: alpha(colors.overlay, 0.05),
    },
    calendarEmoji: { fontSize: 24 },
    calendarWords: { flex: 1, gap: 2 },
    calendarTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
    pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.text },
    pillLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, color: colors.bg },
    hint: { fontFamily: fonts.body, fontSize: 14, color: colors.textFaint },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: spacing.xl,
      paddingHorizontal: spacing.xl,
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
