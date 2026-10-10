import { Pressable, ScrollView, Text, View } from 'react-native';

import { Display, Screen } from '@/components/Screen';
import { copy } from '@/copy';
import { useBlocked, useUnblockUser } from '@/lib/api';
import { useStyles } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { goBack } from '@/lib/back';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

/** The people you have blocked. Usually empty, which is the point: an empty
 *  list does not deserve a permanent slot on the profile screen. */
export default function BlockedScreen() {
  const styles = useStyles(makeStyles);
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: blocked = [] } = useBlocked(userId);
  const unblock = useUnblockUser(userId);

  return (
    <Screen color={habitColors[5]} underDock={false}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" onPress={() => goBack()} style={styles.pill}>
            <Text style={styles.pillText}>{copy.newHabit.cancel}</Text>
          </Pressable>
        </View>

        <Display size={52} line={46}>{copy.safety.blockedTitle}</Display>

        <View style={styles.card}>
          {blocked.length === 0 ? (
            <Text style={styles.meta}>{copy.safety.blockedEmpty}</Text>
          ) : (
            blocked.map((person, i) => (
              <View key={person.userId}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: person.avatarColor }]} />
                  <Text style={styles.name} numberOfLines={1}>
                    {person.displayName}
                  </Text>
                  <Text
                    accessibilityRole="button"
                    onPress={() => unblock.mutate(person.userId)}
                    style={styles.unblock}
                  >
                    {copy.safety.unblock}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: Palette) => ({
  body: { gap: spacing.md, paddingBottom: spacing.xxl },
  topRow: { flexDirection: 'row', paddingBottom: spacing.sm },
  pill: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.06),
  },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  card: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.04),
  },
  divider: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  unblock: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted },
  meta: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textFaint },
}) as const;
