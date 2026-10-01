/**
 * Design tokens. The cinematic dark direction is the original and stays the
 * source of truth; light is a second palette against the same token names.
 *
 * `overlay` is the one that is easy to get wrong. Borders, scrims and input
 * fills were all written as white at low alpha, which lightens on a dark
 * ground — on a light ground the same thing has to darken. So anything that
 * means "a wash over whatever is behind" uses `overlay`, never `white`.
 */

export type Palette = {
  bg: string;
  surface: string;
  surfaceRaised: string;
  glass: string;
  text: string;
  textMuted: string;
  textFaint: string;
  textInactive: string;
  border: string;
  hairline: string;
  success: string;
  /** A wash over the ground: white on dark, near-black on light. */
  overlay: string;
  /** Actual white, for the few places that genuinely mean it. */
  white: string;
  /** Which ground this is. Read by ink(), which has to mix the other way on light. */
  dark: boolean;
};

export const darkPalette: Palette = {
  bg: '#0B0B0C',
  surface: '#1C1C1F',
  surfaceRaised: '#2A2A2E',
  glass: 'rgba(24,24,27,0.72)',
  text: '#F4F1EC',
  textMuted: '#BDB7AD',
  textFaint: '#9D978D',
  /** Inactive dock tabs sit a touch cooler than textFaint. */
  textInactive: '#8E887E',
  border: 'rgba(255,255,255,0.14)',
  hairline: 'rgba(255,255,255,0.08)',
  success: '#7FD1A4',
  overlay: '#FFFFFF',
  white: '#FFFFFF',
  dark: true,
};

/**
 * Provisional. Warm paper rather than pure white, so the habit colours sit on
 * it the way they sit on the dark ground. Not designed yet — that is its own
 * job, and these values are here so the switch can be seen working.
 */
export const lightPalette: Palette = {
  bg: '#F6F3ED',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  glass: 'rgba(255,255,255,0.78)',
  text: '#16161A',
  textMuted: '#4B4740',
  textFaint: '#7A746B',
  textInactive: '#8E887E',
  border: 'rgba(22,22,26,0.16)',
  hairline: 'rgba(22,22,26,0.09)',
  success: '#2F8F5B',
  overlay: '#16161A',
  white: '#FFFFFF',
  dark: false,
};

export const palettes = { dark: darkPalette, light: lightPalette };

/**
 * The dark palette, for modules that read colours at import time. Anything
 * that should follow the theme reads it through `useTheme()` instead.
 */
export const colors = darkPalette;

/**
 * The colours a habit, a crew or a face can be.
 *
 * The brief's six come first and keep their order, because a dozen places
 * reach for a specific one by index — habitColors[1] is the colour an error is
 * written in, habitColors[2] is the glow behind the schedule sheet — and
 * habits already in the database store the value, not the position. Re-sorting
 * the whole list by hue would have quietly restyled half the app.
 *
 * The eighteen after them run around the wheel, so the picker reads as a
 * spectrum from the point where the original six end.
 *
 * Every one of them carries white display text on a filled card, which is the
 * job: each was checked against the weakest of the original six (gold, at 2.19
 * to white) and none falls below it.
 */
export const habitColors = [
  // The original six: blue, orange, teal, purple, gold, magenta.
  '#3F5FA8',
  '#E8552B',
  '#1F8A8C',
  '#8A5A9E',
  '#E0A526',
  '#C2306B',
  // Red through yellow.
  '#C0392B',
  '#E07A5F',
  '#C9802F',
  '#8A8F3C',
  // Greens.
  '#6E9E3F',
  '#3F8F4F',
  '#2F6B4F',
  '#3FA796',
  // Blues.
  '#2F7FA8',
  '#4A7FD4',
  '#5A5AC0',
  // Violet through pink.
  '#7A5AC9',
  '#A355B0',
  '#D45D9E',
  '#B5485F',
  // The quiet ones, for a day that is already loud.
  '#8C6239',
  '#5F7384',
  '#44707F',
] as const;

export type HabitColor = (typeof habitColors)[number];

export const fonts = {
  /** Archivo, width 75%, weight 900. Always UPPERCASE with letterSpacing -1. */
  display: 'Archivo-Condensed-Black',
  body: 'DMSans-Regular',
  bodyMedium: 'DMSans-Medium',
  bodyBold: 'DMSans-Bold',
} as const;

export const radii = {
  chip: 999,
  card: 16,
  bigCard: 22,
  hero: 30,
  dock: 28,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 32,
} as const;

