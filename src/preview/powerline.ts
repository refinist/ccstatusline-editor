// Powerline-mode preview rendering — a faithful port of ccstatusline's
// renderPowerlineStatusLine (utils/renderer.ts, v2.2.24) to the web preview.
//
// In powerline mode ccstatusline abandons the normal separator pipeline:
//   - manual `separator` widgets are filtered out (they still break `merge`)
//   - every rendered widget becomes a colored SEGMENT (fg + bg), padded with
//     defaultPadding on both sides INSIDE the background
//   - between adjacent non-merged segments an arrow glyph is painted whose
//     foreground is the previous segment's background and whose background is
//     the next segment's background (invertible per separator slot)
//   - `flex-separator` splits the line into powerline SEGMenT GROUPS: the gap
//     stretches, and each group can carry its own start/end cap glyph
//   - a theme (10 built-in palettes, one variant per color level) can replace
//     every widget's fg/bg, cycling per non-merged widget
//   - three indices advance ACROSS lines: the separator-glyph cycle, the
//     start/end-cap cycle, and (opt-in) the theme color cycle
//
// The glyphs themselves (U+E0B0… private-use chars) need a patched font the
// visitor likely doesn't have, so the preview draws them as SVG shapes — see
// PowerlineGlyph.vue. This module only resolves geometry-free data: per line,
// an ordered list of segments / glyph slots / flex gaps with final CSS colors.

import {
  WIDGET_BY_TYPE,
  type DefaultPaddingSide,
  type Widget
} from '@/widgets';
import {
  colorClass,
  downgradeHex,
  nearestNamed16,
  parseGradientStops,
  resolveBgCss,
  resolveFgCss
} from './colors';
import { previewText } from './previewText';
import {
  splitBars,
  splitParens,
  type RenderGlobals,
  type Token
} from './renderers';

// ── Built-in themes (ccstatusline utils/colors.ts POWERLINE_THEMES) ─────────
// Keyed by color level: 1 = basic 16 (named), 2 = 256 (ansi256:N), 3 = truecolor.
export interface PowerlineThemeColors {
  fg: string[];
  bg: string[];
}
export type PowerlineTheme = Record<'1' | '2' | '3', PowerlineThemeColors>;

