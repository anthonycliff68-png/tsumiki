import { StyleSheet, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { colors, fonts, radii } from '@/theme';

type Props = TextInputProps & {
  /** Read out by screen readers in place of a visible label. */
  label: string;
};

/** A single-line input on the dark ground. */
export function Field({ label, style, ...rest }: Props) {
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

const styles = StyleSheet.create({
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
});
