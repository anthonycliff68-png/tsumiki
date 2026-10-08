/** The one place the app's name lives. 積み木 — "building blocks", said tsoo-MEE-kee. */
export const APP_NAME = 'Tsumiki';

/** One-line pitch, used on the welcome screen and the invite landing page. */
export const APP_TAGLINE = 'Build habits with your people, one stack at a time.';

/**
 * The published rules everyone agrees to, and the privacy policy.
 *
 * On conjureapps.com, the studio site, since 8 October. They were on GitHub
 * Pages before, which was only ever a stopgap for having no domain.
 *
 * Whatever these say has to actually load: the App Store checks the privacy
 * one and a reviewer taps the other. All three were confirmed returning 200
 * before this changed.
 */
export const TERMS_URL = 'https://conjureapps.com/apps/tsumiki/terms/';
export const PRIVACY_URL = 'https://conjureapps.com/apps/tsumiki/privacy/';
export const SUPPORT_URL = 'https://conjureapps.com/apps/tsumiki/support/';

/**
 * Where invite links point.
 *
 * This was tsumiki.app, a domain nobody owns, so every invite ever sent led
 * to a 404. It now points at the GitHub Pages site, which is real and which
 * serves 404.html for any path it does not recognise — that page reads the
 * code out of the URL and hands off to the app.
 *
 * Deliberately NOT moved to conjureapps.com with the others: there is no
 * /j/<code> route there, and pointing invites at a 404 would be worse than
 * the stopgap. Moving it means building that page on the studio site and
 * hosting an apple-app-site-association file beside it, which is also what
 * finally makes an invite open the app directly instead of showing a web
 * page first.
 */
export const INVITE_BASE_URL = 'https://anthonycliff68-png.github.io/tsumiki/j';

/** The shared message that goes out with an invite link. */
export function inviteMessage(crewName: string, habitName: string): string {
  return `${habitName} with me? Same habit, your own time. ${crewName} keeps one streak going.`;
}
