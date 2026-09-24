import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton } from '@/components/Button';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { INVITE_BASE_URL, inviteMessage } from '@/constants/brand';
import { useCreateInvite, useCrew } from '@/lib/api';
import { display, fonts, radii, spacing, type Palette } from '@/theme';

/** Share a crew's invite link. Artboard: InviteSend. */
export default function InviteScreen() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: crew } = useCrew(id);
  const createInvite = useCreateInvite();

  // One live code per crew; asking again returns the same one.
  useEffect(() => {
    if (id && !createInvite.data && !createInvite.isPending) createInvite.mutate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const code = createInvite.data;
  const link = code ? `${INVITE_BASE_URL}/${code}` : '';
  const message = crew ? inviteMessage(crew.name, crew.habitName) : '';

  const share = () => {
    if (!link) return;
    void Share.share({ message: `${message}\n\n${link}` });
  };

  if (!crew) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Bleed color={crew.habitColor} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.pill}>
            <Text style={styles.pillText}>‹ {crew.name}</Text>
          </Pressable>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{copy.invite.spots(crew.members.length)}</Text>
          </View>
        </View>

        <Text style={display(56, 50)}>{copy.invite.title}</Text>

        <Text style={styles.label}>{copy.invite.whatTheyGet}</Text>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{message}</Text>
        </View>

        <View style={[styles.linkCard, { backgroundColor: crew.habitColor }]}>
          <Text style={styles.linkLabel}>{copy.invite.linkLabel}</Text>
          <Text style={styles.linkHabit}>{crew.habitName}</Text>
          <Text style={styles.linkUrl} numberOfLines={1}>
            {createInvite.isPending ? '…' : link}
          </Text>
        </View>

        <Text style={styles.hint}>{copy.invite.copyHint}</Text>
        <Text style={styles.hint}>{copy.invite.universalLinksLater}</Text>

        {createInvite.isError && <Text style={styles.error}>{copy.invite.failed}</Text>}

        <PrimaryButton
          label={copy.invite.share}
          busy={createInvite.isPending}
          onPress={share}
        />
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  bubble: {
    padding: spacing.lg,
    borderRadius: radii.bigCard,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bubbleText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  linkCard: { gap: 4, padding: spacing.lg, borderRadius: radii.bigCard },
  linkLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  linkHabit: { ...display(28, 28), color: colors.white },
  linkUrl: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textFaint },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
}) as const;
