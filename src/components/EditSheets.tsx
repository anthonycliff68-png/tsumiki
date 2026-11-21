import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/Button';
import { DayPicker } from '@/components/DayPicker';
import { GlassSurface } from '@/components/GlassSurface';
import { copy } from '@/copy';
import type { Todo, TodayHabit, TodoPlace as When } from '@/lib/api';
import { useStyles, useTheme } from '@/lib/appearance';
import { dayChoices, guessEmoji } from '@/lib/dayLook';
import type { Anchor } from '@/lib/models';
import { formatTime } from '@/lib/times';
import { alpha, fonts, habitColors, spacing, type Palette } from '@/theme';

/** What the edit sheet hands back on Save. `when`'s time is "HH:MM"; the caller stores it its own way. */
export type ItemEdit = { title: string; when: When; minutes: number | null; color: string; days?: number[] };

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Tap "…" on My Day: one sheet for a habit or a to-do. A moment's is
 * MomentSheet. Nothing changes until Save; closing any other way drops it.
 */
export function ItemSheet(
  props: {
    anchors: Anchor[];
    /** The Save fill: the habit's colour (live) or the to-do's tint. */
    tint: string;
    busy?: boolean;
    error?: string | null;
    onSave: (edit: ItemEdit) => void;
    onDelete: () => void;
    onFocus?: () => void;
    onClose: () => void;
  } & ({ kind: 'habit'; habit: TodayHabit; onMore: () => void } | { kind: 'todo'; todo: Todo }),
) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const habit = props.kind === 'habit' ? props.habit : null;
  const was = props.kind === 'habit' ? props.habit.name : props.todo.title;
  const [title, setTitle] = useState(was);
  const [when, setWhen] = useState<When>(() => {
    if (props.kind === 'habit') {
      const h = props.habit;
      return h.mode === 'after' && h.anchorId ? { anchorId: h.anchorId } : h.mode === 'at' && h.time ? { at: h.time.slice(0, 5) } : 'any';
    }
    const t = props.todo;
    return t.anchorId ? { anchorId: t.anchorId } : t.at ? { at: t.at.slice(0, 5) } : 'any';
  });
  const [minutes, setMinutes] = useState(props.kind === 'habit' ? props.habit.minutes : props.todo.minutes);
  const [days, setDays] = useState(habit?.daysOfWeek ?? []);
  const [color, setColor] = useState(habit?.color ?? props.tint);
  const emoji = guessEmoji(title);

  const save = () => {
    if (habit && days.length === 0) return;
    props.onSave({ title: title.trim() || was, when, minutes, color, ...(habit ? { days } : {}) });
  };
  const askDelete = () =>
    Alert.alert(
      habit ? copy.myDay.edit.deleteHabitAsk : copy.myDay.edit.deleteTodoAsk,
      habit ? copy.myDay.edit.deleteHabitWhy : undefined,
      [
        { text: copy.myDay.edit.cancel, style: 'cancel' },
        { text: copy.myDay.edit.delete, style: 'destructive', onPress: props.onDelete },
      ],
    );

  return (
    <Sheet tint={color} onClose={props.onClose}>
      <View style={styles.nameRow}>
        <View style={styles.emojiBox}>
          <Text style={styles.emojiBig}>{emoji}</Text>
        </View>
        <TextInput
          accessibilityLabel={copy.myDay.edit.name}
          value={title}
          onChangeText={setTitle}
          selectionColor={colors.text}
          style={styles.name}
          maxLength={120}
        />
      </View>

      <Block title={copy.myDay.edit.when}>
        <WhenChips value={when} anchors={props.anchors} onChange={setWhen} />
      </Block>
      <Block title={copy.myDay.edit.howLong}>
        <LengthSpinner value={minutes} onChange={setMinutes} />
      </Block>

      {habit && (
        <>
          <Text style={styles.label}>{copy.myDay.edit.days}</Text>
          <DayPicker value={days} color={color} onChange={setDays} />

          <Text style={styles.label}>{copy.myDay.edit.colour}</Text>
          <View style={styles.swatches}>
            {dayChoices(color).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: color === option }}
                accessibilityLabel={copy.schedule.colourOption(option)}
                onPress={() => setColor(option)}
                style={[styles.swatch, { backgroundColor: option }, color === option && styles.swatchPicked]}
              />
            ))}
          </View>
        </>
      )}

      {props.error ? <Text style={styles.error}>{props.error}</Text> : null}
      {props.onFocus && <TextButton label={copy.focus.open} onPress={props.onFocus} />}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: !!props.busy }}
        disabled={props.busy}
        onPress={save}
        style={({ pressed }) => [styles.save, { backgroundColor: color }, (pressed || props.busy) && { opacity: 0.8 }]}
      >
        <Text style={styles.saveText}>{copy.myDay.edit.save}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={askDelete} style={styles.delete}>
        <Text style={styles.deleteText}>{habit ? copy.myDay.edit.deleteHabit : copy.myDay.edit.deleteTodo}</Text>
      </Pressable>
      {props.kind === 'habit' && <TextButton label={copy.myDay.edit.more} onPress={props.onMore} />}
    </Sheet>
  );
}

