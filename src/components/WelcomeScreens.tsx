import { BlurView } from 'expo-blur';
import { Text, View } from 'react-native';

import { useStyles } from '@/lib/appearance';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

export type ScreenKind = 'day' | 'crew' | 'nudge' | 'progress';

/**
 * Whole screens, full bleed — not fragments, and not framed.
 *
 * They had a bordered frame first, which made them read as a brochure of the
 * app rather than the app: a phone drawn inside a phone, with its type
 * sized for neither. Edge to edge, under the headline, they read as the
 * thing itself.
 *
 * A fragment is a diagram of a feature; a full screen is evidence the app
 * exists and has been thought about. Everything here is drawn rather than
 * screenshotted so it follows the theme and cannot go stale, but each one is
 * the complete composition: header, content, dock.
 *
 * The frame is deliberately plain. A glossy phone bezel would make these read
 * as marketing renders of some other app; a thin card reads as "this is the
 * screen".
 */
export function WelcomeScreen({
  kind,
  color,
  dock = true,
}: {
  kind: ScreenKind;
  color: string;
  /** Off when the headline sits over the bottom of the screen. */
  dock?: boolean;
}) {
  const s = useStyles(makeStyles);
  const inner =
    kind === 'day' ? <Day color={color} dock={dock} /> :
    kind === 'crew' ? <Crew color={color} dock={dock} /> :
    kind === 'nudge' ? <Nudge color={color} dock={dock} /> :
    <Progress color={color} dock={dock} />;

  return (
    <View style={s.frameWrap}>
      {/* Glass, not a solid sheet: the colour bleed behind comes through, so
          the screen sits in the same light as everything else. */}
      <BlurView intensity={24} tint="dark" style={s.glass} />
      <View style={s.frame}>{inner}</View>
    </View>
  );
}

function Dock({ active, color }: { active: string; color: string }) {
  const s = useStyles(makeStyles);
  const tabs = ['Today', 'My Day', 'Crews', 'Progress', 'You'];
  return (
    <View style={s.dock}>
      {tabs.map((t) => (
        <Text key={t} style={[s.tab, t === active && { color }]}>
          {t}
        </Text>
      ))}
    </View>
  );
}

function Head({ small, big }: { small: string; big: string }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.head}>
      <Text style={s.headSmall}>{small}</Text>
      <Text style={s.headBig}>{big}</Text>
    </View>
  );
}

