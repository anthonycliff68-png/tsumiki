/**
 * How things look on My Day: a to-do's colour when it has none of its own, and
 * the emoji guessed from a name. Pure, so it is tested; nothing here may import
 * from '@/'.
 */

/** Same id, same colour, every time: a to-do keeps its colour across renders and days. */
export function todoColor(id: string, palette: readonly string[]): string {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return palette[sum % palette.length] ?? '';
}

/** Order matters: the first match wins, so "No phone in bed" is 📵, not 🛏️, and "haircut" beats "book". */
const GUESS: [RegExp, string][] = [
  [/no phone|screen/, '📵'], [/meditat|breath/, '🧘'], [/\bbed\b|sleep|nap/, '🛏️'], [/haircut|hair/, '💇'], [/\bread|novel/, '📖'],
  [/water|drink/, '💧'], [/walk|steps/, '🚶'], [/run\b|jog/, '🏃'], [/stretch|yoga|foam/, '🤸'],
  [/workout|gym|lift|weights/, '🏋️'], [/shake|smoothie|protein/, '🥤'], [/coffee/, '☕'], [/dentist|teeth|floss/, '🦷'],
  [/call|phone/, '📞'], [/reply|text|message|email/, '💬'], [/stamp|post|mail|letter/, '📮'],
  [/buy|shop|groceries/, '🛒'], [/tiktok|video|edit|film/, '🎬'], [/clean|tidy|laundry/, '🧺'], [/cook|dinner|lunch|meal/, '🍳'],
  [/study|homework|learn/, '📚'], [/journal|write|diary/, '✍️'], [/pay|bill|bank/, '💳'], [/plant/, '🪴'], [/dog/, '🐕'],
];

/** The emoji a name suggests, or '' when nothing fits. */
export function guessEmoji(title: string): string {
  const t = title.toLowerCase();
  return GUESS.find(([re]) => re.test(t))?.[1] ?? '';
}

/** The picker's 32. */
export const EMOJI_CHOICES: readonly string[] = [
  '💧', '🧘', '🏃', '🚶', '🏋️', '🤸', '🛏️', '📖', '✍️', '📚', '💬', '📞', '📮', '🛒', '🍳', '🥤',
  '☕', '🦷', '💊', '🧺', '🪴', '🐕', '🎬', '🎧', '💳', '💼', '🧠', '❤️', '⭐', '🔥', '🎯', '📵',
];

/** The step that's up next: the first open one by position. */
export function nextStep<T extends { position: number; done: boolean }>(steps: readonly T[]): T | undefined {
  return [...steps].sort((a, b) => a.position - b.position).find((s) => !s.done);
}

/** A colour in OKLCH: perceived lightness 0-1, chroma, hue in degrees. Takes hex, or rgb() the way tint() writes it. */
export function toOklch(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const channels = hex.startsWith('rgb') ? (hex.match(/\d+/g) ?? []).slice(0, 3).map(Number) : [n >> 16, (n >> 8) & 255, n & 255];
  const [r, g, b] = channels.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

/** OKLCH back to hex, or null when it falls outside what a screen can show. */
function fromOklch(L: number, C: number, h: number): string | null {
  const A = C * Math.cos((h * Math.PI) / 180), B = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  if (rgb.some((c) => c < -0.0005 || c > 1.0005)) return null;
  return `#${rgb.map((c) => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055))).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Anyone's own colour, made loud for My Day: same hue, all at one bright
 * lightness so no colour hides (a navy and a gold end up equally easy to see),
 * and chroma pushed as far as the screen allows. Dark text reads on every one.
 * The quiet ones stay a little quieter, since chroma scales from where it was.
 */
export function loud(hex: string, lightness = 0.76): string {
  const [, c, h] = toOklch(hex);
  for (let C = Math.min(0.2, Math.max(0.05, c * 2.2)); C > 0; C -= 0.004) {
    const out = fromOklch(lightness, C, h);
    if (out) return out;
  }
  return fromOklch(lightness, 0, h) ?? hex;
}

/**
 * The colours My Day's pickers offer. loud() pulls every colour to one bright
 * lightness, and some of the 24 in habitColors then land on top of each other
 * (red, salmon and orange all come out salmon; three blues come out periwinkle).
 * These are the original six plus the ones that still stand apart once loud:
 * every pair is at least 0.06 apart in OKLab. Crews and faces keep all 24.
 */
export const DAY_COLORS: readonly string[] = [
  '#3F5FA8', '#E8552B', '#1F8A8C', '#8A5A9E', '#E0A526', '#C2306B',
  '#8A8F3C', '#6E9E3F', '#2F6B4F', '#2F7FA8', '#7A5AC9',
];

/** A picker's choices: DAY_COLORS, with the current colour kept up front if it was trimmed. */
export function dayChoices(current: string | null | undefined): readonly string[] {
  return !current || DAY_COLORS.includes(current) ? DAY_COLORS : [current, ...DAY_COLORS];
}