export const POWERLINE_THEMES: Record<string, PowerlineTheme> = {
  nord: {
    1: {
      fg: ['black', 'brightWhite', 'brightWhite', 'black', 'black'],
      bg: [
        'bgBrightCyan',
        'bgBrightBlack',
        'bgBlue',
        'bgBrightYellow',
        'bgBrightGreen'
      ]
    },
    2: {
      fg: [
        'ansi256:16',
        'ansi256:254',
        'ansi256:231',
        'ansi256:231',
        'ansi256:16'
      ],
      bg: [
        'ansi256:73',
        'ansi256:239',
        'ansi256:25',
        'ansi256:96',
        'ansi256:152'
      ]
    },
    3: {
      fg: [
        'hex:2E3440',
        'hex:D8DEE9',
        'hex:FDF6E3',
        'hex:2E3440',
        'hex:2E3440'
      ],
      bg: ['hex:88C0D0', 'hex:4C566A', 'hex:5E81AC', 'hex:B48EAD', 'hex:A3BE8C']
    }
  },
  'nord-aurora': {
    1: {
      fg: ['brightWhite', 'black', 'black', 'black', 'black'],
      bg: [
        'bgRed',
        'bgBrightYellow',
        'bgBrightBlue',
        'bgGreen',
        'bgBrightMagenta'
      ]
    },
    2: {
      fg: [
        'ansi256:231',
        'ansi256:16',
        'ansi256:231',
        'ansi256:16',
        'ansi256:16'
      ],
      bg: [
        'ansi256:131',
        'ansi256:220',
        'ansi256:68',
        'ansi256:108',
        'ansi256:176'
      ]
    },
    3: {
      fg: [
        'hex:ECEFF4',
        'hex:2E3440',
        'hex:FDF6E3',
        'hex:2E3440',
        'hex:2E3440'
      ],
      bg: ['hex:BF616A', 'hex:EBCB8B', 'hex:5E81AC', 'hex:A3BE8C', 'hex:B48EAD']
    }
  },
  monokai: {
    1: {
      fg: ['black', 'brightWhite', 'black', 'white', 'black'],
      bg: [
        'bgBrightGreen',
        'bgBrightBlack',
        'bgBrightYellow',
        'bgMagenta',
        'bgBrightCyan'
      ]
    },
    2: {
      fg: [
        'ansi256:235',
        'ansi256:255',
        'ansi256:235',
        'ansi256:16',
        'ansi256:235'
      ],
      bg: [
        'ansi256:148',
        'ansi256:238',
        'ansi256:186',
        'ansi256:141',
        'ansi256:81'
      ]
    },
    3: {
      fg: [
        'hex:272822',
        'hex:F8F8F2',
        'hex:272822',
        'hex:272822',
        'hex:272822'
      ],
      bg: ['hex:A6E22E', 'hex:49483E', 'hex:E6DB74', 'hex:AE81FF', 'hex:66D9EF']
    }
  },
  solarized: {
    1: {
      fg: ['brightWhite', 'black', 'brightWhite', 'black', 'black'],
      bg: [
        'bgBlue',
        'bgBrightYellow',
        'bgBrightBlack',
        'bgCyan',
        'bgBrightWhite'
      ]
    },
    2: {
      fg: [
        'ansi256:231',
        'ansi256:234',
        'ansi256:254',
        'ansi256:16',
        'ansi256:234'
      ],
      bg: [
        'ansi256:33',
        'ansi256:136',
        'ansi256:240',
        'ansi256:37',
        'ansi256:254'
      ]
    },
    3: {
      fg: [
        'hex:073642',
        'hex:073642',
        'hex:FDF6E3',
        'hex:073642',
        'hex:073642'
      ],
      bg: ['hex:268BD2', 'hex:B58900', 'hex:586E75', 'hex:2AA198', 'hex:EEE8D5']
    }
  },
  minimal: {
    1: {
      fg: ['brightWhite', 'black', 'white', 'black', 'black'],
      bg: [
        'bgBrightBlack',
        'bgBrightWhite',
        'bgBlack',
        'bgWhite',
        'bgBrightWhite'
      ]
    },
    2: {
      fg: [
        'ansi256:255',
        'ansi256:232',
        'ansi256:255',
        'ansi256:232',
        'ansi256:252'
      ],
      bg: [
        'ansi256:240',
        'ansi256:251',
        'ansi256:233',
        'ansi256:248',
        'ansi256:236'
      ]
    },
    3: {
      fg: [
        'hex:FFFFFF',
        'hex:1C1C1C',
        'hex:FFFFFF',
        'hex:1C1C1C',
        'hex:E4E4E4'
      ],
      bg: ['hex:585858', 'hex:D0D0D0', 'hex:1A1A1A', 'hex:A8A8A8', 'hex:303030']
    }
  },
  dracula: {
    1: {
      fg: ['brightWhite', 'black', 'brightWhite', 'black', 'white'],
      bg: [
        'bgMagenta',
        'bgBrightWhite',
        'bgRed',
        'bgBrightCyan',
        'bgBrightBlack'
      ]
    },
    2: {
      fg: [
        'ansi256:235',
        'ansi256:235',
        'ansi256:235',
        'ansi256:235',
        'ansi256:231'
      ],
      bg: [
        'ansi256:141',
        'ansi256:253',
        'ansi256:204',
        'ansi256:117',
        'ansi256:236'
      ]
    },
    3: {
      fg: [
        'hex:282A36',
        'hex:282A36',
        'hex:282A36',
        'hex:282A36',
        'hex:F8F8F2'
      ],
      bg: ['hex:BD93F9', 'hex:F8F8F2', 'hex:FF5555', 'hex:8BE9FD', 'hex:44475A']
    }
  },
  catppuccin: {
    1: {
      fg: ['black', 'brightWhite', 'black', 'brightWhite', 'black'],
      bg: [
        'bgBrightMagenta',
        'bgBrightBlack',
        'bgBrightGreen',
        'bgBlue',
        'bgBrightYellow'
      ]
    },
    2: {
      fg: [
        'ansi256:235',
        'ansi256:255',
        'ansi256:235',
        'ansi256:235',
        'ansi256:235'
      ],
      bg: [
        'ansi256:176',
        'ansi256:238',
        'ansi256:150',
        'ansi256:210',
        'ansi256:111'
      ]
    },
    3: {
      fg: [
        'hex:1E1E2E',
        'hex:CDD6F4',
        'hex:1E1E2E',
        'hex:1E1E2E',
        'hex:CDD6F4'
      ],
      bg: ['hex:CBA6F7', 'hex:45475A', 'hex:A6E3A1', 'hex:F38BA8', 'hex:585B70']
    }
  },
  gruvbox: {
    1: {
      fg: ['brightWhite', 'black', 'black', 'brightWhite', 'black'],
      bg: [
        'bgRed',
        'bgBrightYellow',
        'bgBrightWhite',
        'bgBlue',
        'bgBrightGreen'
      ]
    },
    2: {
      fg: [
        'ansi256:16',
        'ansi256:235',
        'ansi256:235',
        'ansi256:16',
        'ansi256:235'
      ],
      bg: [
        'ansi256:167',
        'ansi256:214',
        'ansi256:246',
        'ansi256:109',
        'ansi256:142'
      ]
    },
    3: {
      fg: [
        'hex:EBDBB2',
        'hex:282828',
        'hex:282828',
        'hex:FDF6E3',
        'hex:282828'
      ],
      bg: ['hex:CC241D', 'hex:FABD2F', 'hex:A89984', 'hex:458588', 'hex:98971A']
    }
  },
  onedark: {
    1: {
      fg: ['black', 'brightWhite', 'black', 'brightWhite', 'black'],
      bg: [
        'bgBrightBlue',
        'bgBrightBlack',
        'bgBrightGreen',
        'bgRed',
        'bgBrightYellow'
      ]
    },
    2: {
      fg: [
        'ansi256:235',
        'ansi256:251',
        'ansi256:235',
        'ansi256:16',
        'ansi256:235'
      ],
      bg: [
        'ansi256:75',
        'ansi256:237',
        'ansi256:114',
        'ansi256:204',
        'ansi256:180'
      ]
    },
    3: {
      fg: [
        'hex:282C34',
        'hex:ABB2BF',
        'hex:282C34',
        'hex:282C34',
        'hex:282C34'
      ],
      bg: ['hex:61AFEF', 'hex:3E4452', 'hex:98C379', 'hex:E06C75', 'hex:E5C07B']
    }
  },
  tokyonight: {
    1: {
      fg: ['brightWhite', 'black', 'brightWhite', 'black', 'black'],
      bg: [
        'bgBlue',
        'bgBrightWhite',
        'bgMagenta',
        'bgBrightYellow',
        'bgBrightCyan'
      ]
    },
    2: {
      fg: [
        'ansi256:16',
        'ansi256:234',
        'ansi256:16',
        'ansi256:234',
        'ansi256:234'
      ],
      bg: [
        'ansi256:111',
        'ansi256:248',
        'ansi256:176',
        'ansi256:221',
        'ansi256:80'
      ]
    },
    3: {
      fg: [
        'hex:1A1B26',
        'hex:1A1B26',
        'hex:1A1B26',
        'hex:1A1B26',
        'hex:1A1B26'
      ],
      bg: ['hex:7AA2F7', 'hex:D5D6DB', 'hex:BB9AF7', 'hex:E0AF68', 'hex:7DCFFF']
    }
  }
};

