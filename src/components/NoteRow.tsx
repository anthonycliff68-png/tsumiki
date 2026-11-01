import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import type { Note } from '@/lib/api';
import { useStyles } from '@/lib/appearance';
import { alpha, fonts, radii, spacing, type Palette } from '@/theme';

/** One note in a list: title, then the first line of what it says. */
export function NoteRow({ note }: { note: Note }) {
  const styles = useStyles(makeStyles);
  const preview = note.body.split('\n').find((l) => l.trim())?.replace(/^(## |- )/, '') ?? '';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
    >
      <Text style={styles.rowTitle} numberOfLines={1}>
        {note.dumpId ? '✦ ' : ''}
        {note.title}
      </Text>
      {preview ? (
        <Text style={styles.meta} numberOfLines={1}>
          {preview}
        </Text>
      ) : null}
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => ({
  row: {
    gap: 2,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.04),
  },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textFaint },
}) as const;
