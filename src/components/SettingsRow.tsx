import { Children, Fragment, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { ChevronRightIcon } from '@/components/icons';
import { PressGive } from '@/components/WaterPress';
import { useStyles, useTheme } from '@/lib/appearance';
import { alpha, fonts, habitColors, spacing, type Palette } from '@/theme';

type RowProps = {
  label: string;
  /** The current answer, shown on the right. Kept short — it is a summary, not
   *  the setting itself, and a long one squeezes the label it belongs to. */
  value?: string;
  onPress: () => void;
  destructive?: boolean;
};

/**
 * One line of a settings list: what it is, what it is set to, and a way in.
 *
 * The You tab used to put every setting's whole interface on the one screen —
 * theme chips, push status, the blocked list and a delete confirmation, all
 * stacked down a single scroll. Nothing was findable because everything was
 * visible at once. A row says only what the setting is and what it is set to,
 * and the detail lives where there is room for it.
 */
export function SettingsRow({ label, value, onPress, destructive }: RowProps) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  return (
    <PressGive
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      style={styles.row}
    >
      <Text style={[styles.label, destructive && { color: habitColors[1] }]} numberOfLines={1}>
        {label}
      </Text>
      {/* Pushed right by a margin rather than by the value's own width, so a
          row with nothing to report still puts its chevron at the edge instead
          of leaving it stuck to the label. */}
      <View style={styles.right}>
        {value !== undefined && (
          <Text style={styles.value} numberOfLines={1}>
            {value}
          </Text>
        )}
        <ChevronRightIcon size={18} color={destructive ? habitColors[1] : colors.textFaint} />
      </View>
    </PressGive>
  );
}

/**
 * The card a run of rows sits in, with a hairline between them.
 *
 * The separator is drawn here rather than by each row so the last one does not
 * carry a line to nothing — the usual way that list ends up with a stray rule
 * floating above its own bottom edge.
 */
export function SettingsGroup({ children }: { children: ReactNode }) {
  const styles = useStyles(makeStyles);
  const rows = Children.toArray(children);
  return (
    <View style={styles.group}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 && <View style={styles.divider} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  group: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.04),
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginLeft: spacing.lg,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  // Shrinks, so a long label loses characters rather than shoving the chevron
  // off the side of the screen.
  label: { flexShrink: 1, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: 'auto',
    paddingLeft: spacing.sm,
    flexShrink: 1,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textFaint,
  },
}) as const;
