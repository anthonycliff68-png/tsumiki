import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/Button';
import { copy } from '@/copy';
import {
  NUDGE_MAX_LENGTH,
  NudgeAlreadySentError,
  NudgeNotAllowedError,
  useSendNudge,
  type CrewMemberState,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { alpha, colors, display, fonts, habitColors, radii, spacing } from '@/theme';

type Props = {
  visible: boolean;
  crewId: string;
  member: CrewMemberState | null;
  /** How many people still have not checked in, this one included. */
  remaining: number;
  moment: string;
  onClose: () => void;
};

/** The nudge sheet. Artboard: NudgeSend. */
export function NudgeSheet({ visible, crewId, member, remaining, moment, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const sendNudge = useSendNudge(session?.user.id);

  const [choice, setChoice] = useState<string>(copy.nudge.presets[0] ?? '');
  const [custom, setCustom] = useState('');
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!visible || !member) return null;

  const message = writing ? custom : choice;

  const send = () => {
    setError(null);
    if (!message.trim()) return;
    sendNudge.mutate(
      { crewId, toUser: member.userId, message },
      {
        onSuccess: () => {
          setCustom('');
          setWriting(false);
          onClose();
        },
        onError: (e) => {
          if (e instanceof NudgeAlreadySentError) return setError(copy.nudge.already);
          if (e instanceof NudgeNotAllowedError) return setError(copy.nudge.notAllowed);
          setError(e instanceof Error ? e.message : copy.auth.genericError);
        },
      },
    );
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={copy.nudge.cancel} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.grabber} />

        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: member.avatarColor }]}>
            <Text style={styles.avatarText}>{member.displayName.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={display(26, 26)}>{copy.nudge.sendTitle(member.displayName)}</Text>
            <Text style={styles.sub}>{copy.nudge.sendSub(moment, remaining)}</Text>
          </View>
        </View>

        <Text style={styles.label}>{copy.nudge.pick}</Text>
        <View style={styles.chips}>
          {copy.nudge.presets.map((preset) => {
            const active = !writing && preset === choice;
            return (
              <Pressable
                key={preset}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setWriting(false);
                  setChoice(preset);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{preset}</Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: writing }}
            onPress={() => setWriting(true)}
            style={[styles.chip, writing && styles.chipActive]}
          >
            <Text style={[styles.chipText, writing && styles.chipTextActive]}>
              + {copy.nudge.writeYourOwn}
            </Text>
          </Pressable>
        </View>

        {writing && (
          <TextInput
            accessibilityLabel={copy.nudge.writeYourOwn}
            value={custom}
            onChangeText={setCustom}
            placeholder={copy.nudge.customPlaceholder}
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.text}
            style={styles.input}
            maxLength={NUDGE_MAX_LENGTH}
            autoFocus
          />
        )}

        <View style={styles.rule}>
          <Text style={styles.ruleText}>{copy.nudge.rule}</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <PrimaryButton label={copy.nudge.send} busy={sendNudge.isPending} onPress={send} />
        <TextButton label={copy.nudge.cancel} onPress={onClose} />
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
  headerText: { flex: 1, gap: 2 },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipActive: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  chipTextActive: { color: colors.bg },
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
  rule: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: 12,
    borderRadius: radii.card,
    backgroundColor: alpha(colors.white, 0.05),
  },
  ruleText: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.textFaint },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: habitColors[4] },
});
