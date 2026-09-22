import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton, TextButton } from '@/components/Button';
import { useDockClearance } from '@/components/Dock';
import { FlameIcon } from '@/components/icons';
import { copy } from '@/copy';
import { useCreateCrew, useCrews, useHabits } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, display, fonts, habitColors, radii, spacing, tint } from '@/theme';

/** Crews. Artboards: GroupDark, CrewWalk. */
export default function CrewsScreen() {
  const insets = useSafeAreaInsets();
  const clearance = useDockClearance();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: crews = [], refetch } = useCrews(userId);
  const { data: habits = [] } = useHabits(userId);
  const createCrew = useCreateCrew(userId);

  const [starting, setStarting] = useState(false);
  const [habitId, setHabitId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const solo = habits.filter((habit) => habit.crew_id === null && habit.archived_at === null);
  const bleedColor = crews[0]?.habitColor ?? habitColors[2];

  const create = () => {
    setError(null);
    if (!habitId) return setError(copy.crews.pickHabit);
    if (!name.trim()) return setError(copy.crews.needName);
    createCrew.mutate(
      { habitId, name: name.trim() },
      {
        onSuccess: (crewId) => {
          setStarting(false);
          setName('');
          setHabitId(null);
          router.push({ pathname: '/crew/[id]', params: { id: crewId } });
        },
        onError: (e) => setError(e instanceof Error ? e.message : copy.auth.genericError),
      },
    );
  };

  return (
    <View style={styles.root}>
      <Bleed color={bleedColor} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingBottom: clearance,
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={display(64, 58)}>{copy.crews.title}</Text>

        {crews.map((crew) => (
          <Pressable
            key={crew.id}
            accessibilityRole="button"
            accessibilityLabel={`${crew.name}, ${crew.habitName}`}
            onPress={() => router.push({ pathname: '/crew/[id]', params: { id: crew.id } })}
            style={({ pressed }) => [
              styles.crewCard,
              { backgroundColor: crew.habitColor },
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={styles.crewTop}>
              <Text style={styles.crewHabit}>{crew.habitName}</Text>
              <View style={styles.streakPill}>
                <FlameIcon size={13} color={colors.white} />
                <Text style={styles.streakPillText}>{crew.streakCurrent}</Text>
              </View>
            </View>
            <Text style={styles.crewName}>{crew.name}</Text>
            <Text style={styles.crewMeta}>{copy.crews.spots(crew.memberCount)}</Text>
          </Pressable>
        ))}

        {crews.length === 0 && !starting && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{copy.crews.emptyTitle}</Text>
            <Text style={styles.emptyBody}>{copy.crews.emptyBody}</Text>
            <PrimaryButton label={copy.crews.startCrew} onPress={() => setStarting(true)} />
          </View>
        )}

        {crews.length > 0 && !starting && (
          <TextButton label={copy.crews.startCrew} onPress={() => setStarting(true)} />
        )}

        {starting && (
          <View style={styles.form}>
            <Text style={styles.label}>{copy.crews.pickHabit}</Text>
            {solo.length === 0 ? (
              <Text style={styles.hint}>{copy.crews.noSoloHabits}</Text>
            ) : (
              <View style={styles.chips}>
                {solo.map((habit) => {
                  const active = habit.id === habitId;
                  return (
                    <Pressable
                      key={habit.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setHabitId(habit.id)}
                      style={[
                        styles.chip,
                        active && { backgroundColor: habit.color, borderColor: habit.color },
                      ]}
                    >
                      <View style={[styles.dot, { backgroundColor: habit.color }]} />
                      <Text style={[styles.chipText, active && { color: colors.white }]}>
                        {habit.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Text style={styles.label}>{copy.crews.nameIt}</Text>
            <TextInput
              accessibilityLabel={copy.crews.nameIt}
              value={name}
              onChangeText={setName}
              placeholder={copy.crews.namePlaceholder}
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.text}
              style={styles.input}
              maxLength={40}
            />

            <Text style={styles.hint}>{copy.crews.invitesLater}</Text>
            {error && <Text style={styles.error}>{error}</Text>}

            <PrimaryButton
              label={copy.crews.create}
              busy={createCrew.isPending}
              onPress={create}
            />
            <TextButton label={copy.crews.cancel} onPress={() => setStarting(false)} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  crewCard: { gap: 6, padding: spacing.xl, borderRadius: radii.hero },
  crewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  crewHabit: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.white, opacity: 0.85 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: radii.chip,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  streakPillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.white },
  crewName: { ...display(38, 36), color: colors.white },
  crewMeta: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  empty: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.bigCard,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  emptyTitle: { ...display(30, 30) },
  emptyBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  form: { gap: spacing.md },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  input: {
    minHeight: 58,
    paddingHorizontal: 16,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textFaint },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: tint(habitColors[1], 0.2) },
});
