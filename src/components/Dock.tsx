import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CrewsIcon,
  MyDayIcon,
  ProgressIcon,
  TodayIcon,
  YouIcon,
  type IconProps,
} from '@/components/icons';
import { CheckInOrb } from '@/components/CheckInOrb';
import { GlassSurface, LIQUID_GLASS } from '@/components/GlassSurface';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { formatTime } from '@/data/defaults';
import { useCheckIn, useToday, useUndoCheckIn } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { alpha, display, fonts, ink, radii, tint, type Palette } from '@/theme';

/**
 * Row heights from the canvas: 12 + 56 + 12, then 4 + 44 + 10. Only a starting
 * guess — the dock reports its real height once it has laid out, because a long
 * habit name, a larger text size or a day with no habits at all all change it,
 * and a guess that runs short leaves the last row of every list under the glass.
 */
export const DOCK_HEIGHT = 80 + 58;
/** How far the dock floats off the bottom of the screen on a home-indicator phone. */
const DOCK_EDGE = 12;
/** Breathing room between the dock's top edge and the end of a list. */
const DOCK_GAP = 16;

/** The tab row's own side padding. Shared, because the pill's slots are measured from it. */
const TAB_ROW_PADDING = 8;
/** How far the sliding pill sits inside its tab's slot, each side. */
const PILL_INSET = 3;
/** Movement past which a touch is a drag across the tabs rather than a tap on one. */
const DRAG_SLOP = 4;

type TabIcon = (props: IconProps) => React.ReactElement;

