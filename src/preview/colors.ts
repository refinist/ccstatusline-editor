// Color resolution for the WYSIWYG preview.
//
// ccstatusline stores a widget's foreground/background as one of:
//   - a named ANSI color   ('cyan', 'brightBlue', 'bgRed', …)
//   - 'ansi256:N'          (xterm 256-color index)
//   - 'hex:RRGGBB'         (24-bit truecolor)
//   - 'gradient:<spec>'    (foreground only — preset name or hex stops)
//
// We resolve each to a real CSS value so the web preview matches what the
// terminal renders. Named colors use ccstatusline's truecolor palette (the
// Tango palette baked into its COLOR_MAP), so the preview is faithful.

// ── Named ANSI → hex (ccstatusline COLOR_MAP truecolor entries) ────────────
const ANSI_HEX: Record<string, string> = {
  black: '#000000',
  red: '#cc0000',
  green: '#4e9a06',
  yellow: '#c4a000',
  blue: '#3465a4',
  magenta: '#75507b',
  cyan: '#06989a',
  white: '#d3d7cf',
  brightBlack: '#555753',
  brightRed: '#ef2929',
  brightGreen: '#8ae234',
  brightYellow: '#fce94f',
  brightBlue: '#729fcf',
  brightMagenta: '#ad7fa8',
  brightCyan: '#34e2e2',
  brightWhite: '#eeeeec',
  // ccstatusline catalog also uses these informal names for some defaults:
  gray: '#9aa0a6',
  grey: '#9aa0a6'
};

/** The 16 selectable foreground names, in picker order. */
export const NAMED_FG_COLORS = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'brightBlack',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite'
] as const;

/** The 16 selectable background names (bg<Name>), in picker order. */
export const NAMED_BG_COLORS = NAMED_FG_COLORS.map(
  c => `bg${c.charAt(0).toUpperCase()}${c.slice(1)}`
);

/** hex for a `bg<Name>` token, e.g. 'bgBrightBlue' → #729fcf. */
function bgNameToHex(name: string): string | undefined {
  const base = name.slice(2); // strip 'bg'
  const key = base.charAt(0).toLowerCase() + base.slice(1);
  return ANSI_HEX[key];
}

// ── xterm 256 → hex ────────────────────────────────────────────────────────
const CUBE = [0, 95, 135, 175, 215, 255];

export function ansi256ToHex(n: number): string {
  if (n < 16) {
    // Standard + bright block maps onto the 16 named colors.
    return ANSI_HEX[NAMED_FG_COLORS[n]!] ?? '#000000';
  }
  if (n >= 232) {
    const v = 8 + (n - 232) * 10;
    return rgbHex(v, v, v);
  }
  const c = n - 16;
  return rgbHex(
    CUBE[Math.floor(c / 36) % 6]!,
    CUBE[Math.floor(c / 6) % 6]!,
    CUBE[c % 6]!
  );
}

function rgbHex(r: number, g: number, b: number): string {
  const h = (x: number) => x.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

// ── Color-depth downgrade (mirrors what the terminal actually shows) ─────────
// ccstatusline emits colors at the terminal's support level (Chalk level 0-3).
// A truecolor value on a 16-color terminal is down-sampled to the nearest ANSI
// color; on a monochrome terminal it drops entirely. We reproduce that so the
// preview is honest about what a lower `colorLevel` will look like.

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0
  ];
}

function dist2(
  a: [number, number, number],
  b: [number, number, number]
): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

