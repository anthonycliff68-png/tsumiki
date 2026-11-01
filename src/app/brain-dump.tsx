import { router } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/Button';
import { Display, Eyebrow, Screen } from '@/components/Screen';
import { TimePickerSheet } from '@/components/TimePickerSheet';
import { copy } from '@/copy';
import {
  BrainDumpError,
  useAddFromDump,
  useAnchors,
  useGiveAiConsent,
  useMyProfile,
  useNoteFolders,
  useSortDump,
} from '@/lib/api';
import { useStyles, useTheme } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { goBack } from '@/lib/back';
import { shortDay, tickedCount, toLookRows, type LookRow } from '@/lib/brainDump';
import { addDays, localDateString } from '@/lib/dates';
import { formatTime } from '@/lib/times';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

const MIC = habitColors[1];
const SPARK = habitColors[4];

/**
 * The brain dump. Hold the mic and ramble, let go, take a short look at what
 * it sorted, tap Add. The words are never thrown away: every failure leaves
 * them on screen to try again.
 */
export default function BrainDumpScreen() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const profile = useMyProfile(userId);
  const consent = useGiveAiConsent(userId);
  const { data: folders = [] } = useNoteFolders(userId);
  const { data: anchors = [] } = useAnchors(userId);
  const sort = useSortDump();
  const add = useAddFromDump(userId);

  // The words: what's settled, plus what the recogniser is still unsure of.
  const [said, setSaid] = useState('');
  const [hearing, setHearing] = useState('');
  const words = `${said} ${hearing}`.trim();
  const wordsRef = useRef('');
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  const [typing, setTyping] = useState(false);
  const [holding, setHolding] = useState(false);
  const released = useRef(false);
  const pressed = useRef(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [look, setLook] = useState<{ rows: LookRow[]; dumpId: string | null } | null>(null);

  const toTyping = () => {
    setSaid(wordsRef.current);
    setHearing('');
    setTyping(true);
  };

  const run = (transcript: string) => {
    if (!transcript.trim()) return;
    setProblem(null);
    sort.mutate(transcript.trim(), {
      onSuccess: ({ dumpId, sorted }) => setLook({ rows: toLookRows(sorted, folders), dumpId }),
      onError: (error) => {
        const code = error instanceof BrainDumpError ? error.message : 'network';
        if (code === 'no_consent') void profile.refetch();
        setProblem(code === 'daily_cap' ? copy.brainDump.cap : code === 'not_pro' ? copy.brainDump.notPro : copy.brainDump.failed);
        toTyping();
      },
    });
  };

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      setSaid((s) => `${s} ${text}`.trim());
      setHearing('');
    } else setHearing(text);
  });
  useSpeechRecognitionEvent('error', (event) => {
    if (event.error !== 'no-speech' && event.error !== 'aborted') toTyping();
  });
  useSpeechRecognitionEvent('end', () => {
    setHolding(false);
    if (released.current) {
      released.current = false;
      // The last "result" lands just before "end"; let it settle first.
      setTimeout(() => run(wordsRef.current), 0);
    }
  });

  const startListening = async () => {
    pressed.current = true;
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable() || !ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
      return toTyping();
    }
    const permission = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!permission.granted) {
      // Asking interrupts the press; once allowed, the next hold talks.
      const asked = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!asked.granted) toTyping();
      return;
    }
    // A quick tap can let go before the permission check answers.
    if (!pressed.current) return;
    released.current = false;
    setHolding(true);
    ExpoSpeechRecognitionModule.start({
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: true,
      addsPunctuation: true,
    });
  };

  const stopListening = () => {
    pressed.current = false;
    if (!holding) return;
    released.current = true;
    ExpoSpeechRecognitionModule.stop();
  };

  const header = (
    <View style={styles.header}>
      <Eyebrow color={SPARK}>✦ {copy.brainDump.title}</Eyebrow>
      <Pressable accessibilityRole="button" accessibilityLabel={copy.brainDump.close} onPress={() => goBack()} hitSlop={12}>
        <Text style={styles.close}>✕</Text>
      </Pressable>
    </View>
  );

  if (profile.isPending) return <Screen color={SPARK} underDock={false}>{header}</Screen>;

  if (!profile.data?.ai_consent_at) {
    return (
      <Screen color={SPARK} underDock={false}>
        {header}
        <Display size={44} line={42}>
          {copy.brainDump.consentTitle}
        </Display>
        <Text style={styles.body}>{copy.brainDump.consentBody}</Text>
        <PrimaryButton label={copy.brainDump.agree} busy={consent.isPending} onPress={() => consent.mutate()} />
        <TextButton label={copy.brainDump.notNow} onPress={() => goBack()} />
      </Screen>
    );
  }

  if (look) {
    const n = tickedCount(look.rows);
    const update = (key: string, patch: Partial<LookRow>) =>
      setLook({ ...look, rows: look.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) });
    const backToWords = () => {
      setLook(null);
      toTyping();
    };

    if (look.rows.length === 0) {
      return (
        <Screen color={SPARK} underDock={false}>
          {header}
          <Display size={44} line={42}>
            {copy.brainDump.nothing}
          </Display>
          <Text style={styles.body}>{copy.brainDump.nothingBody}</Text>
          <Text style={styles.words}>{words}</Text>
          <PrimaryButton label={copy.brainDump.tryAgain} onPress={backToWords} />
        </Screen>
      );
    }

    const groups: [LookRow['kind'], string][] = [
      ['timeline', copy.brainDump.timeline],
      ['todo', copy.brainDump.todos],
      ['note', copy.brainDump.notes],
      ['habit', copy.brainDump.habits],
    ];
    return (
      <Screen color={SPARK} underDock={false}>
        {header}
        <Text style={styles.label}>{copy.brainDump.sorted(look.rows.length)}</Text>
        <Display size={44} line={42}>
          {copy.brainDump.heard}
        </Display>
        {groups.map(([kind, title]) => {
          const rows = look.rows.filter((r) => r.kind === kind);
          if (!rows.length) return null;
          return (
            <View key={kind} style={styles.group}>
              <Text style={styles.label}>{title}</Text>
              {rows.map((row) => (
                <LookItem
                  key={row.key}
                  row={row}
                  folders={folders.map((f) => f.name)}
                  momentLabel={anchors.find((a) => a.id === row.momentId)?.label ?? null}
                  onChange={(patch) => update(row.key, patch)}
                />
              ))}
            </View>
          );
        })}
        {add.isError && <Text style={styles.problem}>{copy.brainDump.addFailed}</Text>}
        <PrimaryButton
          label={copy.brainDump.add(n)}
          disabled={n === 0}
          busy={add.isPending}
          onPress={() =>
            add.mutate(look, {
              onSuccess: ({ folders: filed }) =>
                router.replace({ pathname: '/my-day', params: { dumped: filed.join(','), at: String(Date.now()) } }),
            })
          }
        />
      </Screen>
    );
  }

  const sorting = sort.isPending;
  return (
    <Screen color={MIC} underDock={false}>
      {header}
      <Display size={44} line={42}>
        {sorting ? copy.brainDump.sorting : copy.brainDump.prompt}
      </Display>

      {typing && !sorting ? (
        <TextInput
          accessibilityLabel={copy.brainDump.typePlaceholder}
          placeholder={copy.brainDump.typePlaceholder}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.text}
          value={said}
          onChangeText={setSaid}
          multiline
          autoFocus={!said}
          scrollEnabled={false}
          maxLength={8000}
          style={[styles.words, styles.typed]}
        />
      ) : (
        <Text style={styles.words}>
          {said}
          {hearing ? <Text style={styles.hearing}> {hearing}</Text> : null}
        </Text>
      )}

      {problem && (
        <View style={styles.group}>
          <Text style={styles.problem}>{problem}</Text>
          {problem === copy.brainDump.notPro && <TextButton label={copy.brainDump.seePro} onPress={() => router.push('/plans')} />}
        </View>
      )}

      {typing ? (
        <PrimaryButton
          label={problem ? copy.brainDump.tryAgain : copy.brainDump.sort}
          disabled={!said.trim()}
          busy={sorting}
          onPress={() => run(said)}
        />
      ) : (
        !sorting && (
          <View style={styles.micWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.brainDump.hold}
              onPressIn={() => void startListening()}
              onPressOut={stopListening}
              style={[styles.mic, holding && styles.micOn]}
            >
              <Text style={styles.micIcon}>🎙️</Text>
            </Pressable>
            <Text style={styles.meta}>{holding ? copy.brainDump.release : copy.brainDump.hold}</Text>
            <TextButton label={copy.brainDump.typeInstead} onPress={toTyping} />
          </View>
        )
      )}
    </Screen>
  );
}

