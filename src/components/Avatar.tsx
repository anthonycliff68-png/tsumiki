import { Text, View } from 'react-native';

import { useStyles } from '@/lib/appearance';
import { fonts, type Palette } from '@/theme';

type Props = {
  /** Display name; the first two letters become the initials. */
  name: string;
  color: string;
  size?: number;
  /** The colour the avatar sits on, so the ring reads as a cut-out. */
  ringColor: string;
};

export function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '??';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return trimmed.slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

/** A member, as a coloured disc with their initials. */
export function Avatar({ name, color, size = 32, ringColor }: Props) {
  const styles = useStyles(makeStyles);
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderColor: ringColor,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

/** Overlapping row of avatars, as the canvas draws them. */
export function AvatarStack({ children }: { children: React.ReactNode }) {
  const styles = useStyles(makeStyles);
  return <View style={styles.stack}>{children}</View>;
}

const makeStyles = (colors: Palette) => ({
  avatar: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginLeft: -8,
  },
  initials: {
    fontFamily: fonts.bodyBold,
    color: colors.white,
  },
  stack: {
    flexDirection: 'row',
    paddingLeft: 8,
  },
}) as const;
