import { Body, Screen, Stub, Title } from '@/components/Screen';
import { copy } from '@/copy';
import { fakeRestOfDay, fakeUpNext } from '@/data/fake';

/** My Day. Artboard: MyDay. The timeline lands in build step 4. */
export default function MyDayScreen() {
  return (
    <Screen color={fakeUpNext.color}>
      <Title size={64}>My day</Title>
      <Body>
        {fakeRestOfDay.length + 1} habits stacked onto today&apos;s anchors.
      </Body>
      <Stub>{copy.placeholder.myDay}</Stub>
    </Screen>
  );
}
