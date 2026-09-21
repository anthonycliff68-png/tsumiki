import { Body, Screen, Stub, Title } from '@/components/Screen';
import { copy } from '@/copy';
import { fakeRestOfDay } from '@/data/fake';

/** Crews. Artboards: GroupDark, CrewWalk. Real crews land in build step 6. */
export default function CrewsScreen() {
  const crew = fakeRestOfDay[1];

  return (
    <Screen color={crew?.color ?? '#1F8A8C'}>
      <Title size={64}>Crews</Title>
      <Body>{crew ? `${crew.crewName} · ${crew.name}` : 'No crews yet.'}</Body>
      <Stub>{copy.placeholder.crews}</Stub>
    </Screen>
  );
}
