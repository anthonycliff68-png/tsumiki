import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Lift, type Drag } from '@/components/Lift';
import { useStyles } from '@/lib/appearance';
import { fonts, spacing, type Palette } from '@/theme';

const DONE_ROW_H = 36;
/** A two-line card, for one that has never been laid out open. */
const OPEN_CARD_H = 66;
/** How long after a tap another tap on the same row is ignored. */
const TAP_SETTLE_MS = 450;

const WAVE_H = 11;
const WATER_RESERVE = 56;
const CREST_FRONT =
  `M0 ${WAVE_H} C 12 1, 26 1, 38 ${WAVE_H * 0.5} S 74 ${WAVE_H}, 88 ${WAVE_H * 0.3} S 100 ${WAVE_H}, 100 ${WAVE_H}` +
  ` C 112 1, 126 1, 138 ${WAVE_H * 0.5} S 174 ${WAVE_H}, 188 ${WAVE_H * 0.3} S 200 ${WAVE_H}, 200 ${WAVE_H} Z`;
const CREST_BACK =
  `M0 ${WAVE_H} C 16 2, 30 ${WAVE_H * 0.9}, 50 ${WAVE_H * 0.35} S 82 2, 100 ${WAVE_H}` +
  ` C 116 2, 130 ${WAVE_H * 0.9}, 150 ${WAVE_H * 0.35} S 182 2, 200 ${WAVE_H} Z`;

function WaterLayer({ color, width, crest, crestOpacity }: { color: string; width: number; crest: string; crestOpacity: Animated.AnimatedInterpolation<number> }) {
  return (
    <View style={{ position: 'absolute', left: -width, top: 0, bottom: 0, width: width * 2 }}>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: -WAVE_H + 1, height: WAVE_H, opacity: crestOpacity }}>
        <Svg width="100%" height={WAVE_H} viewBox={`0 0 200 ${WAVE_H}`} preserveAspectRatio="none">
          <Path d={crest} fill={color} />
        </Svg>
      </Animated.View>
      <View style={{ flex: 1, backgroundColor: color }} />
    </View>
  );
}

/**
 * A habit or a to-do on My Day, and the water on checking it off. `children`
 * draws the open row inside `box`, given whether its words should be white.
 * Done, it is the slim line filled solid in its colour.
 */
