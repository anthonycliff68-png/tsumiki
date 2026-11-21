import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { BrandHeader } from '@/components/BrandHeader';
import { INK } from '@/components/DayRows';
import { Field } from '@/components/Field';
import { SearchIcon } from '@/components/icons';
import { NoteRow } from '@/components/NoteRow';
import { Reveal } from '@/components/Reveal';
import { Screen, Title } from '@/components/Screen';
import { copy } from '@/copy';
import { useCreateFolder, useNoteFolders, useNotes, useSaveNote, type Note } from '@/lib/api';
import { useStyles, useTheme } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { loud } from '@/lib/dayLook';
import { byOpened, openedLabel, openedSections, splitCapture } from '@/lib/notes';
import { useMarkOpened, useOpened } from '@/lib/opened';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

/**
 * Notes. Write first, because a thought leaves fast; then the folders; then
 * every note, last opened first and cut by day, because that's usually what
 * people came back for. Search sits by the title so it never scrolls away.
 * Free for everyone: only the brain dump that writes notes for you is Pro.
 */
export default function NotesScreen() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: folders = [] } = useNoteFolders(userId);
  const { data: notes = [] } = useNotes(userId);
  const { data: opened = {} } = useOpened();
  const createFolder = useCreateFolder(userId);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Each folder's colour worked out once: loud() is a search, and every row asks.
  const inbox = loud(habitColors[0] ?? '');
  const tint = new Map(folders.map((f) => [f.id, loud(f.color)]));
  const colorOf = (folderId: string | null) => (folderId && tint.get(folderId)) || inbox;
  const count = (folderId: string | null) => notes.filter((n) => n.folderId === folderId).length;
  const q = query.trim().toLowerCase();
  const matches = q ? byOpened(notes.filter((n) => `${n.title}\n${n.body}`.toLowerCase().includes(q)), opened) : [];
  const sections = openedSections(notes, opened);
  // Past six tiles the grid pushes every note below the fold, so folders become one row you swipe.
  const strip = folders.length + 1 > 6;

  const stopSearching = () => {
    setQuery('');
    setSearching(false);
  };

  const row = (note: Note) => (
    <NoteRow
      key={note.id}
      note={note}
      color={colorOf(note.folderId)}
      when={openedLabel(opened[note.id] ?? Date.parse(note.createdAt))}
    />
  );

  const askForFolder = () =>
    Alert.prompt(copy.notes.newFolder, undefined, (name) => {
      if (name?.trim()) createFolder.mutate({ name });
    });

  const tiles = (
    <>
      <FolderTile
        strip={strip}
        name={copy.notes.inbox}
        emoji="📥"
        color={inbox}
        count={count(null)}
        onPress={() => router.push('/notes/inbox')}
      />
      {folders.map((folder) => (
        <FolderTile
          key={folder.id}
          strip={strip}
          name={folder.name}
          emoji={folder.emoji}
          color={colorOf(folder.id)}
          count={count(folder.id)}
          onPress={() => router.push({ pathname: '/notes/[folderId]', params: { folderId: folder.id } })}
        />
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={askForFolder}
        style={({ pressed }) => [styles.tile, strip && styles.stripTile, styles.addTile, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.addText}>+ {copy.notes.newFolder}</Text>
      </Pressable>
    </>
  );

  return (
    <Screen color={habitColors[2]}>
      <BrandHeader />
      {searching ? (
        <View style={styles.header}>
          {/* Field puts `style` on its inner input, so the stretch goes on a wrapper. */}
          <View style={styles.searchField}>
            <Field
              label={copy.notes.search}
              placeholder={copy.notes.search}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoFocus
            />
          </View>
          <Pressable accessibilityRole="button" onPress={stopSearching} hitSlop={8}>
            <Text style={styles.cancel}>{copy.notes.cancel}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.header}>
          <Title size={40}>{copy.notes.title}</Title>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.notes.search}
            onPress={() => setSearching(true)}
            style={({ pressed }) => [styles.searchButton, pressed && { opacity: 0.8 }]}
          >
            <SearchIcon size={20} color={colors.text} />
          </Pressable>
        </View>
      )}

      {searching ? (
        <View style={styles.list}>
          {q && matches.length === 0 && <Text style={styles.meta}>{copy.notes.noMatches}</Text>}
          {matches.map(row)}
        </View>
      ) : (
        <>
          <Capture
            userId={userId}
            choices={[{ id: null, name: copy.notes.inbox }, ...folders].map((f) => ({ ...f, color: colorOf(f.id) }))}
          />

          <Reveal index={0} style={styles.list}>
            <Text style={styles.label}>
              {strip ? copy.notes.foldersCount(folders.length + 1) : copy.notes.folders}
            </Text>
            {strip ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.strip}
                style={styles.stripBleed}
              >
                {tiles}
              </ScrollView>
            ) : (
              <View style={styles.grid}>{tiles}</View>
            )}
          </Reveal>

          <Reveal index={1} style={styles.list}>
            {notes.length === 0 && <Text style={styles.meta}>{copy.notes.empty}</Text>}
            {/* ponytail: every note is drawn, about 0.25 s for 200 in a dev build. Past several hundred, move to a SectionList. */}
            {sections.map(({ section, notes: inSection }) => (
              <View key={section} style={styles.list}>
                <Text style={styles.label}>{copy.notes.sections[section]}</Text>
                {inSection.map(row)}
              </View>
            ))}
          </Reveal>
        </>
      )}
    </Screen>
  );
}

