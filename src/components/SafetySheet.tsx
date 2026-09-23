import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/Button';
import { copy } from '@/copy';
import { useBlockUser, useReport } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Enums } from '@/lib/database.types';
import { colors, display, fonts, habitColors, radii, spacing } from '@/theme';

type Props = {
  visible: boolean;
  /** What is being reported, and who wrote it. */
  kind: Enums<'report_kind'>;
  refId?: string | null;
  personId: string;
  personName: string;
  onClose: () => void;
  /** Called after a block, so the screen behind can get out of the way. */
  onBlocked?: () => void;
};

/**
 * Report a message or block the person who sent it. Reachable from anything
 * carrying words someone else wrote.
 */
export function SafetySheet({
  visible,
  kind,
  refId,
  personId,
  personName,
  onClose,
  onBlocked,
}: Props) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const report = useReport(session?.user.id);
  const block = useBlockUser(session?.user.id);

  const [mode, setMode] = useState<'choose' | 'report' | 'block' | 'done'>('choose');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!visible) return null;

  const close = () => {
    setMode('choose');
    setReason('');
    setError(null);
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={copy.safety.cancel} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.grabber} />

        {mode === 'choose' && (
          <>
            <Text style={display(26, 26)}>{copy.safety.reportTitle}</Text>
            <PrimaryButton label={copy.safety.report} onPress={() => setMode('report')} />
            <TextButton
              label={copy.safety.blockName(personName)}
              onPress={() => setMode('block')}
            />
            <TextButton label={copy.safety.cancel} onPress={close} />
          </>
        )}

        {mode === 'report' && (
          <>
            <Text style={display(26, 26)}>{copy.safety.reportTitle}</Text>
            <Text style={styles.body}>{copy.safety.reportBody}</Text>
            <TextInput
              accessibilityLabel={copy.safety.reasonPlaceholder}
              value={reason}
              onChangeText={setReason}
              placeholder={copy.safety.reasonPlaceholder}
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.text}
              style={styles.input}
              multiline
              maxLength={500}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <PrimaryButton
              label={copy.safety.send}
              busy={report.isPending}
              onPress={() => {
                if (!reason.trim()) return setError(copy.safety.reasonPlaceholder);
                report.mutate(
                  { kind, refId, reportedId: personId, reason },
                  {
                    onSuccess: () => setMode('done'),
                    onError: () => setError(copy.safety.failed),
                  },
                );
              }}
            />
            <TextButton label={copy.safety.cancel} onPress={close} />
          </>
        )}

        {mode === 'block' && (
          <>
            <Text style={display(26, 26)}>{copy.safety.blockTitle(personName)}</Text>
            <Text style={styles.body}>{copy.safety.blockBody}</Text>
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                block.mutate(personId, {
                  onSuccess: () => {
                    close();
                    onBlocked?.();
                  },
                  onError: () => setError(copy.safety.failed),
                })
              }
              style={({ pressed }) => [styles.danger, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.dangerText}>{copy.safety.blockConfirm}</Text>
            </Pressable>
            <TextButton label={copy.safety.cancel} onPress={close} />
          </>
        )}

        {mode === 'done' && (
          <>
            <Text style={display(26, 26)}>{copy.safety.sent}</Text>
            <TextButton label={copy.safety.cancel} onPress={close} />
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    gap: spacing.md,
    padding: spacing.xl,
    borderTopLeftRadius: radii.hero,
    borderTopRightRadius: radii.hero,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.textMuted },
  input: {
    minHeight: 88,
    padding: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
  danger: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.chip,
    backgroundColor: habitColors[1],
  },
  dangerText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: habitColors[4] },
});
