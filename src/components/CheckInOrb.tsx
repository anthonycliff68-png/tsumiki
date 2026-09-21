import { Pressable, View } from 'react-native';

import { CheckIcon } from '@/components/icons';
import { ProgressRing } from '@/components/ProgressRing';
import { alpha, colors } from '@/theme';

const ORB_SIZE = 60;
const RING_INSET = 7;
const RING_STROKE = 3.5;

type Props = {
  color: string;
  /** Today's done / total for the ring. */
  done: number;
  total: number;
  checkedIn: boolean;
  accessibilityLabel: string;
  onPress: () => void;
};

/** The 60pt check-in orb that sits in the dock, ringed with today's progress. */
export function CheckInOrb({
  color,
  done,
  total,
  checkedIn,
  accessibilityLabel,
  onPress,
}: Props) {
  const fill = checkedIn ? colors.success : color;
  const tick = checkedIn ? colors.bg : colors.white;
  const ringSize = ORB_SIZE + RING_INSET * 2;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: checkedIn }}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: ORB_SIZE,
        height: ORB_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <View
        style={{
          position: 'absolute',
          top: -RING_INSET,
          left: -RING_INSET,
          width: ringSize,
          height: ringSize,
        }}
      >
        <ProgressRing
          size={ringSize}
          strokeWidth={RING_STROKE}
          progress={total === 0 ? 0 : done / total}
          color={colors.white}
          trackColor="rgba(255,255,255,0.16)"
        />
      </View>

      <View
        style={{
          width: ORB_SIZE,
          height: ORB_SIZE,
          borderRadius: ORB_SIZE / 2,
          backgroundColor: fill,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0px 0px 32px ${alpha(fill, 0.85)}`,
        }}
      >
        <CheckIcon size={24} color={tick} strokeWidth={2.8} />
      </View>
    </Pressable>
  );
}

export { ORB_SIZE };
