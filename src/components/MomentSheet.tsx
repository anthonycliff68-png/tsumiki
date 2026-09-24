import { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/Button';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { formatTime } from '@/data/defaults';
import { minutesOfDay } from '@/lib/dates';
import { alpha, display, fonts, habitColors, momentColor, radii, spacing, type Palette } from '@/theme';

export type MomentDraft = {
  id: string | null;
  label: string;
  usualTime: string;
  endsAt: string | null;
  color: string | null;
};

type Props = {
  draft: MomentDraft | null;
  /** How many habits are stacked on this moment, for the delete warning. */
  stacked: number;
  busy: boolean;
  onChange: (draft: MomentDraft) => void;
  onPickTime: (which: 'start' | 'end') => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  error: string | null;
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
  busy,
  onChange,
  onPickTime,
  onSave,
  onDelete,
  onClose,
  error,
}: Props) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  if (draft === null) return null;

  const swatch = draft.color ?? momentColor({ label: draft.label, color: null });
  const lasts = draft.endsAt !== null;

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel={copy.schedule.dismiss}
        onPress={onClose}
      />

      <View style={styles.sheet}>
        <View style={[styles.grabber, { backgroundColor: alpha(swatch, 0.9) }]} />

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[display(30, 28), styles.title]}>
            {draft.id === null ? copy.schedule.newMoment : copy.schedule.editMoment}
          </Text>

          <Text style={styles.label}>{copy.schedule.label}</Text>
          <TextInput
            accessibilityLabel={copy.schedule.label}
            value={draft.label}
            onChangeText={(label) => onChange({ ...draft, label })}
            placeholder={copy.schedule.labelPlaceholder}
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.text}
            style={styles.input}
            maxLength={40}
            autoFocus={draft.id === null}
          />

          <View style={styles.times}>
            <View style={styles.timeCol}>
              <Text style={styles.label}>{copy.schedule.starts}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${copy.schedule.starts}, ${formatTime(draft.usualTime)}`}
                onPress={() => onPickTime('start')}
                style={styles.timeButton}
              >
                <Text style={styles.timeText}>{formatTime(draft.usualTime)}</Text>
              </Pressable>
            </View>

            {lasts && (
              <View style={styles.timeCol}>
                <Text style={styles.label}>{copy.schedule.ends}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${copy.schedule.ends}, ${formatTime(draft.endsAt as string)}`}
                  onPress={() => onPickTime('end')}
                  style={styles.timeButton}
                >
                  <Text style={styles.timeText}>{formatTime(draft.endsAt as string)}</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.rowLabel}>{copy.schedule.lasts}</Text>
              <Text style={styles.hint}>{copy.schedule.lastsHint}</Text>
            </View>
            <Switch
              accessibilityLabel={copy.schedule.lasts}
              value={lasts}
              onValueChange={(on) =>
                onChange({ ...draft, endsAt: on ? laterBy(draft.usualTime, 60) : null })
              }
              trackColor={{ true: swatch, false: colors.border }}
            />
          </View>

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

          {error !== null && <Text style={styles.error}>{error}</Text>}

          <PrimaryButton label={copy.schedule.save} busy={busy} onPress={onSave} />
          <TextButton label={copy.newHabit.cancel} onPress={onClose} />

          {draft.id !== null &&
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
      </View>
    </Modal>
  );
}

/** A sensible end when someone first says a moment lasts: an hour later. */
function laterBy(time: string, minutes: number): string {
  const total = Math.min(23 * 60 + 59, minutesOfDay(time) + minutes);
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return `${h}:${m}`;
}

const makeStyles = (colors: Palette) => ({
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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchText: { flex: 1 },
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
