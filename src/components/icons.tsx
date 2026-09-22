import Svg, { Path } from 'react-native-svg';

/**
 * The canvas icons, as drawn: 24×24 stroke paths, round caps and joins.
 * Paths are copied verbatim from the artboards.
 */

export type IconProps = {
  size?: number;
  color: string;
  strokeWidth?: number;
};

function StrokeIcon({
  size = 20,
  color,
  strokeWidth = 2,
  d,
}: IconProps & { d: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Three stacked lines — the day, read top to bottom. */
export function TodayIcon(props: IconProps) {
  return <StrokeIcon {...props} d="M4 7h16M4 12h16M4 17h10" />;
}

/** A clock: the timeline tab. */
export function MyDayIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" />
  );
}

/** Two people: the crews tab. */
export function CrewsIcon(props: IconProps) {
  return (
    <StrokeIcon
      {...props}
      d="M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 19c0-3 3-5 6-5s6 2 6 5M17 11.5a2.5 2.5 0 1 0 0-5M15 14.5c3 0 5 1.8 5 4.5"
    />
  );
}

/** One person: the you tab. */
export function YouIcon(props: IconProps) {
  return (
    <StrokeIcon
      {...props}
      d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6"
    />
  );
}

/** Back. */
export function ChevronLeftIcon(props: IconProps) {
  return <StrokeIcon strokeWidth={2.4} {...props} d="M15 5l-7 7 7 7" />;
}

/** Forward, on primary buttons. */
export function ArrowRightIcon(props: IconProps) {
  return <StrokeIcon strokeWidth={2.6} {...props} d="M5 12h14M13 6l6 6-6 6" />;
}

/** Add, on the dashed chips. */
export function PlusIcon(props: IconProps) {
  return <StrokeIcon strokeWidth={2.6} {...props} d="M12 5v14M5 12h14" />;
}

/** The check-in tick. */
export function CheckIcon({ size = 24, color, strokeWidth = 2.8 }: IconProps) {
  return (
    <StrokeIcon size={size} color={color} strokeWidth={strokeWidth} d="M5 12.5l4.5 4.5L19 7.5" />
  );
}

/** The streak flame. */
export function FlameIcon(props: IconProps) {
  return (
    <StrokeIcon
      {...props}
      d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2.5 1.2-3.8 2.5-5 0 2 1 3 2.2 3.2C11.5 8.5 11 6 12 3z"
    />
  );
}