/** Picker order for the theme <Select> ('custom' = use each widget's own colors). */
export const POWERLINE_THEME_NAMES = [
  'custom',
  ...Object.keys(POWERLINE_THEMES)
];

// Display names matching ccstatusline's TUI theme picker (each theme's `name`
// field in its utils/colors.ts POWERLINE_THEMES table). nord-aurora carries the
// TUI's "(original)" tag — it is ccstatusline's default powerline theme
// (getDefaultPowerlineTheme()), shown exactly as users see it there.
const THEME_DISPLAY_NAMES: Record<string, string> = {
  custom: 'Custom',
  nord: 'Nord',
  'nord-aurora': 'Nord Aurora (original)',
  monokai: 'Monokai',
  solarized: 'Solarized',
  minimal: 'Minimal',
  dracula: 'Dracula',
  catppuccin: 'Catppuccin',
  gruvbox: 'Gruvbox',
  onedark: 'One Dark',
  tokyonight: 'Tokyo Night'
};

/** value/label pairs for the theme <Select>, in the TUI's order. */
export const POWERLINE_THEME_OPTIONS = POWERLINE_THEME_NAMES.map(v => ({
  value: v,
  label: THEME_DISPLAY_NAMES[v] ?? v
}));

// ccstatusline's getColorLevelString: 0 and 1 both read the 16-color variant,
// 2 the 256-color one, 3 truecolor (level 0 then strips all color on output).
function themeKey(level: number): '1' | '2' | '3' {
  if (level >= 3) return '3';
  if (level === 2) return '2';
  return '1';
}

