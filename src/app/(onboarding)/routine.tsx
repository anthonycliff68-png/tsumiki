import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton } from '@/components/Button';
import { ArrowRightIcon, PlusIcon } from '@/components/icons';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { TimePickerSheet } from '@/components/TimePickerSheet';
import { copy } from '@/copy';
import { DEFAULT_ANCHORS, EXTRA_ANCHORS, formatTimeShort } from '@/data/defaults';
import { useSaveRoutine } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, display, fonts, habitColors, radii, spacing } from '@/theme';

type Row = {
  id: string;
  label: string;
  usualTime: string;
  isDefault: boolean;
  /** Custom rows start empty and get a text field instead of a label. */
  isCustom: boolean;
};

const initialRows = (): Row[] =>
  DEFAULT_ANCHORS.map((anchor) => ({
    id: anchor.key,
    label: anchor.label,
    usualTime: anchor.usualTime,
    isDefault: true,
    isCustom: false,
  }));

/** Step 1. Artboard: OnbRoutine. Writes the anchors every habit stacks onto. */
export default function RoutineScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const saveRoutine = useSaveRoutine(session?.user.id);

  const [rows, setRows] = useState<Row[]>(initialRows);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const used = new Set(rows.map((row) => row.id));
  const extras = EXTRA_ANCHORS.filter((anchor) => !used.has(anchor.key));

  const setTime = (id: string, usualTime: string) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, usualTime } : row)));

  const setLabel = (id: string, label: string) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, label } : row)));

  const addExtra = (key: string, label: string, usualTime: string) =>
    setRows((current) =>
      [...current, { id: key, label, usualTime, isDefault: false, isCustom: false }].sort((a, b) =>
        a.usualTime.localeCompare(b.usualTime),
      ),
    );

  const addCustom = () =>
    setRows((current) => [
      ...current,
      {
        id: `custom-${Date.now()}`,
        label: '',
        usualTime: '12:00',
        isDefault: false,
        isCustom: true,
      },
    ]);

  const save = async (then: () => void) => {
    setError(null);
    const payload = rows
      .filter((row) => row.label.trim().length > 0)
      .map((row) => ({
        label: row.label.trim(),
        usualTime: row.usualTime,
        isDefault: row.isDefault,
      }));
    try {
      await saveRoutine.mutateAsync(payload);
      then();
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.onboarding.routine.failed);
    }
  };

  const editingRow = rows.find((row) => row.id === editing);

  return (
    <View style={styles.root}>
      <Bleed color={habitColors[2]} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: 120,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <OnboardingHeader step={1} onBack={() => router.back()} onSkip={() => void save(() => router.replace('/'))} />

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>{copy.onboarding.routine.eyebrow}</Text>
          <Text style={display(48, 42)}>{copy.onboarding.routine.title}</Text>
          <Text style={styles.blurb}>{copy.onboarding.routine.blurb}</Text>
        </View>

        <View style={styles.rows}>
          {rows.map((row) => (
            <View key={row.id} style={styles.row}>
              {row.isCustom ? (
                <TextInput
                  accessibilityLabel={copy.onboarding.routine.ownPlaceholder}
                  placeholder={copy.onboarding.routine.ownPlaceholder}
                  placeholderTextColor={colors.textFaint}
                  value={row.label}
                  onChangeText={(text) => setLabel(row.id, text)}
                  style={styles.rowLabelInput}
                  autoFocus
                />
              ) : (
                <Text style={styles.rowLabel}>{row.label}</Text>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.onboarding.routine.timeLabel(row.label)}
                onPress={() => setEditing(row.id)}
                style={({ pressed }) => [styles.timeButton, pressed && styles.pressed]}
              >
                <Text style={styles.timeLabel}>{formatTimeShort(row.usualTime)}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.chips}>
          {extras.map((anchor) => (
            <Pressable
              key={anchor.key}
              accessibilityRole="button"
              accessibilityLabel={anchor.label}
              onPress={() => addExtra(anchor.key, anchor.label, anchor.usualTime)}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <PlusIcon size={14} color={colors.textMuted} />
              <Text style={styles.chipLabel}>{anchor.label}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.onboarding.routine.addOwn}
            onPress={addCustom}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            <PlusIcon size={14} color={colors.textMuted} />
            <Text style={styles.chipLabel}>{copy.onboarding.routine.addOwn}</Text>
          </Pressable>
        </View>

        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
        <PrimaryButton
          label={saveRoutine.isPending ? copy.onboarding.routine.saving : copy.onboarding.routine.next}
          busy={saveRoutine.isPending}
          onPress={() => void save(() => router.push('/habit'))}
          icon={<ArrowRightIcon size={20} color={colors.bg} />}
        />
      </View>

      {editingRow && (
        <TimePickerSheet
          visible
          value={editingRow.usualTime}
          label={editingRow.label || copy.onboarding.routine.pickTime}
          onChange={(value) => setTime(editingRow.id, value)}
          onClose={() => setEditing(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  rows: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: radii.card,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowLabel: {
    flexGrow: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.text,
  },
  rowLabelInput: {
    flexGrow: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 8,
  },
  timeButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  timeLabel: {
    ...display(20, 24),
    color: colors.white,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chipLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  footer: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 0,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 21,
    color: habitColors[1],
  },
  pressed: { opacity: 0.75 },
});
