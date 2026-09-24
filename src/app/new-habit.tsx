import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { DayPicker } from '@/components/DayPicker';
import { PrimaryButton, TextButton } from '@/components/Button';
import { CheckIcon } from '@/components/icons';
import { TimePickerSheet } from '@/components/TimePickerSheet';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { describeDays, EVERY_DAY, formatTime, formatTimeShort } from '@/data/defaults';
import {
  useAnchors,
  useArchiveHabit,
  useCreateHabit,
  useHabitWithSchedule,
  useUpdateHabit,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ScheduleMode } from '@/lib/models';
import { alpha, display, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

/** Create a habit, or edit one when opened with ?id=. Artboard: NewHabitDark. */
export default function NewHabitScreen() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const { data: anchors = [] } = useAnchors(userId);
  const { data: existing } = useHabitWithSchedule(userId, id);
  const createHabit = useCreateHabit(userId);
  const updateHabit = useUpdateHabit(userId);
  const archiveHabit = useArchiveHabit(userId);

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(habitColors[0]);
  const [mode, setMode] = useState<ScheduleMode>('after');
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [atTime, setAtTime] = useState('18:00');
  const [days, setDays] = useState<number[]>(EVERY_DAY);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default the anchor to the first moment of the day.
  useEffect(() => {
    if (anchorId === null && anchors.length > 0) setAnchorId(anchors[0]?.id ?? null);
  }, [anchors, anchorId]);

  // Fill the form in when editing.
  useEffect(() => {
    if (!existing) return;
    setName(existing.habits.name);
    setColor(existing.habits.color);
    setMode(existing.mode);
    setAnchorId(existing.anchor_id);
    if (existing.at_time) setAtTime(existing.at_time.slice(0, 5));
    if (existing.days_of_week.length > 0) setDays(existing.days_of_week);
  }, [existing]);

  const anchorLabel = anchors.find((anchor) => anchor.id === anchorId)?.label ?? '';
  const shown = name.trim() || copy.newHabit.namePlaceholder;
  const preview =
    mode === 'after'
      ? copy.newHabit.previewAfter(anchorLabel || copy.newHabit.afterYou, shown)
      : mode === 'at'
        ? copy.newHabit.previewAt(formatTime(atTime), shown)
        : copy.newHabit.previewAny(shown);

  const busy = createHabit.isPending || updateHabit.isPending;

  const save = () => {
    setError(null);
    if (!name.trim()) return setError(copy.newHabit.needName);
    if (mode === 'after' && !anchorId) return setError(copy.newHabit.needAnchor);
    if (days.length === 0) return setError(copy.newHabit.needDay);

    const input = { name, color, mode, anchorId, atTime, daysOfWeek: days };
    const onDone = () => router.back();
    const onFail = (e: unknown) => setError(e instanceof Error ? e.message : copy.auth.genericError);

    if (isEdit && id) updateHabit.mutate({ habitId: id, ...input }, { onSuccess: onDone, onError: onFail });
    else createHabit.mutate(input, { onSuccess: onDone, onError: onFail });
  };

  return (
    <View style={styles.root}>
      <Bleed color={color} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, spacing.lg),
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.pill}>
            <Text style={styles.pillText}>{copy.newHabit.cancel}</Text>
          </Pressable>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{copy.newHabit.lands}</Text>
          </View>
        </View>

        <Text style={display(56, 50)}>{isEdit ? copy.newHabit.titleEdit : copy.newHabit.titleNew}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>{copy.newHabit.iWill}</Text>
          <TextInput
            accessibilityLabel={copy.newHabit.iWill}
            value={name}
            onChangeText={setName}
            placeholder={copy.newHabit.namePlaceholder}
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.text}
            style={[styles.nameInput, { borderColor: color }]}
            maxLength={40}
          />
          <View style={styles.previewRow}>
            <View style={[styles.previewDot, { backgroundColor: color }]} />
            <Text style={styles.preview}>
              {preview} · {describeDays(days).toLowerCase()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{copy.newHabit.when}</Text>
          <View style={styles.modes}>
            <ModeCard
              title={copy.newHabit.modeAfter}
              sub={copy.newHabit.modeAfterSub}
              active={mode === 'after'}
              color={color}
              onPress={() => setMode('after')}
            />
            <ModeCard
              title={copy.newHabit.modeAt}
              sub={copy.newHabit.modeAtSub}
              active={mode === 'at'}
              color={color}
              onPress={() => setMode('at')}
            />
            <ModeCard
              title={copy.newHabit.modeAny}
              sub={copy.newHabit.modeAnySub}
              active={mode === 'any'}
              color={color}
              onPress={() => setMode('any')}
            />
          </View>
        </View>

        {mode === 'after' && (
          <View style={styles.section}>
            <Text style={styles.label}>{copy.newHabit.afterYou}</Text>
            {anchors.length === 0 ? (
              <Text style={styles.hint}>{copy.newHabit.noAnchors}</Text>
            ) : (
              <View style={styles.chips}>
                {anchors.map((anchor) => {
                  const active = anchor.id === anchorId;
                  return (
                    <Pressable
                      key={anchor.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setAnchorId(anchor.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {anchor.label}
                      </Text>
                      <Text style={[styles.chipTime, active && styles.chipTextActive]}>
                        {formatTimeShort(anchor.usual_time)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {mode === 'at' && (
          <View style={styles.section}>
            <Text style={styles.label}>{copy.newHabit.atTime}</Text>
            <Pressable accessibilityRole="button" onPress={() => setPicking(true)} style={styles.timeButton}>
              <Text style={styles.timeText}>{formatTime(atTime)}</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>{copy.newHabit.whichDays}</Text>
          <DayPicker value={days} color={color} onChange={setDays} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{copy.newHabit.color}</Text>
          <View style={styles.swatches}>
            {habitColors.map((swatch) => (
              <Pressable
                key={swatch}
                accessibilityRole="button"
                accessibilityLabel={swatch}
                accessibilityState={{ selected: swatch === color }}
                onPress={() => setColor(swatch)}
                style={[
                  styles.swatch,
                  { backgroundColor: swatch },
                  swatch === color && styles.swatchActive,
                ]}
              >
                {swatch === color && <CheckIcon size={18} color={colors.white} strokeWidth={3} />}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{copy.newHabit.doItWith}</Text>
          <View style={styles.chips}>
            <View style={[styles.chip, styles.chipActive]}>
              <Text style={[styles.chipText, styles.chipTextActive]}>{copy.newHabit.solo}</Text>
            </View>
          </View>
          <Text style={styles.hint}>{copy.newHabit.crewsLater}</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <PrimaryButton
          label={isEdit ? copy.newHabit.saveEdit : copy.newHabit.save}
          busy={busy}
          onPress={save}
        />

        {isEdit && id && (
          <TextButton
            label={copy.newHabit.archive}
            onPress={() => archiveHabit.mutate(id, { onSuccess: () => router.back() })}
          />
        )}
      </ScrollView>

      <TimePickerSheet
        visible={picking}
        value={atTime}
        label={copy.newHabit.atTime}
        onChange={setAtTime}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}

function ModeCard({
  title,
  sub,
  active,
  color,
  onPress,
}: {
  title: string;
  sub: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  const colors = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.mode,
        active && { backgroundColor: alpha(color, 0.9), borderColor: color },
      ]}
    >
      <Text style={[styles.modeTitle, active && { color: colors.white }]}>{title}</Text>
      <Text style={[styles.modeSub, active && { color: 'rgba(255,255,255,0.8)' }]}>{sub}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  section: { gap: spacing.sm },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  nameInput: {
    minHeight: 58,
    paddingHorizontal: 16,
    borderRadius: radii.card,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    ...display(24, 28),
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  preview: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted },
  modes: { flexDirection: 'row', gap: spacing.sm },
  mode: {
    flex: 1,
    gap: 2,
    padding: 12,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modeTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  modeSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipActive: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  chipTime: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  chipTextActive: { color: colors.bg },
  timeButton: {
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  timeText: { ...display(28, 30) },
  swatches: { flexDirection: 'row', gap: spacing.md },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: { borderColor: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textFaint },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: habitColors[1] },
}) as const;