/**
 * The write-first box. Its own component so a keystroke redraws this box, not
 * every note below it (with a thousand notes that was most of a second a letter).
 */
function Capture({ userId, choices }: { userId: string | undefined; choices: { id: string | null; name: string; color: string }[] }) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const save = useSaveNote(userId);
  const markOpened = useMarkOpened();
  const [draft, setDraft] = useState('');
  const [saveTo, setSaveTo] = useState<string | null>(null);
  // iOS doesn't re-measure a multiline input cleared from code, so a two-line
  // note left a blank line under the box. A new key after each save starts it fresh.
  const [saved, setSaved] = useState(0);

  const capture = () => {
    const { title, body } = splitCapture(draft);
    if (!title) return;
    save.mutate(
      { title, body, folderId: saveTo },
      {
        onSuccess: (id) => {
          markOpened(id);
          setDraft('');
          setSaveTo(null);
          setSaved((n) => n + 1);
          Keyboard.dismiss();
        },
        onError: () => Alert.alert(copy.notes.saveFailed),
      },
    );
  };

  return (
    <View style={styles.capture}>
      <TextInput
        key={saved}
        accessibilityLabel={copy.notes.capture}
        placeholder={copy.notes.capture}
        placeholderTextColor={colors.textFaint}
        value={draft}
        onChangeText={setDraft}
        multiline
        style={[styles.captureInput, { borderColor: alpha(colors.text, draft ? 0.9 : 0.3) }]}
      />
      {draft.trim() ? (
        <>
          <Text style={styles.label}>{copy.notes.saveTo}</Text>
          <View style={styles.chips}>
            {choices.map((f) => (
              <Pressable
                key={f.id ?? 'inbox'}
                accessibilityRole="button"
                accessibilityState={{ selected: saveTo === f.id }}
                onPress={() => setSaveTo(f.id)}
                style={[styles.chip, { backgroundColor: f.color }, saveTo === f.id && { borderColor: colors.text }]}
              >
                <Text style={styles.chipText}>{f.name}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={capture}
            disabled={save.isPending}
            style={({ pressed }) => [styles.save, { backgroundColor: colors.text }, pressed && { opacity: 0.8 }]}
          >
            <Text style={[styles.saveText, { color: colors.bg }]}>{copy.notes.save}</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function FolderTile(props: {
  name: string;
  emoji: string | null;
  color: string;
  count: number;
  strip: boolean;
  onPress: () => void;
}) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${props.name}, ${copy.notes.count(props.count)}`}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.tile,
        props.strip && styles.stripTile,
        { backgroundColor: props.color, borderColor: props.color },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={styles.emoji}>{props.emoji ?? '📁'}</Text>
      <Text style={styles.tileName} numberOfLines={1}>
        {props.name}
      </Text>
      <Text style={styles.tileMeta}>{copy.notes.count(props.count)}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => ({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: 48 },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: alpha(colors.text, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchField: { flex: 1 },
  cancel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  strip: { gap: spacing.sm, paddingRight: spacing.xl },
  // Run the row off the right edge so the cut-off tile says there's more.
  stripBleed: { marginRight: -spacing.xl },
  stripTile: { width: 104 },
  capture: { gap: spacing.sm },
  captureInput: {
    minHeight: 52,
    maxHeight: 160,
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: radii.card,
    borderWidth: 1.5,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: 10, borderWidth: 2 },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: INK },
  save: { alignSelf: 'flex-end', paddingHorizontal: spacing.xl, paddingVertical: 10, borderRadius: radii.chip },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '31.5%',
    minHeight: 84,
    padding: spacing.md,
    gap: 1,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addTile: { justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' },
  addText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  emoji: { fontSize: 18, paddingBottom: 2 },
  tileName: { fontFamily: fonts.bodyBold, fontSize: 14, color: INK },
  tileMeta: { fontFamily: fonts.body, fontSize: 12, color: alpha(INK, 0.7) },
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