/** Minimum touch target, in dp. Nothing tappable goes under this. */
export const HIT_SIZE = 44;

/**
 * Display type: Archivo condensed black, uppercase, tight.
 *
 * React Native crops each line to its line box — unlike CSS, where a glyph
 * happily overflows a short line-height. The canvas leading goes as tight as
 * 0.82, which slices the bottoms off the letters on device, so the line height
 * never drops below the font size here.
 */
/**
 * The display face: size, tracking and casing, but deliberately no colour.
 *
 * It used to set one, taken from the dark palette because this is a plain
 * function and cannot read the theme. In light mode that painted every
 * heading near-white on near-white — the date on Today and the habit name on
 * its own card both disappeared completely. Callers supply the colour: from
 * makeStyles, which is handed the live palette, or through <Display>.
 */
export const display = (size: number, lineHeight = size) =>
  ({
    fontFamily: fonts.display,
    fontSize: size,
    lineHeight: Math.max(lineHeight, size),
    letterSpacing: -1,
    textTransform: 'uppercase',
  }) as const;

// --- colour helpers ------------------------------------------------------

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  // tint() and shade() return rgb() strings, so they have to read them back —
  // composing them otherwise yields rgb(NaN, NaN, NaN), which React Native
  // ignores silently and leaves the element its inherited colour.
  const rgbMatch = /^rgba?\(([^)]+)\)/.exec(hex.trim());
  if (rgbMatch) {
    const [r, g, b] = (rgbMatch[1] ?? '').split(',').map((part) => Number(part.trim()));
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
  }

  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** Same colour at a given opacity. */
export function alpha(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Mix a colour towards white. amount 0 = unchanged, 1 = white. */
export function tint(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** Mix a colour towards black. */
export function shade(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c: number) => Math.round(c * (1 - amount));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/**
 * A habit colour you can read as text on the current ground.
 *
 * tint() only mixes towards white, which is right on the dark ground and
 * invisible on the light one — a habit colour lightened 75% towards white is
 * very nearly the light background it is sitting on. On light it has to go the
 * other way, and less far, or the colour stops being recognisable.
 */
export function ink(color: string, colors: Palette): string {
  return colors.dark ? tint(color, 0.55) : shade(color, 0.3);
}

/**
 * The second glow behind a screen is a different hue, not a lighter version of
 * the first — that hue contrast is what gives the canvas screens their depth.
 * The canvas pairs them by eye rather than by formula, so the pairs are listed.
 */
const COMPANIONS: Record<string, string> = {
  '#3F5FA8': '#1F8A8C', // blue with teal
  '#E8552B': '#3F5FA8', // orange with blue
  '#1F8A8C': '#3F5FA8', // teal with blue
  '#8A5A9E': '#C2306B', // purple with magenta
  '#E0A526': '#E8552B', // gold with orange
  '#C2306B': '#8A5A9E', // magenta with purple
};

/** The hue that sits behind `color` in the bleed. */
export function companionColor(color: string): string {
  return COMPANIONS[color.toUpperCase()] ?? tint(color, 0.4);
}

/**
 * The colour of a moment in the day — wake up, coffee, work, bed.
 *
 * Moments are set in type rather than filled like habit cards, so the colour
 * is lifted off the habit palette rather than darkened: a deep fill reads well
 * behind white text but disappears as text on a near-black ground. Derived
 * from the label, so a moment keeps its colour as long as it keeps its name.
 */
/**
 * A moment's colour: the one chosen for it, or failing that one derived from
 * its label. The column is nullable on purpose — a moment nobody has picked a
 * colour for keeps the colour it has always had.
 */
export function momentColor(anchor: { label: string; color?: string | null }): string {
  return anchor.color ?? anchorColor(anchor.label);
}

/**
 * The six a derived moment colour is drawn from.
 *
 * Deliberately not the whole palette. This hash is what gives a moment its
 * colour when nobody has chosen one, and the comment above promises such a
 * moment keeps the colour it has always had — so the list it indexes into
 * cannot grow. Widening it to all twenty-four re-coloured ten of the twelve
 * default moments, which is a silent restyle of everybody's My Day in exchange
 * for variety nobody asked for here. The picker offers all of them; the hash
 * stays where it started.
 */
const MOMENT_HUES = habitColors.slice(0, 6);

export function anchorColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  const base = MOMENT_HUES[hash % MOMENT_HUES.length] ?? habitColors[0];
  return tint(base, 0.22);
}

export const theme = {
  colors,
  habitColors,
  fonts,
  radii,
  spacing,
  display,
  alpha,
  tint,
  shade,
} as const;
