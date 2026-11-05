import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/Button';
import { LengthChips } from '@/components/LengthChips';
import { TimePickerSheet } from '@/components/TimePickerSheet';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { formatTime } from '@/data/defaults';
import { minutesOfDay } from '@/lib/dates';
import { alpha, display, fonts, habitColors, momentColor, radii, spacing, type Palette } from '@/theme';
import { GlassSurface } from '@/components/GlassSurface';

export type MomentDraft = {
  id: string | null;
  label: string;
  usualTime: string;
  endsAt: string | null;
  color: string | null;
  /** Only with `timeOptional`: not at any time in particular. */
  noTime?: boolean;
};

type Props = {
  draft: MomentDraft | null;
  /** How many habits are stacked on this moment, for the delete warning. */
  stacked: number;
  /** The habits stacked on it, listed when it's opened from My Day. */
  stackedNames?: string[];
  busy: boolean;
  onChange: (draft: MomentDraft) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  error: string | null;
  /** Setting up, before there is anything to colour or delete. */
  basic?: boolean;
  /** Wake up and Bed are points in the day, not stretches of it. */
  noLength?: boolean;
  /** In place of "Edit moment", when this is being used for something else. */
  title?: string;
  /** Setting up: takes it back out, with no question asked. */
  onRemove?: () => void;
  /** Offers "any time" beside the time, for what doesn't need one. */
  timeOptional?: boolean;
  placeholder?: string;
};

/**
 * Editing one moment of the routine, over the top of the list.
 *
 * It is a sheet rather than a panel in the page because the panel version sat
 * below the whole list and the add button — you tapped a moment, nothing
 * appeared to happen, and the save button was off the bottom of the screen.
 */
