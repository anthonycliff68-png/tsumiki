import Svg, { Circle } from 'react-native-svg';

type Props = {
  size: number;
  strokeWidth: number;
  /** 0–1. */
  progress: number;
  color: string;
  trackColor: string;
};

/** Today's done/total, drawn as a ring that starts at twelve o'clock. */
export function ProgressRing({ size, strokeWidth, progress, color, trackColor }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const centre = size / 2;
  const radius = centre - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <Svg width={size} height={size} pointerEvents="none">
      <Circle
        cx={centre}
        cy={centre}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      {clamped > 0 && (
        <Circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference * clamped} ${circumference}`}
          transform={`rotate(-90 ${centre} ${centre})`}
        />
      )}
    </Svg>
  );
}
