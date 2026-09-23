/** The one place the app's name lives. 積み木 — "building blocks", said tsoo-MEE-kee. */
export const APP_NAME = 'Tsumiki';

/** One-line pitch, used on the welcome screen and the invite landing page. */
export const APP_TAGLINE = 'Build habits with your people, one stack at a time.';

/**
 * The published rules everyone agrees to, and the privacy policy. Both are
 * placeholders until the domain exists — the App Store will not take the app
 * without them reachable and accurate.
 */
export const TERMS_URL = 'https://tsumiki.app/terms';
export const PRIVACY_URL = 'https://tsumiki.app/privacy';

/**
 * Where invite links point. The domain is still an open question in the brief,
 * so this is a placeholder: change it once the real one is registered, and set
 * up Universal Links and App Links on it at the same time.
 */
export const INVITE_BASE_URL = 'https://tsumiki.app/j';

/** The shared message that goes out with an invite link. */
export function inviteMessage(crewName: string, habitName: string): string {
  return `${habitName} with me? Same habit, your own time. ${crewName} keeps one streak going.`;
}