export function MomentSheet({
  draft,
  stacked,
  stackedNames = [],
  busy,
  onChange,
  onSave,
  onDelete,
  onClose,
  error,
  basic = false,
  noLength = false,
  title,
  onRemove,
  timeOptional = false,
  placeholder,
}: Props) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  /**
   * Which time is being picked, owned here rather than by the screen.
   *
   * It used to live a level up and render its own Modal as a sibling of this
   * one. Two sibling modals on iOS means the second is presented behind the
   * first, so tapping a time appeared to do nothing at all. Nested inside
   * this Modal it comes up over the sheet, which is where it belongs.
   */
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);
  if (draft === null) return null;

  const swatch = draft.color ?? momentColor({ label: draft.label, color: null });
  const length = draft.endsAt ? minutesOfDay(draft.endsAt) - minutesOfDay(draft.usualTime) : null;

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.avoid}>
      <Pressable
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel={copy.schedule.dismiss}
        onPress={onClose}
      />

      <GlassSurface style={styles.sheet}>
        <View style={[styles.grabber, { backgroundColor: alpha(swatch, 0.9) }]} />

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[display(30, 28), styles.title]}>
            {title ?? (draft.id === null ? copy.schedule.newMoment : copy.schedule.editMoment)}
          </Text>

          <Text style={styles.label}>{copy.schedule.label}</Text>
          <TextInput
            accessibilityLabel={copy.schedule.label}
            value={draft.label}
            onChangeText={(label) => onChange({ ...draft, label })}
            placeholder={placeholder ?? copy.schedule.labelPlaceholder}
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.text}
            style={styles.input}
            maxLength={40}
            autoFocus={draft.id === null || !draft.label}
          />

          {timeOptional ? (
            <>
              <Text style={styles.label}>{copy.schedule.starts}</Text>
              <View style={styles.times}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: Boolean(draft.noTime) }}
                  onPress={() => onChange({ ...draft, noTime: true, endsAt: null })}
                  style={[styles.timeButton, styles.timeCol, draft.noTime && styles.timeOn]}
                >
                  <Text style={[styles.timeText, draft.noTime && styles.timeTextOn]}>{copy.onboarding.setup.todos.anyTime}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: !draft.noTime }}
                  accessibilityLabel={`${copy.schedule.starts}, ${formatTime(draft.usualTime)}`}
                  onPress={() => {
                    onChange({ ...draft, noTime: false });
                    setPicking('start');
                  }}
                  style={[styles.timeButton, styles.timeCol, !draft.noTime && styles.timeOn]}
                >
                  <Text style={[styles.timeText, !draft.noTime && styles.timeTextOn]}>{formatTime(draft.usualTime)}</Text>
                </Pressable>
              </View>
            </>
          ) : (
          <View style={styles.times}>
            <View style={styles.timeCol}>
              <Text style={styles.label}>{copy.schedule.starts}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${copy.schedule.starts}, ${formatTime(draft.usualTime)}`}
                onPress={() => setPicking('start')}
                style={styles.timeButton}
              >
                <Text style={styles.timeText}>{formatTime(draft.usualTime)}</Text>
              </Pressable>
            </View>

            {draft.endsAt !== null && !basic && (
              <View style={styles.timeCol}>
                <Text style={styles.label}>{copy.schedule.ends}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${copy.schedule.ends}, ${formatTime(draft.endsAt as string)}`}
                  onPress={() => setPicking('end')}
                  style={styles.timeButton}
                >
                  <Text style={styles.timeText}>{formatTime(draft.endsAt as string)}</Text>
                </Pressable>
              </View>
            )}
          </View>
          )}

          {!noLength && !draft.noTime && (
            <>
              <Text style={styles.label}>{copy.myDay.edit.howLong}</Text>
              <LengthChips
                value={length}
                onChange={(m) => onChange({ ...draft, endsAt: m === null ? null : laterBy(draft.usualTime, m) })}
              />
            </>
          )}

          {!basic && (
            <>
          <Text style={styles.label}>{copy.schedule.colour}</Text>
          <View style={styles.swatches}>
            {habitColors.map((option) => {
              const picked = swatch === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: picked }}
                  accessibilityLabel={copy.schedule.colourOption(option)}
                  onPress={() => onChange({ ...draft, color: option })}
                  style={[
                    styles.swatch,
                    { backgroundColor: option },
                    picked && styles.swatchPicked,
                  ]}
                />
              );
            })}
          </View>
            </>
          )}

          {stackedNames.length > 0 && (
            <>
              <Text style={styles.label}>{copy.myDay.edit.stacked}</Text>
              <Text style={styles.rowLabel}>{stackedNames.join(', ')}</Text>
            </>
          )}

          {error !== null && <Text style={styles.error}>{error}</Text>}

          <PrimaryButton label={copy.schedule.save} busy={busy} onPress={onSave} />
          <TextButton label={copy.newHabit.cancel} onPress={onClose} />
          {onRemove && <TextButton label={copy.onboarding.setup.remove} onPress={onRemove} />}

          {draft.id !== null && !basic &&
            (confirmingDelete ? (
              <View style={styles.danger}>
                <Text style={styles.dangerTitle}>{copy.schedule.deleteTitle(draft.label)}</Text>
                <Text style={styles.hint}>
                  {stacked === 0
                    ? copy.schedule.deleteEmpty
                    : copy.schedule.deleteMoves(stacked)}
                </Text>
                <PrimaryButton label={copy.schedule.deleteConfirm} busy={busy} onPress={onDelete} />
                <TextButton
                  label={copy.newHabit.cancel}
                  onPress={() => setConfirmingDelete(false)}
                />
              </View>
            ) : (
              <TextButton label={copy.schedule.delete} onPress={() => setConfirmingDelete(true)} />
            ))}
        </ScrollView>

        <TimePickerSheet
          visible={picking !== null}
          value={picking === 'end' ? (draft.endsAt ?? '17:00') : draft.usualTime}
          label={picking === 'end' ? copy.schedule.ends : copy.schedule.starts}
          onChange={(value) =>
            onChange(
              picking === 'end'
                ? { ...draft, endsAt: value }
                // Moving the start moves the whole stretch, so its length survives.
                : { ...draft, usualTime: value, endsAt: length === null ? null : laterBy(value, length) },
            )
          }
          onClose={() => setPicking(null)}
        />
      </GlassSurface>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** The end of a stretch this long, kept inside the day the database insists on. */
export function laterBy(time: string, minutes: number): string {
  const total = Math.min(23 * 60 + 59, minutesOfDay(time) + minutes);
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return `${h}:${m}`;
}

const makeStyles = (colors: Palette) => ({
  avoid: { flex: 1 },
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
  grabber: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  body: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.md },
  title: { color: colors.text },
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
  times: { flexDirection: 'row', gap: spacing.md },
  timeCol: { flex: 1, gap: spacing.sm },
  timeButton: {
    minHeight: 56,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.05),
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  timeText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  timeOn: { backgroundColor: colors.text, borderColor: colors.text },
  timeTextOn: { color: colors.bg },
  rowLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint, lineHeight: 18 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchPicked: { borderColor: colors.text },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: habitColors[1] },
  danger: {
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: spacing.lg,
  },
  dangerTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
}) as const;