const TABS: Record<string, { label: string; Icon: TabIcon }> = {
  index: { label: copy.dock.tabs.today, Icon: TodayIcon },
  'my-day': { label: copy.dock.tabs.myDay, Icon: MyDayIcon },
  crews: { label: copy.dock.tabs.crews, Icon: CrewsIcon },
  progress: { label: copy.dock.tabs.progress, Icon: ProgressIcon },
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
 * The floating glass dock: an up-next row with the check-in orb on top of the
 * four tabs. Artboard: NavAB.
 */
export function Dock({ state, navigation }: BottomTabBarProps) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: habits = [] } = useToday(userId);
  const checkIn = useCheckIn(userId);
  const undo = useUndoCheckIn(userId);

  const done = habits.filter((h) => h.checkedIn).length;
  const total = habits.length;

  // Up next is the next one still to come, so the dock agrees with the card at
  // the front of the fan on Today. A habit whose moment has passed is not "up
  // next"; it falls in behind. On a finished day the dock keeps showing the
  // last one so the row does not collapse.
  const habit = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const open = habits.filter((h) => !h.checkedIn);
    return (
      open.find((h) => h.sortKey >= nowMinutes) ?? open[0] ?? habits[habits.length - 1]
    );
  }, [habits]);

  const accent = habit ? ink(habit.color, colors) : ink(colors.textMuted, colors);

  const whenLabel = !habit
    ? ''
    : habit.mode === 'after' && habit.anchorLabel
      ? copy.dock.upNextAnchor(habit.anchorLabel)
      : habit.mode === 'at' && habit.time
        ? copy.dock.upNextTime(formatTime(habit.time))
        : copy.dock.upNextAnytime;

  const statusLabel =
    done === total && total > 0 ? copy.dock.allDone : copy.dock.soloProgress(done, total);

  const { measure } = useContext(MeasuredDock);

  // --- the sliding pill ----------------------------------------------------
  //
  // The tab row has no indicator of its own, so this is it: a capsule that
  // springs between tabs on a tap, and follows your thumb if you drag across
  // them. Dragging only previews — the release decides — because navigating as
  // the thumb passes would mount every screen it crosses and fire off their
  // queries for nothing.

  const tabRoutes = useMemo(() => state.routes.filter((route) => TABS[route.name]), [state.routes]);
  // Through the filter rather than straight from state.index, so a route that
  // is not a tab cannot slide the pill onto the wrong one.
  const tabIndex = Math.max(
    0,
    tabRoutes.findIndex((route) => route.key === state.routes[state.index]?.key),
  );

  const [rowWidth, setRowWidth] = useState(0);
  /** The tab the thumb is currently over mid-drag; null when not dragging. */
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? tabIndex;

  const slot = tabRoutes.length > 0 && rowWidth > 0 ? (rowWidth - TAB_ROW_PADDING * 2) / tabRoutes.length : 0;

  const slide = useRef(new Animated.Value(0)).current;
  /** Where the pill sat when the finger went down. */
  const dragFrom = useRef(0);
  /** The tab a release would commit to. A ref as well as state: the responder
   *  is built once per layout and would otherwise read a stale hover. */
  const dragTo = useRef(0);

  const measureRow = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setRowWidth((current) => (Math.abs(current - next) > 0.5 ? next : current));
  }, []);

  // Follow the real selection whenever it changes — by tap, by drag, or by
  // something else navigating — and settle after a layout change.
  useEffect(() => {
    if (slot <= 0) return;
    Animated.spring(slide, {
      toValue: tabIndex * slot,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
  }, [tabIndex, slot, slide]);

  const drag = useMemo(
    () =>
      PanResponder.create({
        // Only claim the touch once it is clearly a sideways drag, so a plain
        // tap still reaches the button underneath.
        onMoveShouldSetPanResponder: (_event, gesture) =>
          slot > 0 && Math.abs(gesture.dx) > DRAG_SLOP && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          dragFrom.current = tabIndex * slot;
          dragTo.current = tabIndex;
        },
        onPanResponderMove: (_event, gesture) => {
          if (slot <= 0) return;
          const furthest = slot * (tabRoutes.length - 1);
          const at = Math.min(Math.max(dragFrom.current + gesture.dx, 0), furthest);
          slide.setValue(at);
          const over = Math.round(at / slot);
          if (over !== dragTo.current) {
            dragTo.current = over;
            setHover(over);
          }
        },
        onPanResponderRelease: () => {
          const landed = dragTo.current;
          setHover(null);
          const route = tabRoutes[landed];
          if (route && landed !== tabIndex) {
            navigation.navigate(route.name, route.params);
            // The effect above springs the pill once the selection catches up.
          } else {
            Animated.spring(slide, {
              toValue: tabIndex * slot,
              useNativeDriver: true,
              speed: 18,
              bounciness: 6,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          setHover(null);
          Animated.spring(slide, {
            toValue: tabIndex * slot,
            useNativeDriver: true,
            speed: 18,
            bounciness: 6,
          }).start();
        },
      }),
    [slot, tabIndex, tabRoutes, navigation, slide],
  );

  return (
    <View
      onLayout={measure}
      style={[
        styles.dock,
        {
          bottom: dockBottom(insets.bottom),
          borderColor: alpha(accent, 0.28),
          // Liquid Glass supplies its own fill. Leaving the flat one under it
          // would hide the very thing it is there to do.
          backgroundColor: LIQUID_GLASS ? 'transparent' : colors.glass,
        },
      ]}
    >
      <GlassSurface
        blurFallback
        // A breath of the up-next habit's colour, so the dock belongs to the
        // same habit the bleed behind it is tinted for.
        tint={alpha(habit?.color ?? colors.textMuted, 0.1)}
        style={styles.glass}
      >
        {habit && (
        <View style={styles.upNextRow}>
          <View
            style={[
              styles.colorBar,
              { backgroundColor: habit.color, boxShadow: `0px 0px 12px ${alpha(habit.color, 0.9)}` },
            ]}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${whenLabel}: ${habit.name}. ${statusLabel}`}
            onPress={() => navigation.navigate('crews')}
            style={styles.upNextText}
          >
            <Text style={[styles.upNextLabel, { color: accent }]} numberOfLines={1}>
              {whenLabel}
            </Text>
            <Text style={styles.upNextName} numberOfLines={1}>
              {habit.name}
            </Text>
            <Text style={styles.upNextStatus} numberOfLines={1}>
              {statusLabel}
            </Text>
          </Pressable>

          <CheckInOrb
            color={habit.color}
            done={done}
            total={total}
            checkedIn={habit.checkedIn}
            accessibilityLabel={
              habit.checkedIn
                ? copy.dock.checkedInLabel(habit.name)
                : copy.dock.checkInLabel(habit.name)
            }
            onPress={() => {
              // Tapping a done orb takes it back — mis-taps happen.
              if (habit.checkedIn) undo.mutate({ habitId: habit.id });
              else checkIn.mutate({ habitId: habit.id });
            }}
          />
        </View>
        )}

        <View style={styles.tabRow} onLayout={measureRow} {...drag.panHandlers}>
          {/* Behind the tabs, and deaf to touches so it never eats one. It is a
              brighter region inside the dock's own glass rather than a second
              pane of it: glass stacked on glass turns to mush, which the time
              picker demonstrated. */}
          {slot > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[styles.pill, { width: slot - PILL_INSET * 2, transform: [{ translateX: slide }] }]}
            />
          )}

          {tabRoutes.map((route, index) => {
            const tab = TABS[route.name];
            if (!tab) return null;

            // What the pill is under right now, which during a drag is wherever
            // the thumb has reached rather than where the app actually is.
            const lit = index === shown;
            // Where the app actually is. A screen reader should hear the truth,
            // not the preview.
            const selected = index === tabIndex;
            // colors.text, not colors.white: the tab row sits on the dock, which is
            // pale on a light ground, and white on pale is not a label.
            const color = lit ? colors.text : colors.textInactive;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!selected && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
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
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  dock: {
    position: 'absolute',
    left: DOCK_EDGE,
    right: DOCK_EDGE,
    borderRadius: radii.dock,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0px 16px 40px rgba(0,0,0,0.55)',
  },
  glass: {
    flexDirection: 'column',
  },
  upNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 21,
  },
  colorBar: {
    width: 6,
    height: 56,
    flexShrink: 0,
    borderRadius: 3,
  },
  upNextText: {
    flexGrow: 1,
    flexShrink: 1,
    gap: 3,
  },
  upNextLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  upNextName: {
    ...display(24, 24),
    color: colors.text,
  },
  upNextStatus: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  pill: {
    position: 'absolute',
    left: TAB_ROW_PADDING + PILL_INSET,
    top: 4,
    bottom: 8,
    borderRadius: radii.chip,
    // A brighter part of the dock's glass, not a second pane of it.
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 4,
    paddingHorizontal: TAB_ROW_PADDING,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  tab: {
    // Five across a phone: narrower than the canvas's four, but still over the
    // 44pt floor once the row's own padding counts.
    minWidth: 52,
    minHeight: 44,
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
