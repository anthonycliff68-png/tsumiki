import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/Button';
import { Field } from '@/components/Field';
import { Body, Screen, Title } from '@/components/Screen';
import { ToggleRow } from '@/components/ToggleRow';
import { copy } from '@/copy';
import { useSendFeedback } from '@/lib/api';
import { useStyles } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { goBack } from '@/lib/back';
import { messageFrom } from '@/lib/errors';
import { fonts, habitColors, spacing, type Palette } from '@/theme';

/** Matches the check on the table, so the limit is felt here rather than
 *  rejected by the database after somebody has written four paragraphs. */
const LIMIT = 2000;

export default function FeedbackScreen() {
  const styles = useStyles(makeStyles);
  const { session } = useAuth();
  const send = useSendFeedback(session?.user.id);

  const [message, setMessage] = useState('');
  const [replyWanted, setReplyWanted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError(null);
    try {
      await send.mutateAsync({ message, replyWanted });
      setSent(true);
    } catch (e) {
      setError(messageFrom(e, copy.feedback.failed));
    }
  };

  // Confirmed in place rather than by popping back to the previous screen.
  // Somebody who has just written a paragraph about what is broken deserves
  // more than being returned to where they were with no sign it arrived.
  if (sent) {
    return (
      <Screen color={habitColors[2]} underDock={false}>
        <View style={styles.head}>
          <Title size={46}>{copy.feedback.sentTitle}</Title>
          <Body>{copy.feedback.sentBody}</Body>
        </View>
        <PrimaryButton label={copy.feedback.done} onPress={() => goBack()} />
      </Screen>
    );
  }

  const left = LIMIT - message.length;

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      // The send button sits under the keyboard on a multiline form otherwise,
      // and there is no scrolling past a keyboard that is covering it.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen color={habitColors[2]} underDock={false}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.head}>
            <Title size={46}>{copy.feedback.title}</Title>
            <Body>{copy.feedback.blurb}</Body>
          </View>

          <Field
            label={copy.feedback.label}
            placeholder={copy.feedback.placeholder}
            value={message}
            onChangeText={(text) => {
              setMessage(text);
              if (error) setError(null);
            }}
            multiline
            numberOfLines={6}
            maxLength={LIMIT}
            textAlignVertical="top"
            style={styles.input}
            editable={!send.isPending}
          />

          {/* Only once it is close enough to matter. A counter from the first
              character reads as a word limit on something nobody was asked to
              keep short. */}
          {left <= 200 && (
            <Text style={styles.counter} accessibilityLiveRegion="polite">
              {copy.feedback.counter(left)}
            </Text>
          )}

          <ToggleRow
            label={copy.feedback.replyWanted}
            hint={copy.feedback.replyHint}
            value={replyWanted}
            onValueChange={setReplyWanted}
            disabled={send.isPending}
          />

          {error !== null && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          <PrimaryButton
            label={send.isPending ? copy.feedback.sending : copy.feedback.send}
            busy={send.isPending}
            onPress={() => void submit()}
          />
          <TextButton label={copy.newHabit.cancel} onPress={() => goBack()} />
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => ({
  fill: { flex: 1 },
  body: { gap: spacing.md, paddingBottom: spacing.xxl },
  head: { gap: spacing.md, paddingTop: spacing.xl },
  input: { minHeight: 150, paddingTop: 16, paddingBottom: 16 },
  counter: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint, textAlign: 'right' },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: habitColors[1] },
}) as const;
