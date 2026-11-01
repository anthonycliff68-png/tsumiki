import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/Button';
import { DayPicker } from '@/components/DayPicker';
import { GlassSurface } from '@/components/GlassSurface';
import { copy } from '@/copy';
import type { Todo, TodayHabit, TodoPlace as When } from '@/lib/api';
import { useStyles, useTheme } from '@/lib/appearance';
import type { Anchor } from '@/lib/models';
import { formatTime } from '@/lib/times';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

/**
 * Tap-to-edit for My Day: a habit's sheet and a to-do's. A moment's is
 * MomentSheet. Both are quick edits; the full habit form is one tap further.
 */
export function HabitSheet({
  habit,
  anchors,
  busy,
  error,
  onSave,
  onMore,
  onClose,
}: {
  habit: TodayHabit;
  anchors: Anchor[];
  busy: boolean;
  error: string | null;
  onSave: (edit: { when: When; days: number[]; color: string }) => void;
  onMore: () => void;
  onClose: () => void;
}) {
  const styles = useStyles(makeStyles);
  const [when, setWhen] = useState<When>(
    habit.mode === 'after' && habit.anchorId
      ? { anchorId: habit.anchorId }
      : habit.mode === 'at' && habit.time
        ? { at: habit.time }
        : 'any',
  );
  const [days, setDays] = useState(habit.daysOfWeek);
  const [color, setColor] = useState(habit.color);

  return (
    <Sheet title={habit.name} kind={copy.myDay.edit.habit} tint={color} onClose={onClose}>
      <Text style={styles.label}>{copy.myDay.edit.when}</Text>
      <WhenChips value={when} anchors={anchors} keepAt={habit.mode === 'at' ? habit.time : null} onChange={setWhen} />

      <Text style={styles.label}>{copy.myDay.edit.days}</Text>
      <DayPicker value={days} color={color} onChange={setDays} />

      <Text style={styles.label}>{copy.myDay.edit.colour}</Text>
      <View style={styles.swatches}>
        {habitColors.map((option) => (
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

      {error !== null && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton
        label={copy.myDay.edit.done}
        busy={busy}
        onPress={() => (days.length === 0 ? undefined : onSave({ when, days, color }))}
      />
      <TextButton label={copy.myDay.edit.more} onPress={onMore} />
    </Sheet>
  );
}

export function TodoSheet({
  todo,
  anchors,
  onSave,
  onDelete,
  onClose,
}: {
  todo: Todo;
  anchors: Anchor[];
  onSave: (edit: { title: string; when: When }) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const [title, setTitle] = useState(todo.title);
  const [when, setWhen] = useState<When>(
    todo.anchorId ? { anchorId: todo.anchorId } : todo.at ? { at: todo.at } : 'any',
  );

  return (
    <Sheet title={todo.title} kind={copy.myDay.edit.todo} tint={colors.textFaint} onClose={onClose}>
      <Text style={styles.label}>{copy.myDay.edit.text}</Text>
      <TextInput
        accessibilityLabel={copy.myDay.edit.text}
        value={title}
        onChangeText={setTitle}
        selectionColor={colors.text}
        style={styles.input}
        maxLength={120}
      />

      <Text style={styles.label}>{copy.myDay.edit.when}</Text>
      <WhenChips value={when} anchors={anchors} keepAt={todo.at} onChange={setWhen} />

      <PrimaryButton
        label={copy.myDay.edit.done}
        onPress={() => (title.trim() ? onSave({ title: title.trim(), when }) : onDelete())}
      />
      <TextButton label={copy.myDay.edit.deleteTodo} onPress={onDelete} />
    </Sheet>
  );
}

/**
 * After one of the moments, or Anytime. A set hour isn't offered as a new
 * choice — dragging does that — but one it already has stays on the list.
 */
function WhenChips({
  value,
  anchors,
  keepAt,
  onChange,
}: {
  value: When;
  anchors: Anchor[];
  keepAt: string | null;
  onChange: (when: When) => void;
}) {
  const styles = useStyles(makeStyles);
  const chips: { key: string; label: string; when: When }[] = [
    ...[...anchors]
      .sort((a, b) => a.usual_time.localeCompare(b.usual_time))
      .map((a) => ({ key: a.id, label: copy.myDay.edit.after(a.label), when: { anchorId: a.id } })),
    ...(keepAt ? [{ key: 'at', label: copy.myDay.edit.at(formatTime(keepAt)), when: { at: keepAt } }] : []),
    { key: 'any', label: copy.myDay.edit.anytime, when: 'any' as const },
  ];
  const picked = (w: When) =>
    w === 'any' || value === 'any'
      ? w === value
      : 'anchorId' in w
        ? 'anchorId' in value && value.anchorId === w.anchorId
        : 'at' in value;

  return (
    <View style={styles.chips}>
      {chips.map((c) => (
        <Pressable
          key={c.key}
          accessibilityRole="button"
          accessibilityState={{ selected: picked(c.when) }}
          onPress={() => onChange(c.when)}
          style={[styles.chip, picked(c.when) && styles.chipOn]}
        >
          <Text style={[styles.chipText, picked(c.when) && styles.chipTextOn]}>{c.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Sheet({
  title,
  kind,
  tint,
  onClose,
  children,
}: {
  title: string;
  kind: string;
  tint: string;
  onClose: () => void;
  children: ReactNode;
}) {
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
          <Text style={styles.title} numberOfLines={2}>
            {title} <Text style={styles.kind}>· {kind}</Text>
          </Text>
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
      maxHeight: '86%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingTop: spacing.sm,
    },
    grabber: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
    body: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.md },
    title: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.text },
    kind: { fontFamily: fonts.body, fontSize: 14, color: colors.textFaint },
    label: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: colors.textFaint,
    },
    input: {
      minHeight: 56,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: alpha(colors.overlay, 0.05),
      paddingHorizontal: 16,
      fontFamily: fonts.body,
      fontSize: 16,
      color: colors.text,
    },
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
    swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'transparent' },
    swatchPicked: { borderColor: colors.text },
    error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: habitColors[1] },
  }) as const;