/** The dock's + → To-do: a title, when, how long. Lands on the day My Day is showing. */
export function AddTodoSheet({
  anchors,
  onSave,
  onClose,
}: {
  anchors: Anchor[];
  onSave: (title: string, when: When, minutes: number | null) => void;
  onClose: () => void;
}) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<When>('any');
  const [minutes, setMinutes] = useState<number | null>(null);
  const save = () => title.trim() && onSave(title.trim(), when, minutes);

  return (
    <Sheet tint={colors.textFaint} onClose={onClose}>
      <TextInput
        autoFocus
        accessibilityLabel={copy.myDay.addTodo}
        placeholder={copy.myDay.addTodo}
        placeholderTextColor={colors.textFaint}
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={save}
        returnKeyType="done"
        selectionColor={colors.text}
        style={styles.name}
        maxLength={120}
      />
      <Block title={copy.myDay.edit.when}>
        <WhenChips value={when} anchors={anchors} onChange={setWhen} />
      </Block>
      <Block title={copy.myDay.edit.howLong}>
        <LengthSpinner value={minutes} onChange={setMinutes} />
      </Block>
      <PrimaryButton label={copy.myDay.edit.save} disabled={!title.trim()} onPress={save} />
    </Sheet>
  );
}

/** A boxed part of the sheet with its own heading, so "What time" and "How long", both wheels, never run together. */
function Block({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * How long: hours and minutes in 5-minute steps. Opens on 15 when it has no
 * length, and stays without one unless it is spun.
 */
function LengthSpinner({ value, onChange }: { value: number | null; onChange: (minutes: number) => void }) {
  const colors = useTheme();
  // UIKit's countdown picker ignores its first value (the date lands before the
  // mode switch), so hand it over again a frame later: the second changes, the
  // picker takes the new date.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const m = value ?? 15;
  return (
    <DateTimePicker
      value={new Date(2026, 0, 1, Math.floor(m / 60), m % 60, ready ? 0 : 1)}
      mode="countdown"
      display="spinner"
      minuteInterval={5}
      themeVariant={colors.dark ? 'dark' : 'light'}
      textColor={colors.text}
      onChange={(_e, d) => d && onChange(Math.max(5, d.getHours() * 60 + d.getMinutes()))}
      style={{ height: 150 }}
    />
  );
}

/** Anytime, after one of the moments, or a set time (a spinner under the chips). Times are "HH:MM". */
function WhenChips({ value, anchors, onChange }: { value: When; anchors: Anchor[]; onChange: (when: When) => void }) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const at = value !== 'any' && 'at' in value ? value.at.slice(0, 5) : null;
  const nextHour = `${pad((new Date().getHours() + 1) % 24)}:00`;
  const chips: { key: string; label: string; when: When; on: boolean }[] = [
    { key: 'any', label: copy.myDay.edit.anytime, when: 'any', on: value === 'any' },
    ...[...anchors]
      .sort((a, b) => a.usual_time.localeCompare(b.usual_time))
      .map((a) => ({
        key: a.id,
        label: copy.myDay.edit.after(a.label),
        when: { anchorId: a.id },
        on: value !== 'any' && 'anchorId' in value && value.anchorId === a.id,
      })),
    {
      key: 'at',
      label: at ? copy.myDay.edit.at(formatTime(at)) : copy.myDay.edit.setTime,
      when: { at: at ?? nextHour },
      on: at !== null,
    },
  ];

  return (
    <>
      <View style={styles.chips}>
        {chips.map((c) => (
          <Pressable
            key={c.key}
            accessibilityRole="button"
            accessibilityState={{ selected: c.on }}
            onPress={() => onChange(c.when)}
            style={[styles.chip, c.on && styles.chipOn]}
          >
            <Text style={[styles.chipText, c.on && styles.chipTextOn]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
      {at && (
        <DateTimePicker
          value={new Date(2026, 0, 1, Number(at.slice(0, 2)), Number(at.slice(3, 5)))}
          mode="time"
          display="spinner"
          minuteInterval={5}
          themeVariant={colors.dark ? 'dark' : 'light'}
          textColor={colors.text}
          onChange={(_e, d) => d && onChange({ at: `${pad(d.getHours())}:${pad(d.getMinutes())}` })}
          style={{ height: 150 }}
        />
      )}
    </>
  );
}

function Sheet({ tint, onClose, children }: { tint: string; onClose: () => void; children: ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel={copy.schedule.dismiss}
        onPress={onClose}
      />
      <GlassSurface style={styles.sheet}>
        <View style={[styles.grabber, { backgroundColor: alpha(tint, 0.9) }]} />
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </GlassSurface>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  ({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: {
      maxHeight: '90%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingTop: spacing.sm,
    },
    grabber: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
    body: { padding: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl * 2, gap: spacing.md },
    nameRow: { flexDirection: 'row', gap: 10 },
    emojiBox: { width: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.raised },
    emojiBig: { fontSize: 24 },
    name: {
      flex: 1,
      fontFamily: fonts.bodyBold,
      fontSize: 20,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.raised,
    },
    label: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: colors.textFaint,
      marginTop: spacing.xs,
    },
    block: {
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: alpha(colors.overlay, 0.04),
    },
    blockTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingHorizontal: 14,
      height: 38,
      borderRadius: 19,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: alpha(colors.overlay, 0.05),
    },
    chipOn: { backgroundColor: colors.text, borderColor: colors.text },
    chipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
    chipTextOn: { color: colors.bg },
    swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: 'transparent' },
    swatchPicked: { borderColor: colors.text },
    save: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
    saveText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
    delete: { alignSelf: 'center', paddingVertical: 8 },
    deleteText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: habitColors[1] },
    error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: habitColors[1] },
  }) as const;
