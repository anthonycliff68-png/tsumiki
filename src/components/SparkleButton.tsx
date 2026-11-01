import { Pressable, Text } from 'react-native';

import { copy } from '@/copy';
import { useTheme } from '@/lib/appearance';
import { openBrainDump, useIsPro } from '@/lib/pro';
import { habitColors } from '@/theme';

/** ✦ at the top right of every tab: the brain dump, one tap from anywhere. */
export function SparkleButton() {
  const colors = useTheme();
  const isPro = useIsPro();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.brainDump.title}
      hitSlop={6}
      onPress={() => openBrainDump(isPro)}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: habitColors[1],
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ fontSize: 18, lineHeight: 22, color: colors.white }}>✦</Text>
    </Pressable>
  );
}
