import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/Button';
import { GlassSurface } from '@/components/GlassSurface';
import { Display } from '@/components/Screen';
import { copy } from '@/copy';
import { useStyles } from '@/lib/appearance';
import { useRemoveCrewMember } from '@/lib/api';
import { fonts, radii, spacing, type Palette } from '@/theme';

type Props = {
  visible: boolean;
  crewId: string;
  personId: string;
  personName: string;
  onClose: () => void;
  /** Called once they are out, so the screen behind can refresh its count. */
  onRemoved?: () => void;
};

/**
 * Take somebody out of a crew. The creator only.
 *
 * A confirmation rather than a swipe or a long press, because this is the one
 * action on the screen that affects somebody else's streak, and it is the kind
 * of thing people do while annoyed. Two taps and a sentence saying what
 * actually happens is the right amount of friction.
 *
 * The sentence matters: removing somebody is dated, not immediate. The
 * database sets left_on to tomorrow in *their* time zone, so today still
 * counts for them and the streak cannot be rescued by removing whoever just
 * broke it. The spot, though, frees up straight away. Saying "removed" and
 * leaving it there would have people expecting all three to happen at once.
 */
export function RemoveMemberSheet({
  visible,
  crewId,
  personId,
  personName,
  onClose,
  onRemoved,
}: Props) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const remove = useRemoveCrewMember();
  const [error, setError] = useState<string | null>(null);

  if (!visible) return null;

  const close = () => {
    setError(null);
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={close}>
      <Pressable
        style={styles.backdrop}
        onPress={close}
        accessibilityLabel={copy.crews.removeKeep}
      />
      <GlassSurface style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.grabber} />
        <Display size={26} line={26}>{copy.crews.removeTitle(personName)}</Display>
        <Text style={styles.body}>{copy.crews.removeBody}</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <PrimaryButton
          label={copy.crews.removeConfirm}
          busy={remove.isPending}
          onPress={() => {
            setError(null);
            remove.mutate(
              { crewId, userId: personId },
              {
                onSuccess: () => {
                  onRemoved?.();
                  close();
                },
                onError: () => setError(copy.crews.removeFailed),
              },
            );
          }}
        />
        <TextButton label={copy.crews.removeKeep} onPress={close} />
      </GlassSurface>
    </Modal>
  );
}

const makeStyles = (colors: Palette) => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: radii.bigCard,
    borderTopRightRadius: radii.bigCard,
    padding: spacing.lg,
    gap: spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 23,
    color: colors.textMuted,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
}) as const;