export function WaterRow({
  done,
  color,
  title,
  emoji,
  pill,
  onToggle,
  drag,
  box,
  height,
  narrow = false,
  children,
}: {
  done: boolean;
  color: string;
  title: string;
  emoji: string;
  /** The length pill, white, on the done line. */
  pill?: ReactNode;
  onToggle: () => void;
  drag: Drag;
  /** The open row's own look: the glass card or the tinted row. */
  box: StyleProp<ViewStyle>;
  /** Set on a to-scale timeline: exactly this tall. */
  height?: number;
  /** Sharing the width: just the name, so it fits its lane. */
  narrow?: boolean;
  children: (wet: boolean) => ReactNode;
}) {
  const styles = useStyles(makeStyles);
  const [fold] = useState(() => new Animated.Value(1));
  const [rise] = useState(() => new Animated.Value(0));
  const [drift] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(1));
  const [strike] = useState(() => new Animated.Value(done ? 1 : 0));
  const was = useRef(done);
  /**
   * fill: checking off — water rises, card folds to a line.
   * unstrike, drain: undoing — the line pulls back, the row grows into a card
   * still full of colour, and the water sinks out the bottom. Quieter than the
   * fill: no splash, no bounce, because undoing is a correction.
   */
  const [phase, setPhase] = useState<'fill' | 'unstrike' | 'drain' | null>(null);
  /** The water has reached the words: only now do they turn white, or they flash white on the bright card. */
  const [soaked, setSoaked] = useState(false);
  const celebrating = phase === 'fill' || phase === 'drain';
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [nameW, setNameW] = useState(0);

  // A row that was already done when it mounted was never measured open.
  const openH = size.h || OPEN_CARD_H;

  /**
   * Built once per size, never per render.
   *
   * A fresh interpolation on every render looks harmless and is not: when React
   * Native swaps the old one out, the value behind it is left with nothing
   * attached for a moment and stops whatever animation it was running. A
   * check-in or an undo re-renders the day a fraction of a second later, when
   * the server answers, so the strike or the fold was being cancelled partway
   * through — and the card, waiting for an animation that would never finish,
   * stayed stuck and stopped taking taps.
   */
  const strikeW = useMemo(() => strike.interpolate({ inputRange: [0, 1], outputRange: [0, nameW] }), [strike, nameW]);
  const foldH = useMemo(() => fold.interpolate({ inputRange: [0, 1], outputRange: [DONE_ROW_H, openH] }), [fold, openH]);
  const riseY = useMemo(() => rise.interpolate({ inputRange: [0, 1], outputRange: [openH, 0] }), [rise, openH]);
  const driftBack = useMemo(() => drift.interpolate({ inputRange: [0, 1], outputRange: [size.w, 0] }), [drift, size.w]);
  const driftFront = useMemo(() => drift.interpolate({ inputRange: [0, 1], outputRange: [0, size.w] }), [drift, size.w]);
  // Hide the wave once the row is full, or its trough shows as a notch on the top edge.
  const crest = useMemo(
    () => rise.interpolate({ inputRange: [0, 0.95, 1], outputRange: [1, 1, 0], extrapolate: 'clamp' }),
    [rise],
  );

  /**
   * Which run of the animation is current. Every step hands on to the next
   * whether or not it was interrupted, so a card can never be left waiting —
   * but only if it still belongs to the latest run, so a step from a check-in
   * that was undone halfway cannot overwrite the undo.
   */
  const run = useRef(0);

  /**
   * One tap per change. A tap takes about a tenth of a second to come back as a
   * new check-in state and start its animation, and until then the phase guard
   * below has nothing to go on — a quick double tap landed both, checking the
   * habit in and straight back out. Taps inside this window are the same tap.
   */
  const lastTap = useRef(0);
  const press = () => {
    const now = Date.now();
    if (phase !== null || now - lastTap.current < TAP_SETTLE_MS) return;
    lastTap.current = now;
    onToggle();
  };

  useEffect(() => {
    if (done === was.current) return;
    const justDone = done;
    was.current = done;
    const mine = ++run.current;
    const current = () => mine === run.current;
    drift.setValue(0);
    const drifting = Animated.loop(Animated.timing(drift, { toValue: 1, duration: 1500, useNativeDriver: true }));

    if (!justDone) {
      setPhase('unstrike');
      Animated.timing(strike, { toValue: 0, duration: 140, useNativeDriver: false }).start(() => {
        if (!current()) return;
        fold.setValue(0);
        rise.setValue(1);
        setPhase('drain');
        drifting.start();
        Animated.sequence([
          Animated.timing(fold, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }),
          Animated.delay(80),
          Animated.timing(rise, { toValue: 0, duration: 340, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]).start(() => {
          drifting.stop();
          if (current()) setPhase(null);
        });
      });
      return () => drifting.stop();
    }

    fold.setValue(1);
    rise.setValue(0);
    strike.setValue(0);
    setSoaked(false);
    setPhase('fill');
    const watch = rise.addListener(({ value }) => {
      if (value < 0.5) return;
      rise.removeListener(watch);
      if (current()) setSoaked(true);
    });
    drifting.start();
    Animated.sequence([
      Animated.parallel([
        Animated.spring(rise, { toValue: 1, useNativeDriver: true, speed: 13, bounciness: 12 }),
        Animated.sequence([
          Animated.delay(154),
          Animated.spring(scale, { toValue: 1.03, useNativeDriver: true, speed: 60, bounciness: 16 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 6 }),
        ]),
      ]),
      Animated.delay(150),
      Animated.timing(fold, { toValue: 0, duration: 180, useNativeDriver: false }),
    ]).start(() => {
      drifting.stop();
      if (!current()) return;
      setPhase(null);
      Animated.timing(strike, { toValue: 1, duration: 130, useNativeDriver: false }).start();
    });
    return () => {
      drifting.stop();
      rise.removeListener(watch);
    };
  }, [done, drift, fold, rise, scale, strike]);

  // At rest, draw what the row last settled as, not the new value: for the one
  // frame between a tap landing and the animation starting, drawing the new
  // value flashed the finished state before the animation played it.
  // eslint-disable-next-line react-hooks/refs -- read after the effect has synced it
  if (phase === 'unstrike' || (phase === null && was.current)) {
    return (
      <Lift drag={drag} onTap={press}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ checked: true }}
          accessibilityLabel={`Undo ${title}`}
          onPress={press}
          style={[styles.doneRow, { backgroundColor: color }]}
        >
          {emoji ? <Text style={styles.doneEmoji}>{emoji}</Text> : null}
          <View style={{ flex: 1 }}>
            <View style={{ alignSelf: 'flex-start', maxWidth: '100%' }} onLayout={(e) => setNameW(e.nativeEvent.layout.width)}>
              <Text style={styles.doneName} numberOfLines={1}>
                {title}
              </Text>
              <Animated.View style={[styles.strike, { width: strikeW }]} />
            </View>
          </View>
          {!narrow && pill}
          {!narrow && <Text style={styles.doneWhen}>Complete</Text>}
        </Pressable>
      </Lift>
    );
  }

  // White words only once the rising fill is under them; a drain starts full of
  // colour and ends on the card, where the normal ink reads at both ends.
  const wet = phase === 'fill' && soaked;

  return (
    <Lift drag={drag} onTap={press}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Finish ${title}`} onPress={press}>
        {/* Two views: scale runs on the native driver and height cannot, and
            one view carrying both crashes on the fold. */}
        <Animated.View style={{ transform: [{ scale }] }}>
          <Animated.View
            onLayout={(e) => {
              const { width: w, height: h } = e.nativeEvent.layout;
              // Width never changes mid-animation, so it is always safe to take.
              setSize((prev) => (celebrating ? { w, h: prev.h } : { w, h }));
            }}
            style={[box, styles.clip, { height: celebrating ? foldH : height }]}
          >
            {celebrating && (
              <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { bottom: -WATER_RESERVE, transform: [{ translateY: riseY }] }]}
              >
                <Animated.View
                  style={[StyleSheet.absoluteFill, { top: 4, opacity: 0.55, transform: [{ translateX: driftBack }] }]}
                >
                  <WaterLayer color={color} width={size.w} crest={CREST_BACK} crestOpacity={crest} />
                </Animated.View>
                <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: driftFront }] }]}>
                  <WaterLayer color={color} width={size.w} crest={CREST_FRONT} crestOpacity={crest} />
                </Animated.View>
              </Animated.View>
            )}
            {children(wet)}
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Lift>
  );
}

/** Water standing at a level, 0 empty to 1 full, behind a whole screen. */
export function TimerWater({ color, level }: { color: string; level: Animated.Value }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [drift] = useState(() => new Animated.Value(0));
  const [crest] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(drift, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [drift]);
  const y = useMemo(() => level.interpolate({ inputRange: [0, 1], outputRange: [box.h, 0] }), [level, box.h]);
  const back = useMemo(() => drift.interpolate({ inputRange: [0, 1], outputRange: [box.w, 0] }), [drift, box.w]);
  const front = useMemo(() => drift.interpolate({ inputRange: [0, 1], outputRange: [0, box.w] }), [drift, box.w]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box.w > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, { bottom: -WATER_RESERVE, transform: [{ translateY: y }] }]}>
          <Animated.View style={[StyleSheet.absoluteFill, { top: 4, opacity: 0.55, transform: [{ translateX: back }] }]}>
            <WaterLayer color={color} width={box.w} crest={CREST_BACK} crestOpacity={crest} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: front }] }]}>
            <WaterLayer color={color} width={box.w} crest={CREST_FRONT} crestOpacity={crest} />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  ({
    clip: { overflow: 'hidden' },
    doneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: DONE_ROW_H,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    doneEmoji: { fontSize: 14 },
    doneName: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 20, color: colors.white },
    strike: { position: 'absolute', left: 0, top: 10, height: 1.5, backgroundColor: colors.white },
    doneWhen: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.white },
  }) as const;
