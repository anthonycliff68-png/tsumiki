import { Redirect } from 'expo-router';

/**
 * Home folded into My Day. Kept as a redirect so everything that still opens
 * "/" — notifications, deep links, the end of onboarding — lands there.
 */
export default function Home() {
  return <Redirect href="/my-day" />;
}