/** A whole day: moments down the left, habits hanging off them, now in red. */
function Day({ color, dock }: { color: string; dock: boolean }) {
  const s = useStyles(makeStyles);
  const rows: { t: string; a?: string; ac?: string; h?: string; hc?: string; now?: boolean }[] = [
    { t: '8:00', a: 'WAKE UP', ac: habitColors[1] },
    { t: '', h: 'MAKE THE BED', hc: habitColors[1] },
    { t: '8:15', a: 'COFFEE', ac: habitColors[2] },
    { t: '9:00', a: 'WORK', ac: habitColors[5] },
    { t: '', h: 'INBOX ZERO', hc: habitColors[0] },
    { t: '11:24', now: true },
    { t: '12:30', a: 'LUNCH', ac: habitColors[0] },
    { t: '', h: 'WALK 15 MIN', hc: habitColors[4] },
    { t: '6:00', a: 'HOME', ac: habitColors[2] },
    { t: '', h: 'TIDY ONE THING', hc: habitColors[3] },
    { t: '8:30', a: 'WIND DOWN', ac: habitColors[3] },
    { t: '', h: 'READ 10 PAGES', hc: habitColors[5] },
    { t: '11:00', a: 'BED', ac: habitColors[0] },
  ];
  return (
    <>
      <Head small="Fri 25 Sep" big="MY DAY" />
      <View style={s.body}>
        {rows.map((r, i) => (
          <View key={i} style={s.dayRow}>
            <Text style={[s.dayTime, r.now && { color: habitColors[1] }]}>{r.t}</Text>
            {r.now ? (
              <View style={s.nowWrap}>
                <View style={[s.nowDot, { backgroundColor: habitColors[1] }]} />
                <View style={[s.nowLine, { backgroundColor: alpha(habitColors[1], 0.6) }]} />
              </View>
            ) : r.a ? (
              <View style={s.anchorWrap}>
                <View style={[s.anchorTick, { backgroundColor: r.ac }]} />
                <Text style={[s.anchorLabel, { color: r.ac }]}>{r.a}</Text>
              </View>
            ) : (
              <View style={[s.habit, { backgroundColor: r.hc }]}>
                <Text style={s.habitName}>{r.h}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
      {dock && <Dock active="My Day" color={color} />}
    </>
  );
}

const MEMBERS = [
  { n: 'You', i: 'Y', c: habitColors[1], st: 'In', w: [1, 1, 1, 1, 1, 1, 1] },
  { n: 'Marcus', i: 'M', c: habitColors[0], st: 'In', w: [1, 1, 1, 1, 1, 1, 1] },
  { n: 'Dee', i: 'D', c: habitColors[2], st: 'Nudge', w: [1, 1, 0.5, 1, 1, 1, 0] },
  { n: 'Sam', i: 'S', c: habitColors[3], st: 'In', w: [1, 1, 1, 1, 0.5, 1, 1] },
];
const DAYS = ['done', 'done', 'grace', 'done', 'done', 'done', 'todo'] as const;

/** A whole crew: the shared streak, the week, and who still owes today. */
function Crew({ color, dock }: { color: string; dock: boolean }) {
  const s = useStyles(makeStyles);
  return (
    <>
      <Head small="Crew · 10 min stretch" big="WEEKENDER" />
      <View style={s.body}>
        <View style={[s.bigStreak, { backgroundColor: alpha(color, 0.14), borderColor: alpha(color, 0.5) }]}>
          <Text style={[s.bigStreakN, { color }]}>23</Text>
          <Text style={s.bigStreakL}>DAY STREAK · BEST 31</Text>
        </View>
        <View style={s.weekRow}>
          {DAYS.map((d, i) => (
            <View
              key={i}
              style={[
                s.weekCell,
                d === 'done' && { backgroundColor: color },
                d === 'grace' && { backgroundColor: alpha(color, 0.18), borderWidth: 1, borderColor: color },
                d === 'todo' && { borderWidth: 1, borderColor: alpha(color, 0.3) },
              ]}
            />
          ))}
        </View>
        {MEMBERS.map((m) => (
          <View key={m.n} style={s.member}>
            <View style={s.memberRow}>
              <View style={[s.memberDot, { backgroundColor: m.c }]}>
                <Text style={s.memberLetter}>{m.i}</Text>
              </View>
              <Text style={s.memberName}>{m.n}</Text>
              <Text style={[s.memberState, m.st === 'In' && { color: habitColors[2] }]}>{m.st}</Text>
            </View>
            {/* Everyone's own seven days: a crew is four people keeping the
                same streak from four different weeks. */}
            <View style={s.memberWeek}>
              {m.w.map((v, i) => (
                <View
                  key={i}
                  style={[
                    s.memberCell,
                    v === 1 && { backgroundColor: m.c },
                    v === 0.5 && { backgroundColor: alpha(m.c, 0.2), borderWidth: 1, borderColor: m.c },
                    v === 0 && { borderWidth: 1, borderColor: alpha(m.c, 0.25) },
                  ]}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
      {dock && <Dock active="Crews" color={color} />}
    </>
  );
}

/** A whole nudge: the push that lands, and the screen it opens. */
function Nudge({ color, dock }: { color: string; dock: boolean }) {
  const s = useStyles(makeStyles);
  return (
    <>
      <View style={s.push}>
        <View style={[s.pushIcon, { backgroundColor: color }]} />
        <View style={s.pushText}>
          <Text style={s.pushTitle}>Marcus nudged you</Text>
          <Text style={s.pushBody} numberOfLines={2}>
            “You’re the last one.” Weekender is 3 of 4.
          </Text>
        </View>
      </View>
      <View style={s.pushActions}>
        <View style={[s.pushAction, { borderColor: alpha(color, 0.6) }]}>
          <Text style={[s.pushActionLabel, { color }]}>Check in</Text>
        </View>
        <View style={s.pushAction}>
          <Text style={s.pushActionLabel}>Heading out now</Text>
        </View>
      </View>

      <Head small="From Marcus · 6:04 pm" big="YOU’RE THE LAST ONE" />
      <View style={s.body}>
        <View style={[s.quote, { borderLeftColor: color }]}>
          <Text style={s.quoteText}>“Walk time!”</Text>
        </View>
        <View style={[s.cta, { backgroundColor: color }]}>
          <Text style={s.ctaLabel}>CHECK IN</Text>
        </View>
        <Text style={s.small}>One nudge each a day, and only if you still owe it.</Text>

        <View style={[s.saved, { borderColor: alpha(color, 0.45), backgroundColor: alpha(color, 0.1) }]}>
          <Text style={[s.savedN, { color }]}>Streak saved · 23 days</Text>
          <Text style={s.savedSub}>You were the last one in.</Text>
        </View>

        <View style={s.reactions}>
          {['Say thanks', 'Same time tomorrow'].map((r) => (
            <View key={r} style={[s.reaction, { borderColor: alpha(color, 0.5) }]}>
              <Text style={[s.reactionLabel, { color }]}>{r}</Text>
            </View>
          ))}
        </View>
      </View>
      {dock && <Dock active="Crews" color={color} />}
    </>
  );
}

/**
 * Six, not four. The real screen names every habit up to eight, and a person
 * who has been at this a few weeks has more than four — four left the slide
 * with a third of it empty, which reads as a thin app rather than a calm one.
 */
const HABITS = [
  { n: '10 min stretch', c: habitColors[1], pct: 0.83 },
  { n: 'Inbox zero', c: habitColors[0], pct: 1 },
  { n: 'Yogurt bowl', c: habitColors[4], pct: 1 },
  { n: 'Walk 15 min', c: habitColors[2], pct: 0.66 },
  { n: 'Read 10 pages', c: habitColors[3], pct: 0.71 },
  { n: 'Tidy one thing', c: habitColors[5], pct: 0.93 },
];

/**
 * The Progress tab as it actually is: one rate, then a bar per habit, weakest
 * first, and the one sentence saying what to do about the worst of them.
 *
 * It used to draw rings, a heat wall, a trend and a pair of Needs work / Going
 * well tabs — a screen the app no longer has, and in places never had. The
 * first thing a new person sees was selling them a tab they would go looking
 * for and not find, which is worse than showing them nothing.
 */
function Progress({ color, dock }: { color: string; dock: boolean }) {
  const s = useStyles(makeStyles);
  // Weakest first, the way the real screen sorts it.
  const ranked = [...HABITS].sort((a, b) => a.pct - b.pct);
  return (
    <>
      <Head small="This week · 20–26 Sep" big="87%" />
      <View style={s.body}>
        <View style={s.periods}>
          <View style={s.period}>
            <Text style={s.periodLabel}>Day</Text>
          </View>
          <View style={[s.period, s.periodOn]}>
            <Text style={s.periodLabelOn}>Week</Text>
          </View>
          <View style={s.period}>
            <Text style={s.periodLabel}>Month</Text>
          </View>
        </View>

        <Text style={s.small}>20 of 23 due · 20–26 Sep</Text>

        <View style={s.barsHead}>
          <Text style={s.barsTitle}>Each habit</Text>
          <Text style={s.barsSort}>Weakest first</Text>
        </View>

        {ranked.map((h) => (
          <View key={h.n} style={s.barRow}>
            <Text style={s.barName} numberOfLines={1}>{h.n}</Text>
            <View style={s.barTrack}>
              <View
                style={[s.barFill, { width: `${Math.round(h.pct * 100)}%`, backgroundColor: h.c }]}
              />
            </View>
            <Text style={s.barPct}>{Math.round(h.pct * 100)}%</Text>
          </View>
        ))}

        <View style={[s.advice, { borderColor: alpha(color, 0.5), backgroundColor: alpha(color, 0.1) }]}>
          <Text style={s.adviceName}>Your week</Text>
          <Text style={s.adviceText}>
            Walk 15 min keeps breaking on Tuesdays. Drop that day and the rest holds.
          </Text>
        </View>
      </View>
      {dock && <Dock active="Progress" color={color} />}
    </>
  );
}

const makeStyles = (colors: Palette) => ({
  frameWrap: { flex: 1, overflow: 'hidden' },
  glass: {
    ...({ position: 'absolute' } as const),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: alpha(colors.bg, 0.52),
  },
  frame: { flex: 1, paddingTop: spacing.md },
  // Full bleed means the screen owns the whole slide; the words sit on top.
  head: { paddingHorizontal: spacing.md, gap: 1 },
  headSmall: { fontFamily: fonts.body, fontSize: 11, color: colors.textFaint },
  headBig: { fontFamily: fonts.display, fontSize: 32, letterSpacing: -0.9, color: colors.text },
  body: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: 4 },
  small: { fontFamily: fonts.body, fontSize: 10, color: colors.textFaint, marginTop: 2 },

  dock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: alpha(colors.overlay, 0.1),
  },
  tab: { fontFamily: fonts.body, fontSize: 10, color: colors.textFaint },

  dayRow: { flexDirection: 'row', alignItems: 'center', minHeight: 30 },
  dayTime: { width: 34, fontFamily: fonts.body, fontSize: 9, color: colors.textFaint },
  anchorWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  anchorTick: { width: 3, height: 13, borderRadius: 2 },
  anchorLabel: { fontFamily: fonts.display, fontSize: 13, letterSpacing: -0.2 },
  habit: { flex: 1, marginLeft: 10, borderRadius: 9, paddingVertical: 7, paddingHorizontal: 9 },
  habitName: { fontFamily: fonts.display, fontSize: 13, letterSpacing: -0.2, color: '#FFFFFF' },
  nowWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  nowDot: { width: 4, height: 4, borderRadius: 2 },
  nowLine: { flex: 1, height: 1 },

  bigStreak: {
    borderWidth: 1,
    borderRadius: radii.card,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: 4,
  },
  bigStreakN: { fontFamily: fonts.display, fontSize: 46, letterSpacing: -1.2 },
  bigStreakL: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1.2, color: colors.textMuted },
  weekRow: { flexDirection: 'row', gap: 3, marginBottom: 5 },
  weekCell: { flex: 1, height: 22, borderRadius: 5 },
  member: { paddingVertical: 5 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  memberWeek: { flexDirection: 'row', gap: 3, marginTop: 4, marginLeft: 35 },
  memberCell: { flex: 1, height: 8, borderRadius: 2 },
  memberDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  memberLetter: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
  memberName: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.text },
  memberState: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textFaint },

  push: {
    flexDirection: 'row',
    gap: 6,
    margin: spacing.sm,
    padding: 7,
    borderRadius: 12,
    backgroundColor: alpha(colors.overlay, 0.1),
  },
  pushIcon: { width: 26, height: 26, borderRadius: 7 },
  pushText: { flex: 1 },
  pushTitle: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
  pushBody: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  pushActions: { flexDirection: 'row', gap: 5, marginHorizontal: spacing.sm, marginBottom: spacing.sm },
  pushAction: {
    flex: 1,
    borderWidth: 1,
    borderColor: alpha(colors.overlay, 0.16),
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
  },
  pushActionLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted },
  quote: { borderLeftWidth: 2, paddingLeft: 7, paddingVertical: 2, marginVertical: 5 },
  quoteText: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.4, color: colors.text },
  cta: { borderRadius: 999, alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  ctaLabel: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 1, color: '#FFFFFF' },

  saved: {
    borderWidth: 1,
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  savedN: { fontFamily: fonts.bodyBold, fontSize: 14 },
  savedSub: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 1 },
  reactions: { flexDirection: 'row', gap: 6, marginTop: 7 },
  reaction: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  reactionLabel: { fontFamily: fonts.bodyBold, fontSize: 11 },

  advice: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.md,
    marginTop: 7,
  },
  adviceName: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
  adviceText: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: colors.textMuted, marginTop: 2 },

  periods: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  period: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: alpha(colors.overlay, 0.18),
  },
  periodOn: { backgroundColor: colors.text, borderColor: 'transparent' },
  periodLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted },
  periodLabelOn: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.bg },
  barsHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.md,
    marginBottom: 2,
  },
  barsTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  barsSort: { fontFamily: fonts.body, fontSize: 10, color: colors.textFaint },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  // Wide enough for the longest name here: truncated labels on a slide read
  // as a mistake rather than as a screen that is simply full.
  barName: { width: 88, fontFamily: fonts.body, fontSize: 11, color: colors.text },
  barTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: alpha(colors.overlay, 0.1),
  },
  barFill: { height: '100%', borderRadius: 6 },
  barPct: { width: 30, textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted },
}) as const;
