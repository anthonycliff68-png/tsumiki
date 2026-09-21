import { View } from 'react-native';

import { TextButton } from '@/components/Button';
import { Body, Screen, Stub, Title } from '@/components/Screen';
import { APP_NAME, APP_TAGLINE } from '@/constants/brand';
import { copy } from '@/copy';
import { useAuth } from '@/lib/auth';
import { habitColors, spacing } from '@/theme';

/** You. Settings and routine anchors arrive with onboarding, build step 3. */
export default function YouScreen() {
  const { session, signOut } = useAuth();
  const email = session?.user.email;

  return (
    <Screen color={habitColors[3]}>
      <Title size={64}>You</Title>
      <Body>
        {APP_NAME} — {APP_TAGLINE}
      </Body>
      {email && <Body>Signed in as {email}</Body>}
      <Stub>{copy.placeholder.you}</Stub>
      <View style={{ paddingTop: spacing.md }}>
        <TextButton label={copy.auth.signOut} onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}
