import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CrewsIcon, MyDayIcon, NotesIcon, YouIcon, type IconProps } from '@/components/icons';
import { GlassSurface, LIQUID_GLASS } from '@/components/GlassSurface';
import { PlusBlocks } from '@/components/PlusBlocks';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { useToday } from '@/lib/api';
import { orderForDay } from '@/lib/today';
import { useAuth } from '@/lib/auth';
import { alpha, fonts, ink, radii, type Palette } from '@/theme';

/**
 * The tab row. Only a starting guess — the dock reports its real height once it
 * has laid out, because a larger text size changes it, and a guess that runs
 * short leaves the last row of every list under the glass.
 */
export const DOCK_HEIGHT = 58;
/** How far the dock floats off the bottom of the screen on a home-indicator phone. */
const DOCK_EDGE = 12;
/** Breathing room between the dock's top edge and the end of a list. */
const DOCK_GAP = 16;

/** The tab row's own side padding. Shared, because the pill's slots are measured from it. */
const TAB_ROW_PADDING = 8;
/** The halo behind the lit tab. */
const GLOW_SIZE = 38;
/** The tab row's top padding and the tab's own height, which the halo centres on. */
const TAB_ROW_TOP = 4;
const TAB_MIN_HEIGHT = 44;
/** Movement past which a touch is a drag across the tabs rather than a tap on one. */
const DRAG_SLOP = 4;

type TabIcon = (props: IconProps) => React.ReactElement;

const TABS: Record<string, { label: string; Icon: TabIcon }> = {
  'my-day': { label: copy.dock.tabs.myDay, Icon: MyDayIcon },
  notes: { label: copy.dock.tabs.notes, Icon: NotesIcon },
  crews: { label: copy.dock.tabs.crews, Icon: CrewsIcon },
  you: { label: copy.dock.tabs.you, Icon: YouIcon },
};

const MeasuredDock = createContext<{
  height: number;
  measure: (event: LayoutChangeEvent) => void;
}>({ height: DOCK_HEIGHT, measure: () => {} });

/**
 * Holds the dock's measured height for the screens underneath it. Wraps the
 * tabs, so the dock that reports the height and the lists that pad for it are
 * reading the same number.
 */
export function DockClearanceProvider({ children }: { children: React.ReactNode }) {
  const [height, setHeight] = useState(DOCK_HEIGHT);

  const measure = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    // Only on a real change, or laying out would set state on every pass.
    setHeight((current) => (Math.abs(current - next) > 0.5 ? next : current));
  }, []);

  const value = useMemo(() => ({ height, measure }), [height, measure]);
  return <MeasuredDock.Provider value={value}>{children}</MeasuredDock.Provider>;
}

/** Where the dock's top edge sits, so screens can pad their content past it. */
export function useDockClearance(): number {
  const insets = useSafeAreaInsets();
  const { height } = useContext(MeasuredDock);
  return height + dockBottom(insets.bottom) + DOCK_GAP;
}

function dockBottom(safeBottom: number): number {
  return Math.max(safeBottom - 14, DOCK_EDGE);
}

/**
 * The floating glass dock: My Day, Notes, the ＋ blocks, Crews, You. The
 * up-next bar and the check-in orb that sat on top have gone — My Day's
 * timeline does the checking in now.
 */