// ── Output model ─────────────────────────────────────────────────────────────
export type PowerlineItem =
  /** One widget segment: styled text tokens over an optional background block. */
  | { kind: 'widget'; key: string; tokens: Token[]; bg?: string }
  /** A separator arrow or start/end cap. fill = the shape, base = behind it. */
  | { kind: 'glyph'; key: string; glyph: string; fill?: string; base?: string }
  /** A flex gap (grows to fill the line). */
  | { kind: 'flex'; key: string };

export interface PowerlineConfigLike {
  separators: string[];
  separatorInvertBackground: boolean[];
  startCaps: string[];
  endCaps: string[];
  theme?: string;
  autoAlign: boolean;
  continueThemeAcrossLines: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Terminal-cell width of a string (string-width approximation): wide CJK /
// emoji count 2, ZWJ + variation selectors count 0. Only used by autoAlign,
// where matching ccstatusline's space counts matters more than pixel truth.
export function visibleWidth(text: string): number {
  let w = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp === 0x200d || (cp >= 0xfe00 && cp <= 0xfe0f)) continue;
    const wide =
      (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe30 && cp <= 0xfe4f) ||
      (cp >= 0xff00 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6) ||
      (cp >= 0x1f300 && cp <= 0x1faff) ||
      (cp >= 0x20000 && cp <= 0x3fffd);
    w += wide ? 2 : 1;
  }
  return w;
}

/** Resolve a stored bg value (bgName / hex / ansi256) to a level-downgraded CSS color. */
function cssBg(value: string | undefined, level: number): string | undefined {
  if (!value) return undefined;
  const hex = resolveBgCss(value);
  return hex ? downgradeHex(hex, level) : undefined;
}

/** Resolve a stored fg value to a level-downgraded CSS color (gradients → undefined). */
function cssFg(value: string | undefined, level: number): string | undefined {
  if (!value) return undefined;
  const hex = resolveFgCss(value);
  return hex ? downgradeHex(hex, level) : undefined;
}

// Foreground for segment text. Unlike the normal preview (which tunes named
// ANSI colors to look good on the app's own dark background), text sitting on
// a powerline segment's real background must use the faithful terminal hex —
// 'black' on bgBrightCyan has to actually be black.
function segmentFg(
  value: string | undefined,
  fallbackName: string,
  level: number,
  onBg: boolean
): { cls?: string; style: Record<string, string> } {
  const v = value ?? fallbackName;
  const style: Record<string, string> = {};
  if (level <= 0) return { style };

  const stops = v.startsWith('gradient:') ? parseGradientStops(v) : null;
  if (stops) {
    if (level >= 2) {
      style.backgroundImage = `linear-gradient(90deg, ${stops.join(', ')})`;
      style.backgroundClip = 'text';
      style.WebkitBackgroundClip = 'text';
      style.color = 'transparent';
      return { style };
    }
    const name = nearestNamed16(stops[0]!);
    if (onBg) {
      const hex = resolveFgCss(name);
      if (hex) style.color = hex;
      return { style };
    }
    return { cls: colorClass(name), style };
  }

  const inline = resolveFgCss(v);
  if (!inline) return { style };
  const shown = downgradeHex(inline, level);
  if (!shown) return { style };
  if (onBg) {
    style.color = shown;
    return { style };
  }
  // No segment background → same rendering rules as the normal preview.
  const isNamed = !v.startsWith('hex:') && !v.startsWith('ansi256:');
  if (isNamed) return { cls: colorClass(v), style };
  if (level === 1) return { cls: colorClass(nearestNamed16(inline)), style };
  style.color = shown;
  return { style };
}

