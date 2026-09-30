import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/Button';
import { FacePicker } from '@/components/FacePicker';
import { Field } from '@/components/Field';
import { useStyles } from '@/lib/appearance';
import { copy } from '@/copy';
import { useHabitHistory, useMyProfile, useUpdateProfile } from '@/lib/api';
import { faceOf, personName } from '@/lib/models';
import { lifetimeTotals } from '@/lib/stats';
import { alpha, display, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

const DISC = 64;

/** "Here since March 2026". The month is plenty; the day is nobody's business. */
function monthAndYear(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/**
 * Who you are, on the You screen: your face, your name, when you turned up, and
 * what you have done since.
 *
 * The three numbers are counted from the check-ins themselves rather than kept
 * on the profile row, so they cannot drift out of step with the history they
 * describe — including after a history reset, which would otherwise leave a
 * stored total bragging about days that no longer exist.
 */
export function ProfileCard({ userId }: { userId: string | undefined }) {
  const styles = useStyles(makeStyles);
  const { data: profile } = useMyProfile(userId);
  const { data: history } = useHabitHistory(userId);
  const update = useUpdateProfile(userId);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [colour, setColour] = useState<string>(habitColors[0]);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(
    () => lifetimeTotals((history ?? []).flatMap((habit) => habit.checkedOn)),
    [history],
  );

  if (!profile) return null;

  const shownName = personName(profile.display_name, copy.crews.someone);

  const startEditing = () => {
    setName(profile.display_name);
    setEmoji(profile.avatar_emoji);
    setColour(profile.avatar_color || habitColors[0]);
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(copy.onboarding.profile.nameMissing);
      return;
    }
    setError(null);
    try {
      await update.mutateAsync({ displayName: trimmed, avatarColor: colour, avatarEmoji: emoji });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.onboarding.profile.failed);
    }
  };

  // While editing, the disc previews what is being chosen rather than what is
  // saved — otherwise the colour row appears to do nothing until Done.
  const discColour = editing ? colour : profile.avatar_color;
  const discFace = editing ? faceOf(name.trim(), emoji) : faceOf(shownName, profile.avatar_emoji);
  const discIsEmoji = editing ? emoji !== '' : profile.avatar_emoji !== '';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.disc, { backgroundColor: discColour }]}>
          <Text style={[styles.discFace, discIsEmoji && styles.discEmoji]}>{discFace}</Text>
        </View>

        <View style={styles.who}>
          <Text style={styles.name} numberOfLines={1}>
            {editing ? name.trim() || shownName : shownName}
          </Text>
          <Text style={styles.since}>
            {copy.you.memberSince(monthAndYear(profile.created_at))}
          </Text>
        </View>

        {!editing && (
          <TextButton
            label={copy.you.editProfile}
            accessibilityLabel={copy.you.editProfileLabel}
            onPress={startEditing}
          />
        )}
      </View>

      {editing ? (
        <View style={styles.editor}>
          <Field
            label={copy.onboarding.profile.nameLabel}
            placeholder={copy.onboarding.profile.namePlaceholder}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError(null);
            }}
            autoCapitalize="words"
            maxLength={40}
            editable={!update.isPending}
          />

          <FacePicker emoji={emoji} onEmoji={setEmoji} colour={colour} onColour={setColour} />

          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          <PrimaryButton
            label={update.isPending ? copy.onboarding.profile.saving : copy.you.doneEditing}
            busy={update.isPending}
            onPress={() => void save()}
          />
          <TextButton
            label={copy.you.cancelEditing}
            onPress={() => setEditing(false)}
            disabled={update.isPending}
          />
        </View>
      ) : totals.checkins === 0 ? (
        <Text style={styles.empty}>{copy.you.noStatsYet}</Text>
      ) : (
        <View style={styles.stats}>
          <Stat value={String(totals.checkins)} label={copy.you.statCheckins} />
          <Stat value={String(totals.days)} label={copy.you.statDays} />
          <Stat
            value={String(totals.bestRun)}
            label={`${copy.you.statBestRun} · ${copy.you.statBestRunUnit(totals.bestRun)}`}
          />
        </View>
      )}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.05),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  discFace: { ...display(24, 24), color: colors.white },
  // An emoji is a glyph, not type: the display face would letter-space it.
  discEmoji: { fontFamily: undefined, fontSize: 30, letterSpacing: 0 },
  who: { flex: 1, gap: 2 },
  name: { ...display(26, 26), color: colors.text },
  since: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint },
  editor: { gap: spacing.md },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: 2 },
  statValue: { ...display(30, 28), color: colors.text },
  statLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textFaint,
  },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 21,
    color: habitColors[1],
  },
}) as const;
