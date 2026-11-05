import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { copy } from '@/copy';
import { useStyles } from '@/lib/appearance';
import { formatLength } from '@/lib/timeline';
import { alpha, fonts, spacing, type Palette } from '@/theme';

const MAIN = [15, 30, 60];
const CUSTOM_START = 45;
// The database allows a day; a day less five minutes is as far as the steps land.
const LONGEST = 23 * 60 + 55;

/**
 * How long something takes. None is a real answer, and the usual one.
 *
 * Custom is steppers rather than iOS's duration wheel: the picker library never
 * sets that wheel's starting value, so it opens on 5 min whatever the length is.
 */
export function LengthChips({ value, onChange }: { value: number | null; onChange: (minutes: number | null) => void }) {
  const styles = useStyles(makeStyles);
  const unusual = value !== null && !MAIN.includes(value);
  const [open, setOpen] = useState(unusual);
  const total = value ?? 0;

  const chip = (key: string, label: string, on: boolean, press: () => void) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={press}
      style={[styles.chip, on && styles.chipOn]}
    >
      <Text numberOfLines={1} style={[styles.label, on && styles.labelOn]}>
        {label}
      </Text>
    </Pressable>
  );

  const step = (minutes: number) => {
    const next = Math.min(LONGEST, total + minutes);
    onChange(next > 0 ? next : null);
  };

  const stepper = (shown: string, unit: string, by: number) => (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.myDay.edit.lessTime(unit)}
        disabled={total < by}
        onPress={() => step(-by)}
        style={({ pressed }) => [styles.stepButton, total < by && styles.off, pressed && styles.off]}
      >
        <Text style={styles.stepSign}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{shown}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.myDay.edit.moreTime(unit)}
        onPress={() => step(by)}
        style={({ pressed }) => [styles.stepButton, pressed && styles.off]}
      >
        <Text style={styles.stepSign}>+</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {chip('none', copy.myDay.edit.noLength, value === null, () => {
          onChange(null);
          setOpen(false);
        })}
        {MAIN.map((m) => chip(String(m), formatLength(m), value === m, () => onChange(m)))}
        {chip('custom', unusual ? formatLength(value) : copy.myDay.edit.customLength, unusual, () => {
          if (!open && value === null) onChange(CUSTOM_START);
          setOpen(!open);
        })}
      </View>
      {open && (
        <View style={styles.row}>
          {stepper(`${Math.floor(total / 60)}h`, copy.myDay.edit.hours, 60)}
          {stepper(`${total % 60}m`, copy.myDay.edit.minutes, 5)}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  ({
    root: { gap: spacing.sm },
    row: { flexDirection: 'row', gap: 6 },
    chip: {
      flex: 1,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: alpha(colors.overlay, 0.05),
    },
    chipOn: { backgroundColor: colors.text, borderColor: colors.text },
    label: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
    labelOn: { color: colors.bg },
    stepper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 4,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: alpha(colors.overlay, 0.1),
    },
    stepSign: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.text },
    stepValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, fontVariant: ['tabular-nums'] as ['tabular-nums'] },
    off: { opacity: 0.4 },
  }) as const;
