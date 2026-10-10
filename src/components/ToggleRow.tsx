import { Switch, Text, View } from 'react-native';

import { useStyles, useTheme } from '@/lib/appearance';
import { alpha, fonts, radii, spacing, type Palette } from '@/theme';

type Props = {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

/**
 * A labelled switch with room for a line of explanation.
 *
 * The switch itself is the platform's, not a drawn one. It already handles the
 * drag as well as the tap, announces its state to VoiceOver, and follows
 * whatever the person has set for reduced motion — all of which a hand-rolled
 * one would have to be given, and would be given slightly wrong.
 */
export function ToggleRow({ label, hint, value, onValueChange, disabled }: Props) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {hint !== undefined && <Text style={styles.hint}>{hint}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityHint={hint}
        trackColor={{ false: alpha(colors.overlay, 0.18), true: colors.success }}
        thumbColor={colors.white}
        // iOS draws its own pale track behind trackColor.false; without this
        // the off state is a white pill on a dark screen, which reads as on.
        ios_backgroundColor={alpha(colors.overlay, 0.18)}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.05),
  },
  // Without a min-width of zero a flex child refuses to shrink below its
  // content, so a long hint pushes the switch off the side of the screen
  // instead of wrapping.
  text: { flex: 1, minWidth: 0, gap: 2 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textFaint },
}) as const;
