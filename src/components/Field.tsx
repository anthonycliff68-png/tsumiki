import { TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { useStyles, useTheme } from '@/lib/appearance';
import { fonts, radii, type Palette } from '@/theme';

type Props = TextInputProps & {
  /** Read out by screen readers in place of a visible label. */
  label: string;
};

/** A single-line input on the dark ground. */
export function Field({ label, style, ...rest }: Props) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  return (
    <View style={styles.wrap}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.text}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  wrap: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  input: {
    minHeight: 56,
    paddingHorizontal: 16,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
}) as const;
