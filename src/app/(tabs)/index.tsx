import { StyleSheet, Text, View } from 'react-native';

import { Body, Eyebrow, Screen, Stub, Title } from '@/components/Screen';
import { copy } from '@/copy';
import { fakeProgress, fakeUpNext } from '@/data/fake';
import { colors, display, fonts, tint } from '@/theme';

/** Today. Artboard: TodayDark. The real hero card lands in build step 4. */
export default function TodayScreen() {
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <Screen color={fakeUpNext.color}>
      <View style={styles.headerRow}>
        <Title size={76}>{date}</Title>
        <View style={styles.count}>
          <Text style={[display(30, 30), { color: tint(fakeUpNext.color, 0.55) }]}>
            {fakeProgress.done}/{fakeProgress.total}
          </Text>
          <Text style={styles.countLabel}>{copy.today.doneCount}</Text>
        </View>
      </View>

      <Eyebrow>{copy.today.upNext}</Eyebrow>
      <Body>
        {fakeUpNext.name} · {fakeUpNext.anchorLabel} · {fakeUpNext.crewName}
      </Body>

      <Stub>{copy.placeholder.today}</Stub>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  count: {
    alignItems: 'flex-end',
    gap: 2,
    paddingBottom: 4,
  },
  countLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textFaint,
    textTransform: 'uppercase',
  },
});
