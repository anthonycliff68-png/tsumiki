import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { BrandHeader } from '@/components/BrandHeader';
import { Field } from '@/components/Field';
import { NoteRow } from '@/components/NoteRow';
import { Reveal } from '@/components/Reveal';
import { Screen, Title } from '@/components/Screen';
import { copy } from '@/copy';
import { useCreateFolder, useNoteFolders, useNotes } from '@/lib/api';
import { useStyles } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

/**
 * Notes. Folders first, because that's how people file; then the last few
 * notes, because that's usually what they came back for. Free for everyone —
 * only the brain dump that writes notes for you is Pro.
 */
export default function NotesScreen() {
  const styles = useStyles(makeStyles);
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: folders = [] } = useNoteFolders(userId);
  const { data: notes = [] } = useNotes(userId);
  const createFolder = useCreateFolder(userId);
  const [query, setQuery] = useState('');

  const count = (folderId: string | null) => notes.filter((n) => n.folderId === folderId).length;
  const q = query.trim().toLowerCase();
  const matches = q ? notes.filter((n) => `${n.title}\n${n.body}`.toLowerCase().includes(q)) : [];

  const askForFolder = () =>
    Alert.prompt(copy.notes.newFolder, undefined, (name) => {
      if (name?.trim()) createFolder.mutate({ name });
    });

  return (
    <Screen color={habitColors[2]}>
      <BrandHeader />
      <Title size={64}>{copy.notes.title}</Title>

      <Field
        label={copy.notes.search}
        placeholder={copy.notes.search}
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      {q ? (
        <View style={styles.list}>
          {matches.length === 0 && <Text style={styles.meta}>{copy.notes.noMatches}</Text>}
          {matches.map((note) => (
            <NoteRow key={note.id} note={note} />
          ))}
        </View>
      ) : (
        <>
          <Reveal index={0} style={styles.grid}>
            <FolderTile
              name={copy.notes.inbox}
              emoji="📥"
              color={habitColors[0]}
              count={count(null)}
              onPress={() => router.push('/notes/inbox')}
            />
            {folders.map((folder) => (
              <FolderTile
                key={folder.id}
                name={folder.name}
                emoji={folder.emoji}
                color={folder.color}
                count={count(folder.id)}
                onPress={() => router.push({ pathname: '/notes/[folderId]', params: { folderId: folder.id } })}
              />
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={askForFolder}
              style={({ pressed }) => [styles.tile, styles.addTile, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.addText}>+ {copy.notes.newFolder}</Text>
            </Pressable>
          </Reveal>

          <Reveal index={1} style={styles.list}>
            <Text style={styles.label}>{copy.notes.recent}</Text>
            {notes.length === 0 && <Text style={styles.meta}>{copy.notes.empty}</Text>}
            {notes.slice(0, 5).map((note) => (
              <NoteRow key={note.id} note={note} />
            ))}
          </Reveal>
        </>
      )}
    </Screen>
  );
}

function FolderTile(props: { name: string; emoji: string | null; color: string; count: number; onPress: () => void }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${props.name}, ${copy.notes.count(props.count)}`}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: alpha(props.color, 0.18), borderColor: alpha(props.color, 0.4) },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={styles.emoji}>{props.emoji ?? '📁'}</Text>
      <Text style={styles.tileName} numberOfLines={1}>
        {props.name}
      </Text>
      <Text style={styles.meta}>{copy.notes.count(props.count)}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    width: '47.5%',
    minHeight: 104,
    padding: spacing.lg,
    gap: 2,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addTile: { justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' },
  addText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textMuted },
  emoji: { fontSize: 22, paddingBottom: spacing.xs },
  tileName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  list: { gap: spacing.sm },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  meta: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textFaint },
}) as const;