/** One row of the short look: a tick, and a tap that opens it to fix. */
function LookItem({
  row,
  folders,
  momentLabel,
  onChange,
}: {
  row: LookRow;
  folders: string[];
  momentLabel: string | null;
  onChange: (patch: Partial<LookRow>) => void;
}) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const today = localDateString();

  const when =
    row.kind === 'note'
      ? `→ ${row.folder}`
      : [shortDay(row.day, today), momentLabel ? copy.brainDump.after(momentLabel) : row.time ? formatTime(row.time) : null]
          .filter(Boolean)
          .join(' · ');
  const days = Array.from({ length: 7 }, (_, i) => localDateString(addDays(new Date(), i)));
  const folderChoices = [...new Set([...folders, ...(row.isNewFolder && row.folder ? [row.folder] : [])])];

  return (
    <View style={[styles.item, !row.ticked && styles.itemOff]}>
      <View style={styles.itemRow}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={copy.brainDump.tick(row.title)}
          accessibilityState={{ checked: row.ticked }}
          onPress={() => onChange({ ticked: !row.ticked })}
          hitSlop={10}
          style={[styles.tick, row.ticked && styles.tickOn]}
        >
          {row.ticked && <Text style={styles.tickMark}>✓</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setOpen((v) => !v)} style={styles.itemMain}>
          <Text style={styles.itemTitle} numberOfLines={open ? undefined : 1}>
            {row.title}
          </Text>
          {row.isNewFolder && <Text style={styles.newTag}>{copy.brainDump.newFolder}</Text>}
          {!!when && <Text style={styles.when}>{when}</Text>}
        </Pressable>
      </View>

      {open && (
        <View style={styles.editor}>
          <TextInput
            accessibilityLabel={row.title}
            value={row.title}
            onChangeText={(title) => onChange({ title })}
            selectionColor={colors.text}
            style={styles.titleInput}
          />
          {(row.kind === 'timeline' || row.kind === 'todo') && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {days.map((day) => (
                <Chip key={day} on={row.day === day} onPress={() => onChange({ day })}>
                  {shortDay(day, today) ?? copy.brainDump.today}
                </Chip>
              ))}
            </ScrollView>
          )}
          {(row.kind === 'timeline' || row.kind === 'habit') && (
            <Chip on={!!row.time} onPress={() => setPicking(true)}>
              {row.time ? formatTime(row.time) : copy.brainDump.setTime}
            </Chip>
          )}
          {row.kind === 'note' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {folderChoices.map((name) => (
                <Chip
                  key={name}
                  on={row.folder === name}
                  onPress={() => onChange({ folder: name, isNewFolder: !folders.includes(name) })}
                >
                  {name}
                </Chip>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <TimePickerSheet
        visible={picking}
        value={row.time ?? '09:00'}
        label={copy.brainDump.time}
        onChange={(time) => onChange({ time, momentId: null })}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}

function Chip({ on, onPress, children }: { on: boolean; onPress: () => void; children: string }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
    >
      <Text style={styles.chipText}>{children}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => ({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.textMuted },
  words: { fontFamily: fonts.body, fontSize: 18, lineHeight: 28, color: colors.text, minHeight: 120 },
  typed: {
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.04),
    textAlignVertical: 'top',
  },
  hearing: { color: colors.textFaint },
  problem: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, color: habitColors[1] },
  micWrap: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg },
  mic: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: MIC,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 12,
    borderColor: alpha(MIC, 0.25),
  },
  micOn: { transform: [{ scale: 1.08 }], borderColor: alpha(MIC, 0.4) },
  micIcon: { fontSize: 36 },
  meta: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textFaint },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  group: { gap: spacing.sm },
  item: {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.06),
  },
  itemOff: { opacity: 0.6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTitle: { flexShrink: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  when: { marginLeft: 'auto', fontFamily: fonts.body, fontSize: 13, color: colors.textFaint },
  newTag: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.bg,
    backgroundColor: habitColors[2],
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  tick: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickOn: { backgroundColor: habitColors[2], borderColor: habitColors[2] },
  tickMark: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.white },
  editor: { gap: spacing.sm, paddingLeft: 24 + spacing.md },
  titleInput: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, paddingVertical: spacing.xs },
  chips: { gap: spacing.sm },
  chip: {
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: alpha(colors.overlay, 0.14), borderColor: colors.text },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
}) as const;
