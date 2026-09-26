import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton, TextButton } from '@/components/Button';
import { WelcomeScreen, type ScreenKind } from '@/components/WelcomeScreens';
import { copy } from '@/copy';
import { useStyles, useTheme } from '@/lib/appearance';
import { display, fonts, habitColors, spacing, type Palette } from '@/theme';

const { width: W } = Dimensions.get('window');
/** How far up the scrim reaches from the bottom of the slide. */
const SCRIM = 400;

/** One hue per idea. The bleed cross-fades between them as you swipe. */
const HUES: readonly string[] = [habitColors[1], habitColors[0], habitColors[5], habitColors[2]];

/** Never undefined, whatever the slide count does. */
const hue = (i: number): string => HUES[i % HUES.length] ?? habitColors[0];

/** Each slide shows the piece of the app it is talking about. */
const SHOWS: readonly ScreenKind[] = ['day', 'crew', 'nudge', 'progress'];
const show = (i: number): ScreenKind => SHOWS[i % SHOWS.length] ?? 'day';

type Props = {
  onStart: () => void;
  onSkip: () => void;
};

/**
 * The first thing anyone sees.
 *
 * Three cards rather than one screen, because "habit stacking" is not
 * self-evident and someone who does not understand "never miss twice" before
 * they sign up is someone who leaves in a week. It is the only place in the
 * app where explaining is worth a swipe.
 *
 * The background is not black: each idea has its own hue and the bleed
 * cross-fades as you move, so the colour is doing the work of telling you
 * where you are — the dots are only a confirmation.
 */
export function Welcome({ onStart, onSkip }: Props) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const x = useRef(new Animated.Value(0)).current;

  const slides = copy.welcome.slides;
  const last = index === slides.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / W);
    if (next !== index) setIndex(next);
  };

  const advance = () => {
    if (last) return onStart();
    scroller.current?.scrollTo({ x: W * (index + 1), animated: true });
  };

  return (
    <View style={styles.root}>
      <Bleed color={hue(index)} />

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], {
          useNativeDriver: false,
          listener: onScroll,
        })}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {slides.map((slide, i) => (
          <View
            key={slide.step}
            style={styles.slide}
            accessible
            accessibilityLabel={copy.welcome.slideOf(i + 1, slides.length)}
          >
            <View style={[styles.screen, { paddingTop: insets.top }]}>
              <WelcomeScreen kind={show(i)} color={hue(i)} dock={false} />
            </View>

            {/* A scrim under the words rather than a panel around them, so the
                screen keeps running behind the headline instead of stopping. */}
            <Svg width={W} height={SCRIM} style={styles.scrimSvg} pointerEvents="none">
              <Defs>
                <LinearGradient id="welcomeScrim" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.bg} stopOpacity="0" />
                  <Stop offset="0.45" stopColor={colors.bg} stopOpacity="0.86" />
                  <Stop offset="1" stopColor={colors.bg} stopOpacity="0.99" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={W} height={SCRIM} fill="url(#welcomeScrim)" />
            </Svg>

            <View style={styles.words}>
              <Text style={[styles.step, { color: hue(i) }]}>{slide.step.toUpperCase()}</Text>
              <Text style={[display(44, 40), styles.title]}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {slides.map((slide, i) => {
            const width = x.interpolate({
              inputRange: [W * (i - 1), W * i, W * (i + 1)],
              outputRange: [8, 26, 8],
              extrapolate: 'clamp',
            });
            const opacity = x.interpolate({
              inputRange: [W * (i - 1), W * i, W * (i + 1)],
              outputRange: [0.32, 1, 0.32],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={slide.step}
                style={[styles.dot, { width, opacity, backgroundColor: hue(index) }]}
              />
            );
          })}
        </View>

        <PrimaryButton label={last ? copy.welcome.start : copy.welcome.next} onPress={advance} />
        <TextButton label={copy.welcome.skip} onPress={onSkip} />
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  slide: { width: W },
  screen: { ...({ position: 'absolute' } as const), top: 0, left: 0, right: 0, bottom: 0 },
  scrimSvg: { ...({ position: 'absolute' } as const), left: 0, bottom: 0 },
  words: { marginTop: 'auto', paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: 6 },
  step: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 3.6 },
  title: { color: colors.text },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  foot: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: spacing.lg },
  dot: { height: 8, borderRadius: 4 },
}) as const;
