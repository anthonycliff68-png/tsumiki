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
 * Where invite links point.
 *
 * This was tsumiki.app, a domain nobody owns, so every invite ever sent led
 * to a 404. It now points at the GitHub Pages site, which is real and which
 * serves 404.html for any path it does not recognise — that page reads the
 * code out of the URL and hands off to the app.
 *
 * It is still a stopgap. On a domain you own you can host an
 * apple-app-site-association file and the link opens the app directly,
 * without the page appearing at all. Change this when the domain is
 * registered and set up Universal Links and App Links at the same time.
 */
export const INVITE_BASE_URL = 'https://anthonycliff68-png.github.io/tsumiki/j';

/** The shared message that goes out with an invite link. */
export function inviteMessage(crewName: string, habitName: string): string {
  return `${habitName} with me? Same habit, your own time. ${crewName} keeps one streak going.`;
}
