import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { darkPalette as c, display, fonts, habitColors } from '@/theme';

const { width: W } = Dimensions.get('window');
// Drawn on a 390-wide phone; everything across scales from there.
const k = W / 390;
const FACES = [['Y', habitColors[1]], ['M', habitColors[2]], ['D', habitColors[4]], ['S', habitColors[3]]] as const;

/**
 * Three cards from the app as it looks now — a to-do list, My Day, a crew
 * streak — tilted over the mountains at the top of the paywall.
 *
 * Drawn, not the real components: those need a signed-in user's data, and
 * this has to look the same for everybody.
 */
export function ProCollage({ top }: { top: number }) {
  return (
    <View style={[s.root, { height: top + 230 }]} pointerEvents="none">
      <View style={[s.card, s.todo, { left: -14 * k, top: top + 22, transform: [{ rotate: '-10deg' }] }]}>
        <Text style={s.kicker}>To-dos</Text>
        <Todo label="Email landlord" done />
        <Todo label="Dry cleaning" />
        <Todo label="Book flights" />
      </View>

      <View style={[s.card, s.crew, { left: 266 * k, top: top + 44, transform: [{ rotate: '9deg' }] }]}>
        <Text style={[s.kicker, { color: 'rgba(255,255,255,0.75)' }]}>Morning crew</Text>
        <Text style={[display(62), s.white, { marginTop: 6 }]}>23</Text>
        <Text style={[s.kicker, s.white]}>Day streak</Text>
        <View style={s.faces}>
          {FACES.map(([f, color]) => (
            <View key={f} style={[s.face, { backgroundColor: color }]}>
              <Text style={s.faceText}>{f}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[s.card, s.day, { left: 96 * k, top: top - 2, transform: [{ rotate: '-3deg' }] }]}>
        <Text style={s.kicker}>Fri 31 Oct</Text>
        <Text style={[display(27), s.text, { marginTop: 2, marginBottom: 3 }]}>My Day</Text>
        <Block time="7:30" label="☕ Coffee" />
        <Block label="📖 Read 10 pages" color={habitColors[2]} />
        <Block time="10:00" label="Dentist" calendar />
        <Block time="12:30" label="🥪 Lunch" />
      </View>
    </View>
  );
}

function Todo({ label, done }: { label: string; done?: boolean }) {
  return (
    <View style={s.todoRow}>
      <View style={[s.box, done && s.boxDone]} />
      <Text style={s.small}>{label}</Text>
    </View>
  );
}

function Block({ time, label, color, calendar }: { time?: string; label: string; color?: string; calendar?: boolean }) {
  return (
    <View style={[s.block, color && { backgroundColor: color, marginLeft: 16 }, calendar && s.calendar]}>
      {time && <Text style={s.time}>{time}</Text>}
      <Text style={[s.small, color && { fontFamily: fonts.bodyBold, color: '#FFFFFF' }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, top: 0 },
  card: {
    position: 'absolute',
    borderRadius: 18,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 18 },
  },
  todo: { width: 132 * k, height: 120, gap: 7, backgroundColor: 'rgba(28,28,31,0.95)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  crew: { width: 120 * k, height: 150, backgroundColor: habitColors[0] },
  day: { width: 196 * k, gap: 5, backgroundColor: 'rgba(14,14,16,0.94)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 8.5, letterSpacing: 1.2, textTransform: 'uppercase', color: c.textFaint },
  text: { color: c.text },
  white: { color: '#FFFFFF' },
  small: { fontFamily: fonts.body, fontSize: 11, color: c.text },
  time: { fontFamily: fonts.body, fontSize: 9.5, width: 30, color: c.textFaint, fontVariant: ['tabular-nums'] },
  block: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 10, backgroundColor: 'rgba(40,40,44,0.85)' },
  calendar: { backgroundColor: 'rgba(74,127,212,0.24)', borderLeftWidth: 3, borderLeftColor: '#4A7FD4', borderRadius: 6 },
  todoRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  box: { width: 11, height: 11, borderRadius: 3, borderWidth: 1.5, borderColor: c.textMuted },
  boxDone: { backgroundColor: '#7FD1A4', borderColor: '#7FD1A4' },
  faces: { flexDirection: 'row', marginTop: 12 },
  face: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: habitColors[0], marginRight: -6, alignItems: 'center', justifyContent: 'center' },
  faceText: { fontFamily: fonts.bodyBold, fontSize: 9, color: '#FFFFFF' },
});
