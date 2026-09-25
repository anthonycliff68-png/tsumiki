import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useStyles } from '@/lib/appearance';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

export type ScreenKind = 'day' | 'crew' | 'nudge' | 'progress';

/**
 * Whole screens, shrunk — not fragments.
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
export function WelcomeScreen({ kind, color }: { kind: ScreenKind; color: string }) {
  const s = useStyles(makeStyles);
  const inner =
    kind === 'day' ? <Day color={color} /> :
    kind === 'crew' ? <Crew color={color} /> :
    kind === 'nudge' ? <Nudge color={color} /> :
    <Progress color={color} />;

  return (
    <View style={[s.frame, { borderColor: alpha(color, 0.45), shadowColor: color }]}>
      {inner}
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
function Day({ color }: { color: string }) {
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
      <Dock active="My Day" color={color} />
    </>
  );
}

const MEMBERS = [
  { n: 'You', i: 'Y', c: habitColors[1], st: 'In' },
  { n: 'Marcus', i: 'M', c: habitColors[0], st: 'In' },
  { n: 'Dee', i: 'D', c: habitColors[2], st: 'Nudge' },
  { n: 'Sam', i: 'S', c: habitColors[3], st: 'In' },
];
const DAYS = ['done', 'done', 'grace', 'done', 'done', 'done', 'todo'] as const;

/** A whole crew: the shared streak, the week, and who still owes today. */
function Crew({ color }: { color: string }) {
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
          <View key={m.n} style={s.memberRow}>
            <View style={[s.memberDot, { backgroundColor: m.c }]}>
              <Text style={s.memberLetter}>{m.i}</Text>
            </View>
            <Text style={s.memberName}>{m.n}</Text>
            <Text style={[s.memberState, m.st === 'In' && { color: habitColors[2] }]}>{m.st}</Text>
          </View>
        ))}
      </View>
      <Dock active="Crews" color={color} />
    </>
  );
}

/** A whole nudge: the push that lands, and the screen it opens. */
function Nudge({ color }: { color: string }) {
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
      </View>
      <Dock active="Crews" color={color} />
    </>
  );
}

const HABITS = [
  { n: '10 min stretch', c: habitColors[1], pct: 0.83, w: [1, 1, 1, 1, 1, 0.2, 0] },
  { n: 'Inbox zero', c: habitColors[0], pct: 1, w: [1, 1, 1, 1, 1, 1, 0] },
  { n: 'Yogurt bowl', c: habitColors[4], pct: 1, w: [1, 1, 1, 1, 1, 1, 0] },
  { n: 'Walk 15 min', c: habitColors[2], pct: 0.66, w: [1, 0.2, 1, 0.2, 1, 1, 0] },
];
const TREND = [0.4, 0.75, 0.6, 1, 0.85, 0.5, 0.9, 1, 0.7, 1, 0.95, 0.6, 1, 0.8];

/** A whole month of analytics: rings, a heat wall, and a trend, on one screen. */
function Progress({ color }: { color: string }) {
  const s = useStyles(makeStyles);
  return (
    <>
      <Head small="This week · 20–26 Sep" big="94%" />
      <View style={s.body}>
        <View style={s.ringRow}>
          {HABITS.slice(0, 4).map((h) => (
            <View key={h.n} style={s.ringWrap}>
              <View style={[s.ring, { borderColor: alpha(h.c, 0.25) }]}>
                <View
                  style={[
                    s.ringFill,
                    { borderColor: h.c, transform: [{ rotate: `${h.pct * 300}deg` }] },
                  ]}
                />
                <Text style={[s.ringPct, { color: h.c }]}>{Math.round(h.pct * 100)}</Text>
              </View>
            </View>
          ))}
        </View>

        {HABITS.map((h) => (
          <View key={h.n} style={s.wallRow}>
            <Text style={s.wallName} numberOfLines={1}>{h.n}</Text>
            <View style={s.wallCells}>
              {h.w.map((v, i) => (
                <View
                  key={i}
                  style={[
                    s.wallCell,
                    v === 1 && { backgroundColor: h.c },
                    v > 0 && v < 1 && { backgroundColor: alpha(h.c, 0.2), borderWidth: 1, borderColor: h.c },
                    v === 0 && { borderWidth: 1, borderColor: alpha(h.c, 0.22) },
                  ]}
                />
              ))}
            </View>
          </View>
        ))}

        <View style={s.trend}>
          {TREND.map((v, i) => (
            <View key={i} style={[s.trendBar, { height: 6 + v * 56, backgroundColor: alpha(color, 0.35 + v * 0.6) }]} />
          ))}
        </View>
        <Text style={s.small}>Thirty days. The shape says more than the number.</Text>
      </View>
      <Dock active="Progress" color={color} />
    </>
  );
}

const makeStyles = (colors: Palette) => ({
  frame: {
    flex: 1,
    borderRadius: 26,
    borderWidth: 1,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    paddingTop: spacing.md,
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
  },
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
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7 },
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

  ringRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  ringWrap: { alignItems: 'center' },
  ring: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFill: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  ringPct: { fontFamily: fonts.bodyBold, fontSize: 13 },
  wallRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4 },
  wallName: { width: 74, fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  wallCells: { flex: 1, flexDirection: 'row', gap: 2 },
  wallCell: { flex: 1, height: 15, borderRadius: 4 },
  trend: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 64, marginTop: 12 },
  trendBar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
}) as const;