export function Dock({ state, navigation }: BottomTabBarProps) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { data: habits = [] } = useToday(session?.user.id);

  /** The day in order: the next open habit lights the dock, and the ＋ is
   *  built from the day's own colours. */
  const ordered = useMemo(() => orderForDay(habits), [habits]);
  const next = ordered.find((h) => !h.checkedIn) ?? ordered[ordered.length - 1];
  const accent = ink(next?.color ?? colors.textMuted, colors);
  const blocks = useMemo(() => [...new Set(ordered.map((h) => h.color))].slice(0, 3), [ordered]);

  const { measure } = useContext(MeasuredDock);

  // --- the sliding glow ------------------------------------------------------
  //
  // A halo that springs between tabs on a tap, and follows your thumb if you
  // drag across them. Dragging only previews — the release decides — because
  // navigating as the thumb passes would mount every screen it crosses and
  // fire off their queries for nothing. The ＋ holds the middle slot, so tab i
  // sits in slot slotOf(i) and the glow never lands on it.

  const tabRoutes = useMemo(() => state.routes.filter((route) => TABS[route.name]), [state.routes]);
  // Through the filter rather than straight from state.index, so a route that
  // is not a tab cannot slide the glow onto the wrong one.
  const tabIndex = Math.max(
    0,
    tabRoutes.findIndex((route) => route.key === state.routes[state.index]?.key),
  );
  const slots = tabRoutes.length + 1;
  const middle = Math.floor(tabRoutes.length / 2);
  const slotOf = (i: number) => (i < middle ? i : i + 1);

  const [rowWidth, setRowWidth] = useState(0);
  /** The tab the thumb is currently over mid-drag; null when not dragging. */
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? tabIndex;

  const slot = tabRoutes.length > 0 && rowWidth > 0 ? (rowWidth - TAB_ROW_PADDING * 2) / slots : 0;

  const slide = useRef(new Animated.Value(0)).current;
  /** Where the glow sat when the finger went down. */
  const dragFrom = useRef(0);
  /** The tab a release would commit to. A ref as well as state: the responder
   *  is built once per layout and would otherwise read a stale hover. */
  const dragTo = useRef(0);

  const measureRow = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setRowWidth((current) => (Math.abs(current - next) > 0.5 ? next : current));
  }, []);

  const settle = useCallback(
    () =>
      Animated.spring(slide, {
        toValue: slotOf(tabIndex) * slot,
        useNativeDriver: true,
        speed: 18,
        bounciness: 6,
      }).start(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slotOf only reads middle
    [slide, tabIndex, slot, middle],
  );

  // Follow the real selection whenever it changes — by tap, by drag, or by
  // something else navigating — and settle after a layout change.
  useEffect(() => {
    if (slot > 0) settle();
  }, [slot, settle]);

  const drag = useMemo(
    () =>
      PanResponder.create({
        // Only claim the touch once it is clearly a sideways drag, so a plain
        // tap still reaches the button underneath.
        onMoveShouldSetPanResponder: (_event, gesture) =>
          slot > 0 && Math.abs(gesture.dx) > DRAG_SLOP && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          dragFrom.current = slotOf(tabIndex) * slot;
          dragTo.current = tabIndex;
        },
        onPanResponderMove: (_event, gesture) => {
          if (slot <= 0) return;
          const at = Math.min(Math.max(dragFrom.current + gesture.dx, 0), slot * (slots - 1));
          slide.setValue(at);
          const over = Math.round(at / slot);
          // Over the ＋ is still whichever tab it last passed.
          const tab = over === middle ? dragTo.current : over < middle ? over : over - 1;
          if (tab !== dragTo.current) {
            dragTo.current = tab;
            setHover(tab);
          }
        },
        onPanResponderRelease: () => {
          const landed = dragTo.current;
          setHover(null);
          const route = tabRoutes[landed];
          // The effect above springs the glow once the selection catches up.
          if (route && landed !== tabIndex) navigation.navigate(route.name, route.params);
          else settle();
        },
        onPanResponderTerminate: () => {
          setHover(null);
          settle();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slotOf only reads middle
    [slot, slots, middle, tabIndex, tabRoutes, navigation, slide, settle],
  );

  const tabButton = (route: (typeof tabRoutes)[number], index: number) => {
    const tab = TABS[route.name];
    if (!tab) return null;

    // What the glow is under right now, which during a drag is wherever the
    // thumb has reached rather than where the app actually is.
    const lit = index === shown;
    // Where the app actually is. A screen reader should hear the truth, not
    // the preview.
    const selected = index === tabIndex;
    // colors.text, not colors.white: the tab row sits on the dock, which is
    // pale on a light ground, and white on pale is not a label.
    const color = lit ? accent : colors.textInactive;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    };

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={tab.label}
        onPress={onPress}
        style={styles.tab}
      >
        <tab.Icon size={20} color={color} />
        <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
      </Pressable>
    );
  };

  return (
    <View onLayout={measure} style={[styles.wrap, { bottom: dockBottom(insets.bottom) }]}>
      {/* Clear, not the everyday material: "regular" carries its own dimming,
          and the dock sits over the bleed — dimming the one thing the screen
          is coloured by turned the whole bar into a brown panel. */}
      <GlassSurface
        blurFallback
        variant="clear"
        style={[
          styles.tabBar,
          {
            borderColor: alpha(accent, 0.22),
            backgroundColor: LIQUID_GLASS ? 'transparent' : colors.glass,
          },
        ]}
      >
        <View style={styles.tabRow} onLayout={measureRow} {...drag.panHandlers}>
          {/* Behind the tabs, and deaf to touches so it never eats one. A glow
              lights the tab instead of boxing it in, and still slides under the
              thumb, so the drag keeps something to hold on to. */}
          {slot > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.glow,
                {
                  left: TAB_ROW_PADDING + (slot - GLOW_SIZE) / 2,
                  transform: [{ translateX: slide }],
                  backgroundColor: alpha(accent, 0.18),
                  boxShadow: `0px 0px 18px ${alpha(accent, 0.8)}`,
                },
              ]}
            />
          )}

          {tabRoutes.slice(0, middle).map((route, i) => tabButton(route, i))}
          <PlusBlocks blocks={blocks} />
          {tabRoutes.slice(middle).map((route, i) => tabButton(route, i + middle))}
        </View>
      </GlassSurface>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  wrap: {
    position: 'absolute',
    left: DOCK_EDGE,
    right: DOCK_EDGE,
  },
  tabBar: {
    borderRadius: radii.dock,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0px 12px 32px rgba(0,0,0,0.5)',
  },
  // Centred on the tab as a whole, icon and label together, rather than on the
  // icon alone — behind the icon only, it lit the top half of the item and left
  // the word sitting outside its own highlight.
  glow: {
    position: 'absolute',
    top: TAB_ROW_TOP + TAB_MIN_HEIGHT / 2 - GLOW_SIZE / 2,
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: TAB_ROW_TOP,
    paddingHorizontal: TAB_ROW_PADDING,
    paddingBottom: 10,
    // The hairline is gone with the card it divided: the gap does that job now,
    // and a rule along the top of its own pane is a line drawn under nothing.
  },
  tab: {
    // Five across a phone: narrower than the canvas's four, but still over the
    // 44pt floor once the row's own padding counts.
    minWidth: 52,
    minHeight: TAB_MIN_HEIGHT,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
}) as const;
