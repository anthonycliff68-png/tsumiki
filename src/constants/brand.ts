/** The one place the app's name lives. 積み木 — "building blocks", said tsoo-MEE-kee. */
export const APP_NAME = 'Tsumiki';

/** One-line pitch, used on the welcome screen and the invite landing page. */
export const APP_TAGLINE = 'Build habits with your people, one stack at a time.';

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
