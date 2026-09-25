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

import { Bleed } from '@/components/Bleed';
import { PrimaryButton, TextButton } from '@/components/Button';
import { WelcomeShowcase, type ShowcaseKind } from '@/components/WelcomeShowcase';
import { copy } from '@/copy';
import { useStyles } from '@/lib/appearance';
import { display, fonts, habitColors, spacing, type Palette } from '@/theme';

const { width: W } = Dimensions.get('window');

/** One hue per idea. The bleed cross-fades between them as you swipe. */
const HUES: readonly string[] = [habitColors[1], habitColors[0], habitColors[2]];

/** Never undefined, whatever the slide count does. */
const hue = (i: number): string => HUES[i % HUES.length] ?? habitColors[0];

/** Each slide shows the piece of the app it is talking about. */
const SHOWS: readonly ShowcaseKind[] = ['stack', 'crew', 'rule'];
const show = (i: number): ShowcaseKind => SHOWS[i % SHOWS.length] ?? 'stack';

type Props = {
  onStart: () => void;
  onInvite: () => void;
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
export function Welcome({ onStart, onInvite }: Props) {
  const styles = useStyles(makeStyles);
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
            style={[styles.slide, { paddingTop: insets.top + 64 }]}
            accessible
            accessibilityLabel={copy.welcome.slideOf(i + 1, slides.length)}
          >
            <Text style={[styles.step, { color: hue(i) }]}>{slide.step.toUpperCase()}</Text>
            <Text style={[display(52, 47), styles.title]}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>

            <View style={styles.showcase}>
              <WelcomeShowcase kind={show(i)} color={hue(i)} />
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
        <TextButton label={copy.welcome.haveInvite} onPress={onInvite} />
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  slide: { width: W, paddingHorizontal: spacing.xl, gap: spacing.md },
  showcase: { marginTop: spacing.lg },
  step: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 3.6 },
  title: { color: colors.text },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  foot: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: spacing.lg },
  dot: { height: 8, borderRadius: 4 },
}) as const;