/** Nearest of the 16 named ANSI colors to a hex, returned as its name. */
export function nearestNamed16(hex: string): string {
  const rgb = hexToRgb(hex);
  let best = NAMED_FG_COLORS[0] as string;
  let bestD = Infinity;
  for (const name of NAMED_FG_COLORS) {
    const d = dist2(rgb, hexToRgb(ANSI_HEX[name]!));
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}

/** Nearest xterm-256 index (searching the 6×6×6 cube + grayscale ramp, 16-255). */
export function nearest256Index(hex: string): number {
  const rgb = hexToRgb(hex);
  let best = 16;
  let bestD = Infinity;
  for (let n = 16; n < 256; n++) {
    const d = dist2(rgb, hexToRgb(ansi256ToHex(n)));
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

/**
 * Down-sample a hex color to what a terminal of the given color level renders:
 *   3 = truecolor (unchanged) · 2 = nearest xterm-256 · 1 = nearest ANSI-16
 *   0 = no color (monochrome) → returns undefined.
 */
export function downgradeHex(hex: string, level: number): string | undefined {
  if (level <= 0) return undefined;
  if (level === 1) return ANSI_HEX[nearestNamed16(hex)];
  if (level === 2) return ansi256ToHex(nearest256Index(hex));
  return hex;
}

// ── Gradient presets (ccstatusline utils/gradient.ts, sourced from gradient-string) ──
export const GRADIENT_PRESETS: Record<string, string[]> = {
  atlas: ['#feac5e', '#c779d0', '#4bc0c8'],
  cristal: ['#bdfff3', '#4ac29a'],
  teen: ['#77a1d3', '#79cbca', '#e684ae'],
  mind: ['#473b7b', '#3584a7', '#30d2be'],
  morning: ['#ff5f6d', '#ffc371'],
  vice: ['#5ee7df', '#b490ca'],
  passion: ['#f43b47', '#453a94'],
  fruit: ['#ff4e50', '#f9d423'],
  instagram: ['#833ab4', '#fd1d1d', '#fcb045'],
  retro: [
    '#3f51b1',
    '#5a55ae',
    '#7b5fac',
    '#8f6aae',
    '#a86aa4',
    '#cc6b8e',
    '#f18271',
    '#f3a469',
    '#f7c978'
  ],
  summer: ['#fdbb2d', '#22c1c3'],
  rainbow: [
    '#ff0000',
    '#ffff00',
    '#00ff00',
    '#00ffff',
    '#0000ff',
    '#ff00ff',
    '#ff0000'
  ],
  pastel: [
    '#aee9d8',
    '#cdeeb0',
    '#f6f0a8',
    '#f7c8a8',
    '#f3aecb',
    '#c3b6f0',
    '#aee9d8'
  ]
};

export const GRADIENT_PRESET_NAMES = Object.keys(GRADIENT_PRESETS);

function stopToHex(stop: string): string | null {
  let s = stop.trim();
  if (s.startsWith('hex:')) s = s.slice(4);
  if (s.startsWith('#')) s = s.slice(1);
  return /^[0-9a-fA-F]{6}$/.test(s) ? `#${s}` : null;
}

/** Parse a `gradient:<spec>` value into an ordered list of hex stops, or null. */
export function parseGradientStops(value: string): string[] | null {
  if (!value.startsWith('gradient:')) return null;
  const body = value.slice('gradient:'.length).trim();
  if (!body) return null;
  const preset = GRADIENT_PRESETS[body.toLowerCase()];
  const raw = preset ?? body.split(body.includes(',') ? ',' : '-');
  const stops = raw.map(stopToHex).filter((h): h is string => h !== null);
  return stops.length >= 2 ? stops : null;
}

// ── Public resolution API ──────────────────────────────────────────────────

export interface ResolvedStyle {
  color?: string;
  background?: string;
  /** Set when the foreground is a gradient (rendered via background-clip:text). */
  gradient?: string[];
}

/** Resolve a stored foreground color string to a CSS color (gradients handled separately). */
export function resolveFgCss(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('gradient:')) return undefined;
  if (value.startsWith('hex:')) return `#${value.slice(4)}`;
  if (value.startsWith('ansi256:'))
    return ansi256ToHex(parseInt(value.slice(8), 10) || 0);
  return ANSI_HEX[value];
}

/** Resolve a stored background color string to a CSS color. */
export function resolveBgCss(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('hex:')) return `#${value.slice(4)}`;
  if (value.startsWith('ansi256:'))
    return ansi256ToHex(parseInt(value.slice(8), 10) || 0);
  if (value.startsWith('bg')) return bgNameToHex(value);
  return ANSI_HEX[value];
}

/** A swatch color for any picker entry (named/256/hex), for both fg and bg lists. */
export function swatchCss(value: string): string | undefined {
  return resolveBgCss(value) ?? resolveFgCss(value);
}

// ── Legacy tailwind class path (kept for named-fg defaults, faithful tuning) ──
export const ANSI_TEXT_CLASS: Record<string, string> = {
  black: 'text-zinc-600',
  red: 'text-red-400',
  green: 'text-emerald-400',
  yellow: 'text-amber-300',
  blue: 'text-blue-400',
  magenta: 'text-fuchsia-400',
  cyan: 'text-cyan-300',
  white: 'text-zinc-100',
  gray: 'text-zinc-400',
  grey: 'text-zinc-400',
  brightBlack: 'text-zinc-500',
  brightRed: 'text-red-300',
  brightGreen: 'text-emerald-300',
  brightYellow: 'text-amber-200',
  brightBlue: 'text-sky-300',
  brightMagenta: 'text-fuchsia-300',
  brightCyan: 'text-cyan-200',
  brightWhite: 'text-white'
};

export function colorClass(name?: string): string {
  if (!name) return 'text-zinc-200';
  return ANSI_TEXT_CLASS[name] ?? 'text-zinc-200';
}
