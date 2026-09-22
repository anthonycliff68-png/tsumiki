import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton, TextButton } from '@/components/Button';
import { ArrowRightIcon, CheckIcon } from '@/components/icons';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { copy } from '@/copy';
import { DEFAULT_ANCHORS, HABIT_SUGGESTIONS, type HabitSuggestion } from '@/data/defaults';
import { useAnchors, useCreateFirstHabit } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Anchor } from '@/lib/models';
import { alpha, colors, display, fonts, habitColors, radii, spacing } from '@/theme';

/**
 * Suggestions are written against the default routine, so match them back to
 * whatever the person actually kept, by label. Anything unmatched falls back to
 * their first anchor rather than disappearing.
 */
function anchorFor(suggestion: HabitSuggestion, anchors: Anchor[]): Anchor | undefined {
  const seed = DEFAULT_ANCHORS.find((a) => a.key === suggestion.anchorKey);
  const byLabel = seed
    ? anchors.find((a) => a.label.toLowerCase() === seed.label.toLowerCase())
    : undefined;
  return byLabel ?? anchors[0];
}

/** Step 2. Artboard: OnbHabit. Writes habits + habit_schedules. */
export default function FirstHabitScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: anchors = [] } = useAnchors(userId);
  const createHabit = useCreateFirstHabit(userId);

  const [selectedId, setSelectedId] = useState<string>('walk');
  const [error, setError] = useState<string | null>(null);

  const cards = useMemo(
    () =>
      HABIT_SUGGESTIONS.map((suggestion) => ({
        suggestion,
        anchor: anchorFor(suggestion, anchors),
      })),
    [anchors],
  );

  const selected = cards.find((card) => card.suggestion.id === selectedId);

  const add = async () => {
    if (!selected?.anchor) return;
    setError(null);
    try {
      const habit = await createHabit.mutateAsync({
        name: selected.suggestion.name,
        color: selected.suggestion.color,
        anchorId: selected.anchor.id,
      });
      router.push({
        pathname: '/crew',
        params: { habitId: habit.id, name: habit.name, color: habit.color },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.onboarding.habit.failed);
    }
  };

  return (
    <View style={styles.root}>
      <Bleed color={selected?.suggestion.color ?? habitColors[0]} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: 120,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingHeader step={2} onBack={() => router.back()} onSkip={() => router.replace('/')} />

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>{copy.onboarding.habit.eyebrow}</Text>
          <Text style={display(48, 42)}>{copy.onboarding.habit.title}</Text>
          <Text style={styles.blurb}>{copy.onboarding.habit.blurb}</Text>
        </View>

        <View style={styles.grid}>
          {cards.map(({ suggestion, anchor }) => {
            const isSelected = suggestion.id === selectedId;
            return (
              <Pressable
                key={suggestion.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${suggestion.name}. ${copy.onboarding.habit.after(anchor?.label ?? '')}`}
                onPress={() => setSelectedId(suggestion.id)}
                style={({ pressed }) => [
                  styles.card,
                  isSelected
                    ? {
                        backgroundColor: suggestion.color,
                        borderColor: colors.white,
                        borderWidth: 2,
                        boxShadow: `0px 0px 40px ${alpha(suggestion.color, 0.6)}`,
                      }
                    : styles.cardIdle,
                  pressed && styles.pressed,
                ]}
              >
                {isSelected && (
                  <View style={styles.badge}>
                    <CheckIcon size={14} color={colors.bg} strokeWidth={3.2} />
                  </View>
                )}
                <View style={styles.cardEyebrowRow}>
                  {!isSelected && (
                    <View style={[styles.dot, { backgroundColor: suggestion.color }]} />
                  )}
                  <Text
                    style={[styles.cardEyebrow, isSelected && styles.cardEyebrowSelected]}
                    numberOfLines={1}
                  >
                    {copy.onboarding.habit.after(anchor?.label ?? '')}
                  </Text>
                </View>
                <Text style={[display(24, 22), isSelected && { color: colors.white }]}>
                  {suggestion.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextButton
          label={copy.onboarding.habit.makeOwn}
          onPress={() => router.replace('/')}
        />

        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.onboarding.habit.add(selected?.suggestion.name ?? '')}
          disabled={!selected || createHabit.isPending}
          onPress={() => void add()}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: selected?.suggestion.color ?? habitColors[0] },
            (pressed || createHabit.isPending) && styles.pressed,
          ]}
        >
          <Text style={styles.ctaLabel}>
            {createHabit.isPending
              ? copy.onboarding.habit.adding
              : copy.onboarding.habit.add(selected?.suggestion.name ?? '')}
          </Text>
          <ArrowRightIcon size={20} color={colors.white} />
        </Pressable>
      </View>
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
  blurb: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    minHeight: 112,
    padding: 14,
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: radii.bigCard,
  },
  cardIdle: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  cardEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 28,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardEyebrow: {
    flexShrink: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  cardEyebrowSelected: { color: colors.white, opacity: 0.9 },
  footer: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 0,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 58,
    paddingHorizontal: 20,
    borderRadius: radii.chip,
  },
  ctaLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.white,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 21,
    color: habitColors[1],
  },
  pressed: { opacity: 0.85 },
});
