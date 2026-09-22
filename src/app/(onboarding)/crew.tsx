import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton, TextButton } from '@/components/Button';
import { ArrowRightIcon } from '@/components/icons';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { copy } from '@/copy';
import { formatTimeShort } from '@/data/defaults';
import { useAnchors } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { alpha, colors, display, fonts, habitColors, radii, spacing } from '@/theme';

/** Step 3. Artboard: OnbCrew. Shows where the new habit sits, then crew or solo. */
export default function CrewPromptScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { data: anchors = [] } = useAnchors(session?.user.id);
  const params = useLocalSearchParams<{ habitId?: string; name?: string; color?: string }>();

  const habitName = params.name ?? '';
  const habitColor = params.color ?? habitColors[0];

  // Two anchors either side of the new habit, so it reads as part of the day.
  const anchorIndex = anchors.findIndex((a) => a.label.toLowerCase().includes('lunch'));
  const pivot = anchorIndex >= 0 ? anchorIndex : Math.floor(anchors.length / 2);
  const before = anchors.slice(Math.max(0, pivot - 1), pivot + 1);
  const after = anchors.slice(pivot + 1, pivot + 2);

  return (
    <View style={styles.root}>
      <Bleed color={habitColor} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: 160,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingHeader step={3} onBack={() => router.back()} onSkip={() => router.replace('/')} />

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>{copy.onboarding.crew.eyebrow}</Text>
          <Text style={display(48, 42)}>{copy.onboarding.crew.title}</Text>
        </View>

        <View style={styles.timeline}>
          <View style={styles.rail} />
          {before.map((anchor) => (
            <TimelineAnchor key={anchor.id} time={anchor.usual_time} label={anchor.label} />
          ))}

          <View style={styles.habitRow}>
            <View style={styles.time} />
            <View style={styles.bulletColumn} />
            <View
              style={[
                styles.habitCard,
                { backgroundColor: habitColor, boxShadow: `0px 0px 40px ${alpha(habitColor, 0.55)}` },
              ]}
            >
              <View style={styles.habitText}>
                <Text style={[display(22, 22), { color: colors.white }]}>{habitName}</Text>
                <Text style={styles.habitSub}>{copy.onboarding.crew.justYou}</Text>
              </View>
              <View style={styles.newTag}>
                <Text style={styles.newTagLabel}>{copy.onboarding.crew.isNew}</Text>
              </View>
            </View>
          </View>

          {after.map((anchor) => (
            <TimelineAnchor key={anchor.id} time={anchor.usual_time} label={anchor.label} />
          ))}
        </View>

        <View style={styles.pitch}>
          <View style={styles.avatars}>
            <View style={styles.you}>
              <Text style={styles.youLabel}>{copy.onboarding.crew.you}</Text>
            </View>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.empty, i > 0 && styles.emptyOverlap]} />
            ))}
          </View>
          <View style={styles.pitchText}>
            <Text style={display(26, 25)}>{copy.onboarding.crew.pitch}</Text>
            <Text style={styles.pitchBlurb}>{copy.onboarding.crew.pitchBlurb}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
        <PrimaryButton
          label={copy.onboarding.crew.invite}
          onPress={() => router.replace('/crews')}
          icon={<ArrowRightIcon size={20} color={colors.bg} />}
        />
        <TextButton label={copy.onboarding.crew.solo} onPress={() => router.replace('/')} />
      </View>
    </View>
  );
}

function TimelineAnchor({ time, label }: { time: string; label: string }) {
  return (
    <View style={styles.anchorRow}>
      <Text style={styles.time}>{formatTimeShort(time)}</Text>
      <View style={styles.bulletColumn}>
        <View style={styles.bullet} />
      </View>
      <Text style={styles.anchorLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  intro: { gap: spacing.sm },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  timeline: {
    position: 'relative',
    gap: 2,
    paddingVertical: spacing.md,
    borderRadius: radii.bigCard,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rail: {
    position: 'absolute',
    left: 62,
    top: 22,
    bottom: 22,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  anchorRow: { flexDirection: 'row', alignItems: 'center', minHeight: 28 },
  time: {
    width: 50,
    textAlign: 'right',
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textFaint,
  },
  bulletColumn: { width: 26, alignItems: 'center' },
  bullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#6F6A62',
    backgroundColor: colors.bg,
  },
  anchorLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  habitRow: { flexDirection: 'row', alignItems: 'center', minHeight: 58 },
  habitCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: spacing.md,
    borderRadius: radii.card,
  },
  habitText: { flexGrow: 1, flexShrink: 1, gap: 2 },
  habitSub: { fontFamily: fonts.body, fontSize: 12, color: colors.white, opacity: 0.9 },
  newTag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.chip,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  newTagLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    textTransform: 'uppercase',
    color: colors.white,
  },
  pitch: {
    gap: spacing.md,
    padding: 18,
    borderRadius: radii.bigCard,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  you: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C23F17',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  youLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    textTransform: 'uppercase',
    color: colors.white,
  },
  empty: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: colors.bg,
    marginLeft: -10,
  },
  emptyOverlap: { marginLeft: -10 },
  pitchText: { gap: 4 },
  pitchBlurb: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  footer: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 0,
    gap: 10,
  },
});
