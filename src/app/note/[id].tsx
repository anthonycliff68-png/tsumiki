import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { copy } from '@/copy';
import { useDeleteNote, useNoteDump, useNoteFolders, useNotes, useSaveNote } from '@/lib/api';
import { useStyles, useTheme } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { goBack } from '@/lib/back';
import { dayHeading, parseNoteBody } from '@/lib/notes';
import { alpha, display, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

/**
 * A note. Read first — headings and bullets drawn, the way a brain dump writes
 * them up — and Edit turns it back into plain text. A new note opens editing.
 */
export default function NoteScreen() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const { id, folder } = useLocalSearchParams<{ id: string; folder?: string }>();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: notes = [] } = useNotes(userId);
  const { data: folders = [] } = useNoteFolders(userId);
  const save = useSaveNote(userId);
  const remove = useDeleteNote();

  const isNew = id === 'new';
  const note = notes.find((n) => n.id === id);
  const [editing, setEditing] = useState(isNew);
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [folderId, setFolderId] = useState<string | null>(note?.folderId ?? (folder || null));
  const [showWords, setShowWords] = useState(false);
  const { data: words } = useNoteDump(showWords ? (note?.dumpId ?? null) : null);

  const tint = folders.find((f) => f.id === folderId)?.color ?? habitColors[0];

  const startEditing = () => {
    setTitle(note?.title ?? '');
    setBody(note?.body ?? '');
    setFolderId(note?.folderId ?? null);
    setEditing(true);
  };

  const done = () => {
    if (!title.trim() && !body.trim()) return goBack();
    save.mutate(
      { id: isNew ? undefined : id, title: title.trim() || copy.notes.untitled, body, folderId },
      {
        onSuccess: (savedId) => {
          if (isNew) router.replace({ pathname: '/note/[id]', params: { id: savedId } });
          else setEditing(false);
        },
        onError: () => Alert.alert(copy.notes.saveFailed),
      },
    );
  };

  const confirmDelete = () =>
    Alert.alert(copy.notes.deleteConfirm, undefined, [
      { text: copy.notes.cancel, style: 'cancel' },
      {
        text: copy.notes.delete,
        style: 'destructive',
        onPress: () => remove.mutate(id, { onSuccess: () => goBack() }),
      },
    ]);

  return (
    <Screen color={tint} underDock={false}>
      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" onPress={() => goBack()} style={styles.pill}>
          <Text style={styles.pillText}>{editing && !isNew ? copy.notes.cancel : copy.notes.back}</Text>
        </Pressable>
        <View style={styles.spacer} />
        {!editing && note && (
          <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.pill}>
            <Text style={styles.pillText}>{copy.notes.delete}</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={save.isPending}
          onPress={editing ? done : startEditing}
          style={[styles.pill, styles.pillStrong]}
        >
          <Text style={styles.pillText}>{editing ? copy.notes.done : copy.notes.edit}</Text>
        </Pressable>
      </View>

      {editing ? (
        <>
          <TextInput
            accessibilityLabel={copy.notes.titlePlaceholder}
            placeholder={copy.notes.titlePlaceholder}
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.text}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
            autoFocus={isNew}
            style={styles.titleInput}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {[{ id: null, name: copy.notes.inbox, color: habitColors[0] }, ...folders].map((f) => (
              <Pressable
                key={f.id ?? 'inbox'}
                accessibilityRole="button"
                accessibilityState={{ selected: f.id === folderId }}
                onPress={() => setFolderId(f.id)}
                style={[styles.chip, f.id === folderId && { backgroundColor: alpha(f.color, 0.35), borderColor: f.color }]}
              >
                <Text style={styles.chipText}>{f.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            accessibilityLabel={copy.notes.bodyPlaceholder}
            placeholder={copy.notes.bodyPlaceholder}
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.text}
            value={body}
            onChangeText={setBody}
            multiline
            scrollEnabled={false}
            style={styles.bodyInput}
          />
        </>
      ) : note ? (
        <>
          <Text style={styles.meta}>
            {dayHeading(note.createdAt)} · {folders.find((f) => f.id === note.folderId)?.name ?? copy.notes.inbox}
          </Text>
          <Text style={styles.title}>{note.title}</Text>
          {note.dumpId && (
            <View style={styles.dumpRow}>
              <Text style={styles.meta}>{copy.notes.fromDump}</Text>
              <Text accessibilityRole="button" onPress={() => setShowWords((v) => !v)} style={styles.link}>
                {copy.notes.yourWords}
              </Text>
            </View>
          )}
          {showWords && (
            <View style={styles.words}>
              <Text style={styles.label}>{copy.notes.yourWordsTitle}</Text>
              <Text style={styles.text}>{words ?? '…'}</Text>
            </View>
          )}
          <View style={styles.blocks}>
            {parseNoteBody(note.body).map((block, i) =>
              block.kind === 'heading' ? (
                <Text key={i} style={styles.heading}>
                  {block.text}
                </Text>
              ) : block.kind === 'bullet' ? (
                <View key={i} style={styles.bullet}>
                  <Text style={styles.text}>•</Text>
                  <Text style={[styles.text, styles.flex]}>{block.text}</Text>
                </View>
              ) : (
                <Text key={i} style={styles.text}>
                  {block.text}
                </Text>
              ),
            )}
          </View>
        </>
      ) : null}
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
  pillStrong: { backgroundColor: alpha(colors.overlay, 0.14) },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  title: { ...display(40, 38), color: colors.text },
  titleInput: { fontFamily: fonts.bodyBold, fontSize: 26, color: colors.text, paddingVertical: spacing.sm },
  bodyInput: { minHeight: 240, fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.text, textAlignVertical: 'top' },
  chips: { gap: spacing.sm },
  chip: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
  dumpRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  link: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  words: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.04),
  },
  blocks: { gap: spacing.sm },
  heading: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text, paddingTop: spacing.sm },
  bullet: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  text: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.text },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  meta: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textFaint },
}) as const;
