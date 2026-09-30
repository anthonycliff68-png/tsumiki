import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton, TextButton } from '@/components/Button';
import { ArrowRightIcon, CheckIcon } from '@/components/icons';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { DEFAULT_ANCHORS, HABIT_SUGGESTIONS, type HabitSuggestion } from '@/data/defaults';
import { useAnchors, useCreateFirstHabit } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Anchor } from '@/lib/models';
import { alpha, display, fonts, habitColors, radii, spacing, type Palette } from '@/theme';
import { Display } from '@/components/Screen';

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
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: anchors = [] } = useAnchors(userId);
  const createHabit = useCreateFirstHabit(userId);

  const [selectedId, setSelectedId] = useState<string>('walk');
  /**
   * A moment picked by hand, overriding the one the suggestion was matched to.
   * Cleared whenever the habit changes, because the match is a better starting
   * guess for the new one than the last habit's answer.
   */
  const [movedTo, setMovedTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickHabit = (id: string) => {
    setSelectedId(id);
    setMovedTo(null);
  };

  const cards = useMemo(
    () =>
      HABIT_SUGGESTIONS.map((suggestion) => ({
        suggestion,
        anchor: anchorFor(suggestion, anchors),
      })),
    [anchors],
  );

  const selected = cards.find((card) => card.suggestion.id === selectedId);
  /** Where this habit will actually hang: your choice, or the matched guess. */
  const anchor = anchors.find((a) => a.id === movedTo) ?? selected?.anchor;

  const add = async () => {
    if (!selected || !anchor) return;
    setError(null);
    try {
      const habit = await createHabit.mutateAsync({
        name: selected.suggestion.name,
        color: selected.suggestion.color,
        anchorId: anchor.id,
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
        <OnboardingHeader step={3} onBack={() => router.back()} />

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>{copy.onboarding.habit.eyebrow}</Text>
          <Display size={48} line={42}>{copy.onboarding.habit.title}</Display>
          <Text style={styles.blurb}>{copy.onboarding.habit.blurb}</Text>
        </View>

        <View style={styles.grid}>
          {cards.map((card) => {
            const { suggestion } = card;
            const isSelected = suggestion.id === selectedId;
            return (
              <Pressable
                key={suggestion.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${suggestion.name}. ${copy.onboarding.habit.after(card.anchor?.label ?? '')}`}
                onPress={() => pickHabit(suggestion.id)}
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
                    {copy.onboarding.habit.after(
                      (isSelected ? anchor?.label : card.anchor?.label) ?? '',
                    )}
                  </Text>
                </View>
                {/* display() sets no colour of its own, so this fell back to
                    black — five of the six suggestions were near-invisible on
                    a dark card, and only the selected one could be read. The
                    unselected ones need saying explicitly. */}
                <Text
                  style={[display(24, 22), { color: isSelected ? colors.white : colors.text }]}
                >
                  {suggestion.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* The moment is a choice, not a fact. Showing every moment with the
            current one lit is the clearest way to say so — and it is the only
            place in setup where the stack is visibly two things joined. */}
        {anchors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.eyebrow}>{copy.onboarding.habit.whenLabel}</Text>
            <View style={styles.moments}>
              {anchors.map((option) => {
                const active = option.id === anchor?.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={copy.onboarding.habit.after(option.label)}
                    onPress={() => setMovedTo(option.id)}
                    style={({ pressed }) => [
                      styles.moment,
                      active && { backgroundColor: colors.text, borderColor: colors.text },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.momentLabel, active && { color: colors.bg }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hint}>{copy.onboarding.habit.whenHint}</Text>
          </View>
        )}

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

const makeStyles = (colors: Palette) => ({
  section: { gap: spacing.sm },
  moments: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  moment: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.05),
  },
  momentLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint },
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
    backgroundColor: alpha(colors.overlay, 0.06),
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
}) as const;
