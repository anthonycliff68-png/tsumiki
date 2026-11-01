import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon } from '@/components/icons';
import { copy } from '@/copy';
import { useStyles, useTheme } from '@/lib/appearance';
import { openBrainDump, useIsPro } from '@/lib/pro';
import { alpha, display, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

/** Brain dump, then the three tiles under it. */
const PIECES = 4;
const STAGGER_MS = 45;

/**
 * The ＋ in the middle of the dock: three blocks in today's habit colours, the
 * app's own stack. Tapped, they tumble up into the four ways to add something.
 */
export function PlusBlocks({ blocks }: { blocks: string[] }) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const isPro = useIsPro();
  const [open, setOpen] = useState(false);
  const rise = useRef(Array.from({ length: PIECES }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (!open) return;
    rise.forEach((v) => v.setValue(0));
    Animated.stagger(
      STAGGER_MS,
      rise.map((v) => Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 9 })),
    ).start();
  }, [open, rise]);

  const go = (to: () => void) => () => {
    setOpen(false);
    to();
  };

  /** Up from the dock with a little turn, the way a block lands on a stack. */
  const tumble = (i: number) => ({
    opacity: rise[i],
    transform: [
      { translateY: rise[i]!.interpolate({ inputRange: [0, 1], outputRange: [90 + i * 20, 0] }) },
      { rotate: rise[i]!.interpolate({ inputRange: [0, 1], outputRange: [i % 2 ? '-8deg' : '8deg', '0deg'] }) },
    ],
  });

  const tiles = [
    { label: copy.dock.todo, color: blocks[0] ?? habitColors[0], onPress: () => router.navigate({ pathname: '/my-day', params: { add: String(Date.now()) } }) },
    { label: copy.dock.habit, color: blocks[1] ?? habitColors[2], onPress: () => router.push('/new-habit') },
    { label: copy.dock.note, color: blocks[2] ?? habitColors[3], onPress: () => router.push({ pathname: '/note/[id]', params: { id: 'new' } }) },
  ];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.dock.add}
        onPress={() => setOpen(true)}
        style={styles.button}
      >
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.block, { backgroundColor: blocks[i] ?? habitColors[i], width: 26 - i * 4 }]}
          />
        ))}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel={copy.dock.closeAdd} style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.menu, { paddingBottom: insets.bottom + 84 }]} pointerEvents="box-none">
          <Animated.View style={tumble(0)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${copy.dock.brainDump}. ${copy.dock.brainDumpBody}`}
              onPress={go(() => openBrainDump(isPro))}
              style={({ pressed }) => [styles.dump, pressed && { opacity: 0.9 }]}
            >
              <View style={styles.dumpHead}>
                <Text style={styles.dumpTitle}>✦ {copy.dock.brainDump}</Text>
                <Text style={styles.pro}>{copy.dock.pro}</Text>
              </View>
              <Text style={styles.dumpBody}>{copy.dock.brainDumpBody}</Text>
            </Pressable>
          </Animated.View>
          <View style={styles.tiles}>
            {tiles.map((t, i) => (
              <Animated.View key={t.label} style={[styles.tileWrap, tumble(i + 1)]}>
                <Pressable
                  accessibilityRole="button"
                  onPress={go(t.onPress)}
                  style={({ pressed }) => [
                    styles.tile,
                    { backgroundColor: alpha(t.color, 0.9) },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.tileText}>{t.label}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.dock.closeAdd}
          onPress={() => setOpen(false)}
          style={[styles.close, { bottom: Math.max(insets.bottom - 14, 12) + 14 }]}
        >
          <CloseIcon size={22} color={colors.bg} strokeWidth={2.5} />
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (colors: Palette) => ({
  button: { minWidth: 52, minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  block: { height: 8, borderRadius: 3 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: alpha('#000000', 0.55) },
  menu: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.xl, gap: spacing.md },
  dump: { gap: 4, padding: spacing.xl, borderRadius: radii.card, backgroundColor: habitColors[1] },
  dumpHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dumpTitle: { ...display(26, 28), color: colors.white },
  pro: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.chip,
    backgroundColor: alpha('#000000', 0.2),
    overflow: 'hidden',
  },
  dumpBody: { fontFamily: fonts.body, fontSize: 15, color: colors.white },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tileWrap: { flex: 1 },
  tile: { minHeight: 84, borderRadius: radii.card, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white },
  close: {
    position: 'absolute',
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
}) as const;
