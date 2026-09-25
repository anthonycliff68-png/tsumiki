import { Text, View } from 'react-native';

import { useStyles } from '@/lib/appearance';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

export type ShowcaseKind = 'stack' | 'crew' | 'rule';

/**
 * A working fragment of the app under each idea, so the welcome reads like
 * an instruction manual rather than a poster.
 *
 * These are drawn rather than screenshotted on purpose: a bitmap of Today
 * would go stale the first time the design moved, would not follow the
 * theme, and would be soft on a screen this dense. Each fragment is the
 * smallest true picture of the thing the slide is claiming.
 */
export function WelcomeShowcase({ kind, color }: { kind: ShowcaseKind; color: string }) {
  if (kind === 'stack') return <Stack color={color} />;
  if (kind === 'crew') return <Crew color={color} />;
  return <Rule color={color} />;
}

/** A moment with a habit hanging off it — the whole premise, twice. */
function Stack({ color }: { color: string }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.frame}>
      <View style={s.row}>
        <Text style={s.time}>12:30 pm</Text>
        <View style={[s.tick, { backgroundColor: habitColors[0] }]} />
        <Text style={[s.anchor, { color: habitColors[0] }]}>LUNCH</Text>
      </View>
      <View style={s.hang}>
        <View style={[s.card, { backgroundColor: color }]}>
          <Text style={s.cardName}>WALK 15 MIN</Text>
          <Text style={s.cardSub}>Solo · every day</Text>
        </View>
      </View>
      <View style={s.row}>
        <Text style={s.time}>6:00 pm</Text>
        <View style={[s.tick, { backgroundColor: habitColors[2] }]} />
        <Text style={[s.anchor, { color: habitColors[2] }]}>HOME</Text>
      </View>
      <View style={s.hang}>
        <View style={[s.card, { backgroundColor: habitColors[3] }]}>
          <Text style={s.cardName}>TIDY ONE THING</Text>
          <Text style={s.cardSub}>Solo · weekdays</Text>
        </View>
      </View>
    </View>
  );
}

const CREW = [
  { n: 'You', i: 'Y', c: habitColors[1], in: true },
  { n: 'Marcus', i: 'M', c: habitColors[0], in: true },
  { n: 'Dee', i: 'D', c: habitColors[2], in: false },
];

/** Four people, one streak, and one of them still owing the day. */
function Crew({ color }: { color: string }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.frame}>
      <View style={[s.streak, { borderColor: alpha(color, 0.5), backgroundColor: alpha(color, 0.12) }]}>
        <Text style={[s.streakN, { color }]}>23</Text>
        <Text style={s.streakL}>DAYS, TOGETHER</Text>
      </View>
      <View style={s.tiles}>
        {CREW.map((m) => (
          <View key={m.n} style={s.tile}>
            <View style={[s.avatar, { backgroundColor: m.c }]}>
              <Text style={s.avatarLetter}>{m.i}</Text>
            </View>
            <Text style={s.tileName}>{m.n}</Text>
            <Text style={[s.tileState, m.in && { color: habitColors[2] }]}>
              {m.in ? 'In' : 'Nudge'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const WEEK = ['done', 'done', 'missed', 'done', 'done', 'done', 'todo'] as const;
const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** A week with one hole in it, and the streak still alive. */
function Rule({ color }: { color: string }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.frame}>
      <View style={s.week}>
        {WEEK.map((state, i) => (
          <View key={`${LETTERS[i]}-${i}`} style={s.dayCol}>
            <Text style={s.dayLetter}>{LETTERS[i]}</Text>
            <View
              style={[
                s.cell,
                state === 'done' && { backgroundColor: color },
                state === 'missed' && {
                  backgroundColor: alpha(color, 0.16),
                  borderWidth: 1.5,
                  borderColor: color,
                },
                state === 'todo' && { borderWidth: 1.5, borderColor: alpha(color, 0.3) },
              ]}
            />
          </View>
        ))}
      </View>
      <Text style={s.caption}>
        One miss, forgiven. The streak carries on — miss again before you check in and it goes.
      </Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  frame: { gap: spacing.sm },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  time: { width: 62, fontFamily: fonts.body, fontSize: 11, color: colors.textFaint },
  tick: { width: 3, height: 15, borderRadius: 2 },
  anchor: { fontFamily: fonts.display, fontSize: 15, letterSpacing: -0.4 },
  hang: { paddingLeft: 74, paddingVertical: 5 },
  card: { borderRadius: 13, paddingVertical: 9, paddingHorizontal: spacing.md },
  cardName: { fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.4, color: '#FFFFFF' },
  cardSub: { fontFamily: fonts.body, fontSize: 11, color: alpha('#FFFFFF', 0.72), marginTop: 1 },

  streak: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  streakN: { fontFamily: fonts.display, fontSize: 38, letterSpacing: -1.4 },
  streakL: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1.8, color: colors.textMuted },
  tiles: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  tile: { alignItems: 'center', gap: 3 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#FFFFFF' },
  tileName: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  tileState: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.textFaint },

  week: { flexDirection: 'row', gap: 6 },
  dayCol: { flex: 1, alignItems: 'center', gap: 5 },
  dayLetter: { fontFamily: fonts.body, fontSize: 10, color: colors.textFaint },
  cell: { width: '100%', height: 30, borderRadius: 7 },
  caption: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textFaint,
    marginTop: spacing.sm,
  },
}) as const;
