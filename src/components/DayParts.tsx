// The pieces Home and My Day share: header buttons and icons, a habit's
// status, crew faces, the to-do row, and the instant check-in.
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Avatar } from '@/components/Avatar';
import { formatTime } from '@/lib/times';
import { useQueryClient } from '@tanstack/react-query';

import { useCheckIn, useCrew, useMyProfile, useUndoCheckIn, type TodayHabit, type Todo } from '@/lib/api';
import { addDays, localDateString } from '@/lib/dates';
import { useAuth } from '@/lib/auth';
import { CheckIcon } from '@/components/icons';
import { useTheme } from '@/lib/appearance';
import { fonts } from '@/theme';
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
export const UpDownIcon = (p: P) => <Stroke {...p} width={2} d="M8.5 9.5 12 6l3.5 3.5M8.5 14.5 12 18l3.5-3.5" />;
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

export type Status = 'Up next' | 'Upcoming' | 'Missed' | 'Complete' | 'Anytime';

/** The app's own rule: past its moment and open is missed; one habit is up next. */
export function statusOf(habit: TodayHabit, nowMinutes: number | null, upNextId?: string): Status {
  if (habit.checkedIn) return 'Complete';
  if (habit.mode === 'any' || !habit.time) return 'Anytime';
  if (habit.id === upNextId) return 'Up next';
  if (nowMinutes !== null && habit.sortKey < nowMinutes) return 'Missed';
  return 'Upcoming';
}

/** "Upcoming · after lunch" — the anchor rides with the status. */
export function statusLine(habit: TodayHabit, status: Status): string {
  return habit.mode === 'after' && habit.anchorLabel
    ? `${status} · after ${habit.anchorLabel.toLowerCase()}`
    : status;
}

/** Crew faces, or just yours when it is a solo habit. */
export function Faces({ habit, ring, size = 26 }: { habit: TodayHabit; ring: string; size?: number }) {
  const { session } = useAuth();
  const { data: me } = useMyProfile(session?.user.id);
  const { data: crew } = useCrew(habit.crewId ?? undefined);
  const people =
    habit.crewId && crew
      ? crew.members.map((m) => ({ id: m.userId, name: m.displayName, color: m.avatarColor }))
      : me
        ? [{ id: me.id, name: me.display_name, color: me.avatar_color }]
        : [];
  return (
    <View style={{ flexDirection: 'row' }}>
      {people.slice(0, 4).map((p, i) => (
        <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.27 }}>
          <Avatar name={p.name} color={p.color} size={size} ringColor={ring} />
        </View>
      ))}
    </View>
  );
}


/** The moment a to-do hangs off, if it still exists. */
export function anchorFor(todo: Todo, anchors: readonly Anchor[]): Anchor | undefined {
  return todo.anchorId ? anchors.find((a) => a.id === todo.anchorId) : undefined;
}

/** "From yesterday", or "Since Oct 20" when it has been longer. */
function carriedLabel(day: string, shown: string): string | null {
  if (day >= shown) return null;
  const [y, m, d] = shown.split('-').map(Number);
  if (localDateString(addDays(new Date(y ?? 0, (m ?? 1) - 1, d ?? 1), -1)) === day) return 'From yesterday';
  const [dy, dm, dd] = day.split('-').map(Number);
  return `Since ${new Date(dy ?? 0, (dm ?? 1) - 1, dd ?? 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/** A to-do: a round check, the title, and when. */
export function TodoRow({
  todo,
  when,
  onToggle,
  onEdit,
  colors,
  textStyle,
  height = 44,
  shown = localDateString(),
}: {
  todo: Todo;
  /** The day on screen, for the carried-over tag. */
  shown?: string;
  when?: string;
  onToggle: () => void;
  /** Tapping the words edits; the circle still ticks. Omitted, the whole row ticks. */
  onEdit?: () => void;
  colors: { text: string; textMuted: string; textFaint: string; bg: string; raised: string };
  textStyle?: StyleProp<TextStyle>;
  height?: number;
}) {
  const carried = carriedLabel(todo.day, shown);
  // Ticking fills the circle and draws the line through the words, the same
  // short strike a habit gets; unticking runs it back.
  const done = useRef(new Animated.Value(todo.done ? 1 : 0)).current;
  const [textW, setTextW] = useState(0);
  useEffect(() => {
    Animated.timing(done, { toValue: todo.done ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [todo.done, done]);
  const circle = (
    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.textFaint }}>
      <Animated.View
        style={{
          position: 'absolute',
          top: -1.5,
          left: -1.5,
          right: -1.5,
          bottom: -1.5,
          borderRadius: 10,
          backgroundColor: colors.text,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: done,
          transform: [{ scale: done.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
        }}
      >
        <CheckIcon size={12} color={colors.bg} strokeWidth={3.4} />
      </Animated.View>
    </View>
  );
  const words = (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flexShrink: 1, justifyContent: 'center' }}>
        <Text
          numberOfLines={1}
          onLayout={(e) => setTextW(e.nativeEvent.layout.width)}
          style={[
            { fontFamily: fonts.body, fontSize: 15, color: colors.text },
            textStyle,
            todo.done && { color: colors.textFaint },
          ]}
        >
          {todo.title}
        </Text>
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            height: 1,
            backgroundColor: colors.textFaint,
            width: done.interpolate({ inputRange: [0, 1], outputRange: [0, textW] }),
          }}
        />
      </View>
      {carried && !todo.done && (
        <View style={{ paddingHorizontal: 7, height: 20, borderRadius: 10, justifyContent: 'center', backgroundColor: colors.raised }}>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textMuted }}>{carried}</Text>
        </View>
      )}
    </View>
  );
  const whenText = when !== undefined && (
    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.textFaint }}>{when}</Text>
  );

  if (onEdit) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: height }}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: todo.done }}
          accessibilityLabel={todo.title}
          onPress={onToggle}
          hitSlop={8}
          style={{ width: 44, height: Math.max(height, 44), justifyContent: 'center', marginLeft: -12, paddingLeft: 12 }}
        >
          {circle}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${todo.title}`}
          onPress={onEdit}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: height }}
        >
          {words}
          {whenText}
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: todo.done }}
      accessibilityLabel={todo.title}
      onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: height }}
    >
      {circle}
      {words}
      {whenText}
    </Pressable>
  );
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