// The widget's preview text (same fallback chain as renderWidget).
function widgetText(w: Widget, g?: RenderGlobals): string {
  const meta = WIDGET_BY_TYPE.get(w.type);
  const src = g?.minimalist ? { ...w, rawValue: true } : w;
  let text = previewText(src) ?? meta?.preview ?? '';
  if (!text) text = w.type;
  return text;
}

// Styled tokens for one segment: fg / bold / dim(+parens) / bar-glyph splitting,
// with the (already padded / aligned) text. Background is painted by the caller.
function segmentTokens(
  text: string,
  w: Widget,
  fgValue: string | undefined,
  onBg: boolean,
  g?: RenderGlobals
): Token[] {
  const level = g?.colorLevel ?? 3;
  const meta = WIDGET_BY_TYPE.get(w.type);
  const { cls, style } = segmentFg(
    fgValue,
    meta?.color ?? 'white',
    level,
    onBg
  );
  if (w.bold || g?.globalBold) style.fontWeight = '700';
  if (w.dim === true) {
    style.opacity = '0.55';
  } else if (w.dim === 'parens') {
    const dimStyle = { ...style, opacity: '0.55' };
    return splitParens(text).flatMap(seg =>
      splitBars(seg.text, cls, seg.inParen ? dimStyle : style)
    );
  }
  return splitBars(text, cls, style);
}

// Separator arrow coloring (mirrors renderPowerlineStatusLine's four cases,
// normal + inverted). Raw config values in, final CSS colors out.
function separatorColors(
  prev: { bg?: string; fg?: string },
  next: { bg?: string; fg?: string },
  invert: boolean,
  level: number
): { fill?: string; base?: string } {
  if (prev.bg && next.bg) {
    if (prev.bg === next.bg) {
      // Same background on both sides: draw the glyph in the widget's own fg.
      return {
        fill: cssFg(invert ? next.fg : prev.fg, level),
        base: cssBg(prev.bg, level)
      };
    }
    return invert
      ? { fill: cssBg(next.bg, level), base: cssBg(prev.bg, level) }
      : { fill: cssBg(prev.bg, level), base: cssBg(next.bg, level) };
  }
  // Only one side colored: glyph takes that side's bg as fg, no background.
  if (prev.bg) return { fill: cssBg(prev.bg, level) };
  if (next.bg) return { fill: cssBg(next.bg, level) };
  return {};
}

// ── Per-line intermediate element ────────────────────────────────────────────
interface El {
  w: Widget;
  /** Effective solid fg (widget/theme/override) — also used by same-bg separators. */
  fg?: string;
  /** Fg actually painted on the text (gradient override replaces `fg` here). */
  textFg?: string;
  /** Effective bg (widget or theme), raw config value. */
  bg?: string;
  text: string;
  lead: string;
  trail: string;
  /** autoAlign spaces appended after `trail`. */
  alignPad: number;
  mergesWithNext: boolean;
  flexAfter: number;
  segOffset: number;
  /** Segment offset when a start cap belongs right before this element. */
  capBefore?: number;
}

/**
 * Render every (non-empty) line of a powerline-mode config into display items.
 * Lines must be passed together: the separator-glyph, start/end-cap and
 * (with continueThemeAcrossLines) theme-color cycles all advance across lines,
 * exactly like ccstatusline's global*Index bookkeeping in ccstatusline.ts.
 */
