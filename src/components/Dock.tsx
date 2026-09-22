import { BlurView } from 'expo-blur';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CrewsIcon, MyDayIcon, TodayIcon, YouIcon, type IconProps } from '@/components/icons';
import { CheckInOrb } from '@/components/CheckInOrb';
import { copy } from '@/copy';
import { formatTime } from '@/data/defaults';
import { useCheckIn, useToday } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { alpha, colors, display, fonts, radii, tint } from '@/theme';

/** Row heights from the canvas: 12 + 56 + 12, then 4 + 44 + 10. */
export const DOCK_HEIGHT = 80 + 58;
/** How far the dock floats off the bottom of the screen on a home-indicator phone. */
const DOCK_EDGE = 12;

type TabIcon = (props: IconProps) => React.ReactElement;

const TABS: Record<string, { label: string; Icon: TabIcon }> = {
  index: { label: copy.dock.tabs.today, Icon: TodayIcon },
  'my-day': { label: copy.dock.tabs.myDay, Icon: MyDayIcon },
  crews: { label: copy.dock.tabs.crews, Icon: CrewsIcon },
  you: { label: copy.dock.tabs.you, Icon: YouIcon },
};

/** Where the dock's top edge sits, so screens can pad their content past it. */
export function useDockClearance(): number {
  const insets = useSafeAreaInsets();
  return DOCK_HEIGHT + dockBottom(insets.bottom) + 16;
}

function dockBottom(safeBottom: number): number {
  return Math.max(safeBottom - 14, DOCK_EDGE);
}

/**
 * The floating glass dock: an up-next row with the check-in orb on top of the
 * four tabs. Artboard: NavAB.
 */
export function Dock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: habits = [] } = useToday(userId);
  const checkIn = useCheckIn(userId);

  const done = habits.filter((h) => h.checkedIn).length;
  const total = habits.length;

  // Up next is the first habit still open; on a finished day the dock keeps
  // showing the last one so the row does not collapse.
  const habit = useMemo(
    () => habits.find((h) => !h.checkedIn) ?? habits[habits.length - 1],
    [habits],
  );

  const accent = habit ? tint(habit.color, 0.55) : tint(colors.textMuted, 0.2);

  const whenLabel = !habit
    ? ''
    : habit.mode === 'after' && habit.anchorLabel
      ? copy.dock.upNextAnchor(habit.anchorLabel)
      : habit.mode === 'at' && habit.time
        ? copy.dock.upNextTime(formatTime(habit.time))
        : copy.dock.upNextAnytime;

  const statusLabel =
    done === total && total > 0 ? copy.dock.allDone : copy.dock.soloProgress(done, total);

  return (
    <View
      style={[
        styles.dock,
        {
          bottom: dockBottom(insets.bottom),
          borderColor: alpha(accent, 0.28),
        },
      ]}
    >
      <BlurView intensity={24} tint="dark" style={styles.glass}>
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
              if (!habit.checkedIn) checkIn.mutate({ habitId: habit.id });
            }}
          />
        </View>
        )}

        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const tab = TABS[route.name];
            if (!tab) return null;

            const focused = state.index === index;
            const color = focused ? colors.white : colors.textInactive;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
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
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: DOCK_EDGE,
    right: DOCK_EDGE,
    borderRadius: radii.dock,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: colors.glass,
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
  },
  upNextStatus: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 4,
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  tab: {
    minWidth: 60,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
});
