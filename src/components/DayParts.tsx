// Small pieces My Day shares: header buttons and icons, and the instant check-in.
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { formatTime } from '@/lib/times';
import { useQueryClient } from '@tanstack/react-query';

import { useCheckIn, useUndoCheckIn, type TodayHabit, type Todo } from '@/lib/api';
import { localDateString } from '@/lib/dates';
import { useTheme } from '@/lib/appearance';
import type { Anchor } from '@/lib/models';

function Stroke({ d, size = 20, color, width = 1.8 }: { d: string; size?: number; color: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
type P = { color: string; size?: number };
export const BellIcon = (p: P) => (
  <Stroke {...p} d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2.2 2.2 0 0 0 4 0" />
);
export const CalendarIcon = (p: P) => (
  <Stroke
    {...p}
    d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v10a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-10ZM4 10h16M8.5 3v4M15.5 3v4M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 16.5h.01M12 16.5h.01"
  />
);
export const ClockIcon = (p: P) => <Stroke {...p} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2" />;
export const BackIcon = (p: P) => <Stroke {...p} d="M19 12H5M11 6l-6 6 6 6" />;
export const ChevronIcon = (p: P) => <Stroke {...p} d="M6 9l6 6 6-6" />;
export const MoonIcon = (p: P) => <Stroke {...p} d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />;
export const DotsIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path d="M5 12h.01M12 12h.01M19 12h.01" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
  </Svg>
);

/** A round icon button, as in the reference's header. */
export function RoundButton({
  label,
  onPress,
  children,
  style,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 46,
          height: 46,
          borderRadius: 23,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.raised,
          borderWidth: 1,
          borderColor: colors.cardEdge,
        },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** "9:21 AM". */
export const clock = formatTime;

/** The moment a to-do hangs off, if it still exists. */
export function anchorFor(todo: Todo, anchors: readonly Anchor[]): Anchor | undefined {
  return todo.anchorId ? anchors.find((a) => a.id === todo.anchorId) : undefined;
}

/**
 * Check in or undo with the screen answering at once: the cache is written
 * first and the server follows; a refusal re-reads the truth.
 *
 * Only for cards that build their interpolations once (useMemo), like My
 * Day's. One built per render would be swapped out by the instant re-render
 * and stop its animation partway.
 */
export function useInstantToggle(userId: string | undefined) {
  const queryClient = useQueryClient();
  const checkIn = useCheckIn(userId);
  const undo = useUndoCheckIn(userId);
  const toggle = (habit: { id: string; checkedIn: boolean }, date: Date = new Date()) => {
    const key = ['today', userId, localDateString(date)];
    void queryClient.cancelQueries({ queryKey: key });
    queryClient.setQueryData<TodayHabit[]>(key, (old) =>
      old?.map((h) => (h.id === habit.id ? { ...h, checkedIn: !habit.checkedIn } : h)),
    );
    const onError = () => void queryClient.invalidateQueries({ queryKey: ['today'] });
    if (habit.checkedIn) undo.mutate({ habitId: habit.id, date }, { onError });
    else checkIn.mutate({ habitId: habit.id, date }, { onError });
  };
  return { toggle, busy: checkIn.isPending || undo.isPending };
}
