import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton, TextButton } from '@/components/Button';
import { MomentSheet, type MomentDraft } from '@/components/MomentSheet';
import { TimePickerSheet } from '@/components/TimePickerSheet';
import { useStyles } from '@/lib/appearance';
import { copy } from '@/copy';
import { formatTime } from '@/data/defaults';
import {
  useAnchorLoad,
  useAnchors,
  useCreateAnchor,
  useDeleteAnchor,
  useUpdateAnchor,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { minutesOfDay } from '@/lib/dates';
import type { Anchor } from '@/lib/models';
import { display, fonts, habitColors, momentColor, radii, spacing, type Palette } from '@/theme';



/**
 * The shape of your day: the moments habits stack onto, and the blocks that
 * take up real time. Reached from My Day.
 */
export default function ScheduleScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: anchors = [] } = useAnchors(userId);
  const { data: stacks = [] } = useAnchorLoad(userId);
  const createAnchor = useCreateAnchor(userId);
  const updateAnchor = useUpdateAnchor(userId);
  const deleteAnchor = useDeleteAnchor();

  const { id: openId } = useLocalSearchParams<{ id?: string }>();
  const [draft, setDraft] = useState<MomentDraft | null>(null);
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Opened from My Day by tapping a moment: start on that one.
  useEffect(() => {
    if (!openId || draft) return;
    const anchor = anchors.find((item) => item.id === openId);
    if (anchor) {
      setDraft({
        id: anchor.id,
        label: anchor.label,
        usualTime: anchor.usual_time.slice(0, 5),
        endsAt: anchor.ends_at ? anchor.ends_at.slice(0, 5) : null,
        color: anchor.color,
      });
    }
  }, [openId, anchors, draft]);

  const sorted = [...anchors].sort(
    (a, b) => minutesOfDay(a.usual_time) - minutesOfDay(b.usual_time),
  );

  const openNew = () =>
    setDraft({ id: null, label: '', usualTime: '09:00', endsAt: null, color: null });

  const openExisting = (anchor: Anchor) =>
    setDraft({
      id: anchor.id,
      label: anchor.label,
      usualTime: anchor.usual_time.slice(0, 5),
      endsAt: anchor.ends_at ? anchor.ends_at.slice(0, 5) : null,
      color: anchor.color,
    });

  const save = () => {
    if (!draft) return;
    setError(null);
    if (!draft.label.trim()) return setError(copy.schedule.needLabel);
    if (draft.endsAt && minutesOfDay(draft.endsAt) <= minutesOfDay(draft.usualTime)) {
      return setError(copy.schedule.needLaterEnd);
    }

    const input = {
      label: draft.label,
      usualTime: draft.usualTime,
      endsAt: draft.endsAt,
      color: draft.color,
    };
    const done = () => setDraft(null);
    if (draft.id) updateAnchor.mutate({ id: draft.id, ...input }, { onSuccess: done });
    else createAnchor.mutate(input, { onSuccess: done });
  };

  return (
    <View style={styles.root}>
      <Bleed color={habitColors[2]} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.pill}>
            <Text style={styles.pillText}>{copy.schedule.done}</Text>
          </Pressable>
        </View>

        <Text style={display(56, 50)}>{copy.schedule.title}</Text>
        <Text style={styles.blurb}>{copy.schedule.blurb}</Text>

        {sorted.length === 0 && <Text style={styles.blurb}>{copy.schedule.empty}</Text>}

        {sorted.map((anchor) => (
          <Pressable
            key={anchor.id}
            accessibilityRole="button"
            accessibilityLabel={anchor.label}
            onPress={() => openExisting(anchor)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: momentColor(anchor) }]}>
                {anchor.label}
              </Text>
              <Text style={styles.rowTime}>
                {anchor.ends_at
                  ? copy.schedule.range(formatTime(anchor.usual_time), formatTime(anchor.ends_at))
                  : formatTime(anchor.usual_time)}
              </Text>
            </View>
            {anchor.ends_at && <View style={styles.blockMark} />}
          </Pressable>
        ))}

        <TextButton label={`+ ${copy.schedule.add}`} onPress={openNew} />

      </ScrollView>

      <MomentSheet
        draft={draft}
        stacked={draft?.id ? (stacks.find((s) => s.anchorId === draft.id)?.count ?? 0) : 0}
        busy={createAnchor.isPending || updateAnchor.isPending || deleteAnchor.isPending}
        error={error}
        onChange={setDraft}
        onPickTime={setPicking}
        onSave={save}
        onDelete={() =>
          draft?.id
            ? deleteAnchor.mutate(draft.id, { onSuccess: () => setDraft(null) })
            : undefined
        }
        onClose={() => {
          setDraft(null);
          setError(null);
        }}
      />

      <TimePickerSheet
        visible={picking !== null}
        value={picking === 'end' ? (draft?.endsAt ?? '17:00') : (draft?.usualTime ?? '09:00')}
        label={picking === 'end' ? copy.schedule.ends : copy.schedule.starts}
        onChange={(value) => {
          if (!draft) return;
          setDraft(picking === 'end' ? { ...draft, endsAt: value } : { ...draft, usualTime: value });
        }}
        onClose={() => setPicking(null)}
      />
    </View>
  );
}

/** A sensible end when someone first says a moment lasts: an hour later. */
function shiftHour(time: string): string {
  const minutes = Math.min(23 * 60 + 59, minutesOfDay(time) + 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end' },
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
  blurb: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { ...display(19, 21) },
  rowTime: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint },
  blockMark: { width: 4, height: 28, borderRadius: 2, backgroundColor: colors.border },
  editor: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.bigCard,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  timesRow: { flexDirection: 'row', gap: spacing.md },
  timeCol: { flex: 1, gap: spacing.sm },
  timeButton: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  timeText: { ...display(22, 24) },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchText: { flex: 1, gap: 2 },
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.textFaint },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: habitColors[4] },
}) as const;
