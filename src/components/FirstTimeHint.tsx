import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useStyles } from '@/lib/appearance';
import { copy } from '@/copy';
import { alpha, fonts, radii, spacing, type Palette } from '@/theme';

/**
 * One line, the first time, then never again.
 *
 * The walkthrough covers the move you make every day. This covers the things
 * it cannot reach without becoming a tour: what the three progress views mean,
 * that the pips in the dock are tappable. Each arrives on the screen it is
 * about, at the moment you first look at it, and goes away for good once you
 * have read it.
 *
 * Deliberately not a spotlight or a sequence. A reader told us being taught
 * the system before touching it left them with nothing; a queue of coach marks
 * is the same mistake wearing a different hat.
 */
export function FirstTimeHint({ id, children }: { id: string; children: string }) {
  const styles = useStyles(makeStyles);
  const key = `tsumiki.hint.${id}`;
  /** Null until storage answers, so the hint never flashes in and out. */
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(key)
      .then((seen) => alive && setShow(seen !== 'yes'))
      // Unreadable storage should not mean a hint on every launch for ever.
      .catch(() => alive && setShow(false));
    return () => {
      alive = false;
    };
  }, [key]);

  if (show !== true) return null;

  const dismiss = () => {
    setShow(false);
    void AsyncStorage.setItem(key, 'yes').catch(() => {});
  };

  return (
    <View style={styles.hint}>
      <Text style={styles.text}>{children}</Text>
      {/* A word rather than a cross: it says what tapping does, and it is a
          real target instead of a fourteen-point glyph. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.hints.dismiss}
        onPress={dismiss}
        hitSlop={10}
        style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.closeLabel}>{copy.hints.dismiss}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.05),
  },
  text: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  close: { paddingTop: 1 },
  closeLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
}) as const;
