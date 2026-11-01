import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import { NoteRow } from '@/components/NoteRow';
import { Display, Screen } from '@/components/Screen';
import { copy } from '@/copy';
import { useNoteFolders, useNotes, useRenameFolder } from '@/lib/api';
import { useStyles } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { goBack } from '@/lib/back';
import { groupByDay } from '@/lib/notes';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

/** One folder, read by day: newest first under "Today · Sat Oct 31" headers. */
export default function FolderScreen() {
  const styles = useStyles(makeStyles);
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: folders = [] } = useNoteFolders(userId);
  const { data: notes = [] } = useNotes(userId);
  const rename = useRenameFolder();

  const inbox = folderId === 'inbox';
  const folder = folders.find((f) => f.id === folderId);
  const name = inbox ? copy.notes.inbox : (folder?.name ?? '');
  const mine = notes.filter((n) => n.folderId === (inbox ? null : folderId));

  return (
    <Screen color={folder?.color ?? habitColors[0]} underDock={false}>
      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" onPress={() => goBack()} style={styles.pill}>
          <Text style={styles.pillText}>{copy.notes.back}</Text>
        </Pressable>
        <View style={styles.spacer} />
        {folder && (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              Alert.prompt(copy.notes.rename, undefined, (next) => {
                if (next?.trim()) rename.mutate({ id: folder.id, name: next });
              }, 'plain-text', folder.name)
            }
            style={styles.pill}
          >
            <Text style={styles.pillText}>{copy.notes.rename}</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/note/[id]', params: { id: 'new', folder: inbox ? '' : folderId } })}
          style={styles.pill}
        >
          <Text style={styles.pillText}>+ {copy.notes.newNote}</Text>
        </Pressable>
      </View>

      <Display size={52} line={46}>
        {folder?.emoji ? `${folder.emoji} ${name}` : name}
      </Display>

      {mine.length === 0 && <Text style={styles.meta}>{copy.notes.empty}</Text>}
      {groupByDay(mine).map((group) => (
        <View key={group.heading} style={styles.group}>
          <Text style={styles.label}>{group.heading}</Text>
          {group.notes.map((note) => (
            <NoteRow key={note.id} note={note} />
          ))}
        </View>
      ))}
    </Screen>
  );
}

const makeStyles = (colors: Palette) => ({
  topRow: { flexDirection: 'row', gap: spacing.sm },
  spacer: { flex: 1 },
  pill: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.06),
  },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  group: { gap: spacing.sm },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  meta: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textFaint },
}) as const;