export function renderPowerlineLines(
  lines: Widget[][],
  pl: PowerlineConfigLike,
  defaultPadding: string,
  g?: RenderGlobals,
  defaultPaddingSide: DefaultPaddingSide = 'both'
): PowerlineItem[][] {
  const level = g?.colorLevel ?? 3;
  const separators = pl.separators ?? [];
  const invertBgs = pl.separatorInvertBackground ?? [];
  const startCaps = (pl.startCaps ?? []).filter(c => typeof c === 'string');
  const endCaps = (pl.endCaps ?? []).filter(c => typeof c === 'string');
  const themeColors =
    pl.theme && pl.theme !== 'custom'
      ? POWERLINE_THEMES[pl.theme]?.[themeKey(level)]
      : undefined;

  const overrideFg =
    g?.overrideFg && g.overrideFg !== 'none' ? g.overrideFg : undefined;
  const overrideSolid =
    overrideFg && !overrideFg.startsWith('gradient:') ? overrideFg : undefined;
  // A gradient override paints the text but leaves segment/separator solid
  // colors alone; at 16-color it is a no-op and the widget/theme fg is kept.
  const overrideGradient =
    overrideFg?.startsWith('gradient:') && level >= 2 ? overrideFg : undefined;

  const isStruct = (t: string) => t === 'separator' || t === 'flex-separator';
  const leadingPadding = defaultPaddingSide === 'right' ? '' : defaultPadding;
  const trailingPadding = defaultPaddingSide === 'left' ? '' : defaultPadding;

  // ── pass 1: per line, build elements + flex/segment bookkeeping ───────────
  const perLine: { els: El[]; leadingFlex: number }[] = lines.map(line => {
    const els: El[] = [];
    let leadingFlex = 0;
    let lastEl: El | null = null;
    let pendingFlex = 0;
    let segOffset = 0;
    let hasSegment = false;
    // Whether the previous non-separator neighbour merges into this widget
    // (a manual `separator` widget is invisible in powerline mode but still
    // breaks merge chains, exactly like the real renderer).
    let prevInGroup: El | null = null;

    for (let i = 0; i < line.length; i++) {
      const w = line[i]!;
      if (w.type === 'separator') {
        prevInGroup = null;
        continue;
      }
      if (w.type === 'flex-separator') {
        prevInGroup = null;
        if (!lastEl) leadingFlex++;
        else {
          pendingFlex++;
          lastEl.flexAfter++;
        }
        continue;
      }

      // merge only holds until the next separator/flex boundary.
      let mergesWithNext = false;
      if (w.merge) {
        for (let j = i + 1; j < line.length; j++) {
          const nx = line[j]!;
          if (isStruct(nx.type)) break;
          mergesWithNext = true;
          break;
        }
      }

      const omitLead =
        prevInGroup?.w.merge === 'no-padding' && prevInGroup.mergesWithNext;
      const omitTrail = w.merge === 'no-padding' && mergesWithNext;
      const el: El = {
        w,
        text: widgetText(w, g),
        lead: omitLead ? '' : leadingPadding,
        trail: omitTrail ? '' : trailingPadding,
        alignPad: 0,
        mergesWithNext,
        flexAfter: 0,
        segOffset: 0
      };
      if (!hasSegment) {
        el.capBefore = segOffset;
        pendingFlex = 0;
        hasSegment = true;
      } else if (pendingFlex > 0) {
        segOffset++;
        el.capBefore = segOffset;
        pendingFlex = 0;
      }
      el.segOffset = segOffset;
      els.push(el);
      lastEl = el;
      prevInGroup = el;
    }
    return { els, leadingFlex };
  });

  // ── pass 2: theme / override colors (theme index can span lines) ──────────
  let globalThemeIdx = 0;
  for (const { els } of perLine) {
    let idx = pl.continueThemeAcrossLines ? globalThemeIdx : 0;
    for (const el of els) {
      const meta = WIDGET_BY_TYPE.get(el.w.type);
      let fg: string | undefined = el.w.color ?? meta?.color;
      let bg: string | undefined = el.w.backgroundColor;
      if (themeColors) {
        // Merged widgets share the previous widget's theme slot.
        fg = themeColors.fg[idx % themeColors.fg.length] ?? fg;
        bg = themeColors.bg[idx % themeColors.bg.length] ?? bg;
        if (!el.mergesWithNext) idx++;
      }
      if (overrideSolid) fg = overrideSolid;
      el.fg = fg;
      el.textFg = overrideGradient ?? fg;
      el.bg = bg;
    }
    if (els.length > 0) globalThemeIdx = idx;
  }

  // ── pass 3: autoAlign column widths across all lines ──────────────────────
  if (pl.autoAlign) {
    const paddingPairLength = leadingPadding.length + trailingPadding.length;
    const maxWidths: number[] = [];
    for (const { els } of perLine) {
      let pos = 0;
      for (let i = 0; i < els.length; i++) {
        // An excluded group head opts itself and the rest of the line out of
        // the shared column widths (ccstatusline breaks in
        // calculateMaxWidthsFromPreRendered).
        if (els[i]!.w.excludeFromAutoAlign) break;
        // Combined width of the whole merge group (ccstatusline counts
        // padding per member, except across a no-padding merge).
        let total = visibleWidth(els[i]!.text) + paddingPairLength;
        let j = i;
        while (j < els.length - 1 && els[j]!.mergesWithNext) {
          j++;
          total +=
            els[j - 1]!.w.merge === 'no-padding'
              ? visibleWidth(els[j]!.text)
              : visibleWidth(els[j]!.text) + paddingPairLength;
        }
        maxWidths[pos] = Math.max(maxWidths[pos] ?? 0, total);
        i = j;
        pos++;
      }
    }
    for (const { els } of perLine) {
      let pos = 0;
      for (let i = 0; i < els.length; i++) {
        // Mirror the skip above: no alignment padding for the excluded group
        // or anything after it on this line.
        if (els[i]!.w.excludeFromAutoAlign) break;
        let combined = visibleWidth(
          els[i]!.lead + els[i]!.text + els[i]!.trail
        );
        let j = i;
        while (j < els.length - 1 && els[j]!.mergesWithNext) {
          j++;
          combined += visibleWidth(els[j]!.lead + els[j]!.text + els[j]!.trail);
        }
        const max = maxWidths[pos];
        if (max !== undefined && max > combined)
          els[j]!.alignPad = max - combined;
        i = j;
        pos++;
      }
    }
  }

  // ── pass 4: emit display items, advancing the cross-line glyph cycles ─────
  let globalSepIdx = 0;
  let globalCapIdx = 0;
  const out: PowerlineItem[][] = [];

  for (const { els, leadingFlex } of perLine) {
    const items: PowerlineItem[] = [];
    if (els.length === 0) {
      out.push(items);
      continue;
    }

    const startCapFor = (offset: number) =>
      startCaps.length
        ? (startCaps[(globalCapIdx + offset) % startCaps.length] ?? '')
        : '';
    const endCapFor = (offset: number) =>
      endCaps.length
        ? (endCaps[(globalCapIdx + offset) % endCaps.length] ?? '')
        : '';

    for (let k = 0; k < leadingFlex; k++)
      items.push({ kind: 'flex', key: `lf-${k}` });

    let localSep = 0;
    for (let i = 0; i < els.length; i++) {
      const el = els[i]!;
      const next = els[i + 1];

      if (el.capBefore !== undefined) {
        const glyph = startCapFor(el.capBefore);
        if (glyph)
          items.push({
            kind: 'glyph',
            key: `${el.w.id}-startcap`,
            glyph,
            fill: cssBg(el.bg, level)
          });
      }

      items.push({
        kind: 'widget',
        key: el.w.id,
        tokens: [
          ...(el.lead ? [{ text: el.lead }] : []),
          ...segmentTokens(el.text, el.w, el.textFg, !!el.bg && level > 0, g),
          ...(el.trail || el.alignPad
            ? [{ text: el.trail + ' '.repeat(el.alignPad) }]
            : [])
        ],
        bg: cssBg(el.bg, level)
      });

      if (el.flexAfter > 0) {
        const glyph = endCapFor(el.segOffset);
        if (glyph)
          items.push({
            kind: 'glyph',
            key: `${el.w.id}-endcap`,
            glyph,
            fill: cssBg(el.bg, level)
          });
        for (let k = 0; k < el.flexAfter; k++)
          items.push({ kind: 'flex', key: `${el.w.id}-flex-${k}` });
        continue;
      }

      if (next && separators.length > 0 && !el.mergesWithNext) {
        const gi = (globalSepIdx + localSep) % separators.length;
        const glyph = separators[gi] ?? '';
        localSep++;
        if (glyph) {
          const { fill, base } = separatorColors(
            { bg: el.bg, fg: el.fg },
            { bg: next.bg, fg: next.fg },
            invertBgs[gi] ?? false,
            level
          );
          items.push({
            kind: 'glyph',
            key: `${el.w.id}-sep`,
            glyph,
            fill,
            base
          });
        }
      }

      if (i === els.length - 1) {
        const glyph = endCapFor(el.segOffset);
        if (glyph)
          items.push({
            kind: 'glyph',
            key: `${el.w.id}-endcap`,
            glyph,
            fill: cssBg(el.bg, level)
          });
      }
    }

    globalSepIdx += localSep;
    globalCapIdx += (els[els.length - 1]?.segOffset ?? 0) + 1;
    out.push(items);
  }

  return out;
}
