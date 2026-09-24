import DateTimePicker from '@react-native-community/datetimepicker';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/Button';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { fromTimeString, toTimeString } from '@/data/defaults';
import { fonts, radii, spacing, type Palette } from '@/theme';

type Props = {
  visible: boolean;
  /** "HH:MM". */
  value: string;
  label: string;
  onChange: (value: string) => void;
  onClose: () => void;
};

/**
 * The time a moment usually happens. Android shows its own dialog, so the sheet
 * is only drawn on iOS.
 */
export function TimePickerSheet({ visible, value, label, onChange, onClose }: Props) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  if (!visible) return null;

  if (Platform.OS !== 'ios') {
    return (
      <DateTimePicker
        mode="time"
        value={fromTimeString(value)}
        onChange={(event, date) => {
          if (event.type === 'set' && date) onChange(toTimeString(date));
          onClose();
        }}
      />
    );
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} visible>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={copy.onboarding.routine.done} />
      <View style={styles.sheet}>
        <Text style={styles.title}>{label}</Text>
        <DateTimePicker
          mode="time"
          display="spinner"
          themeVariant="dark"
          textColor={colors.text}
          value={fromTimeString(value)}
          onChange={(_event, date) => {
            if (date) onChange(toTimeString(date));
          }}
        />
        <PrimaryButton label={copy.onboarding.routine.done} onPress={onClose} />
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    borderTopLeftRadius: radii.hero,
    borderTopRightRadius: radii.hero,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
}) as const;
