/**
 * Design tokens for the cinematic dark direction.
 * Source of truth: the "Direction 2: cinematic dark" rows on the design canvas.
 * The app is dark only — there is no light theme in v1.
 */

export const colors = {
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
  white: '#FFFFFF',
} as const;

/** blue, orange, teal, purple, gold, magenta */
export const habitColors = [
  '#3F5FA8',
  '#E8552B',
  '#1F8A8C',
  '#8A5A9E',
  '#E0A526',
  '#C2306B',
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
export const display = (size: number, lineHeight = size) =>
  ({
    fontFamily: fonts.display,
    fontSize: size,
    lineHeight: Math.max(lineHeight, size),
    letterSpacing: -1,
    textTransform: 'uppercase',
    color: colors.text,
  }) as const;

// --- colour helpers ------------------------------------------------------

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
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
