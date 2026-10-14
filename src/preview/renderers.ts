import { WIDGET_BY_TYPE, type CcStatusConfig, type Widget } from '@/widgets';
import {
  colorClass,
  downgradeHex,
  nearestNamed16,
  parseGradientStops,
  resolveBgCss,
  resolveFgCss
} from './colors';
import { previewRuns, previewText } from './previewText';
import type { GlobalNumberFormat } from '@/lib/numberFormat';

export interface Token {
  text: string;
  cls?: string;
  style?: Record<string, string>;
}

/** Document-level overrides threaded into rendering (from global config). */
export interface RenderGlobals {
  globalBold?: boolean;
  overrideFg?: string;
  overrideBg?: string;
  /** Terminal color depth (0 none / 1 = 16 / 2 = 256 / 3 = truecolor). Downgrades
   *  colors in the preview to what that terminal can actually show. Omit = truecolor. */
  colorLevel?: number;
  /** minimalistMode: strip every widget's icon/label/prefix down to its raw value,
   *  as if each widget had rawValue enabled individually. */
  minimalist?: boolean;
  /** Global numeric precision. A set kind wins over the widget's own numberFormat. */
  numberFormat?: GlobalNumberFormat;
}

export function renderGlobals(
  config: Pick<
    CcStatusConfig,
    | 'globalBold'
    | 'overrideForegroundColor'
    | 'overrideBackgroundColor'
    | 'colorLevel'
    | 'minimalistMode'
    | 'numberFormat'
  >
): RenderGlobals {
  return {
    globalBold: config.globalBold || undefined,
    overrideFg: config.overrideForegroundColor,
    overrideBg: config.overrideBackgroundColor,
    colorLevel: config.colorLevel,
    minimalist: config.minimalistMode || undefined,
    numberFormat: config.numberFormat
  };
}

// Split text into runs, marking the parts inside (...) so dim:'parens' can dim only those.
// (Exported for the powerline renderer, which styles the same way per segment.)
export function splitParens(
  text: string
): { text: string; inParen: boolean }[] {
  const out: { text: string; inParen: boolean }[] = [];
  const re = /\([^)]*\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last)
      out.push({ text: text.slice(last, m.index), inParen: false });
    out.push({ text: m[0], inParen: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), inParen: false });
  return out.length ? out : [{ text, inParen: false }];
}

// Resolve a widget's effective foreground into a class (named colors) or inline style
// (ansi256 / hex / gradient), matching how the terminal would paint it. `level` is
// the terminal color depth: colors are down-sampled to what that terminal can show.
function foreground(
  colorValue: string | undefined,
  fallbackName: string,
  level = 3
): { cls?: string; style: Record<string, string> } {
  const value = colorValue ?? fallbackName;
  const style: Record<string, string> = {};

  // Monochrome terminal: no color codes at all — render in the default fg.
  if (level <= 0) return { style };

  const stops = value.startsWith('gradient:')
    ? parseGradientStops(value)
    : null;
  if (stops) {
    // Truecolor/256 can paint a gradient; a 16-color terminal can't, so collapse
    // it to the nearest ANSI-16 solid (mirrors the terminal falling back).
    if (level >= 2) {
      style.backgroundImage = `linear-gradient(90deg, ${stops.join(', ')})`;
      style.backgroundClip = 'text';
      style.WebkitBackgroundClip = 'text';
      style.color = 'transparent';
      return { style };
    }
    return { cls: colorClass(nearestNamed16(stops[0]!)), style };
  }

  if (value.startsWith('hex:') || value.startsWith('ansi256:')) {
    const inline = resolveFgCss(value);
    // 16-color terminals can only show the named palette — snap to the nearest
    // and reuse its tuned class; 256/truecolor keep an (optionally quantized) hex.
    if (inline && level === 1)
      return { cls: colorClass(nearestNamed16(inline)), style };
    const shown = inline ? downgradeHex(inline, level) : undefined;
    if (shown) style.color = shown;
    return { style };
  }
  // Named color → always representable at level ≥ 1; keep the tuned tailwind class.
  return { cls: colorClass(value), style };
}

// Each widget renders its ccstatusline default value, styled per the instance's
// Block / box-drawing glyphs (progress bars, sliders, the cursor) fill the whole
// character cell, so their visual mass sits higher than baseline-aligned text and
// the bar looks like it floats up. Split those runs into their own tokens so CSS
// (.ccse-bar) can nudge them down a hair to optically center against the text.
const BAR_GLYPHS = /[█░▒▓│]+/g;
export function splitBars(
  text: string,
  cls: string | undefined,
  style: Record<string, string>
): Token[] {
  if (!BAR_GLYPHS.test(text)) return [{ text, cls, style }];
  BAR_GLYPHS.lastIndex = 0;
  const barCls = [cls, 'ccse-bar'].filter(Boolean).join(' ');
  const out: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = BAR_GLYPHS.exec(text))) {
    if (m.index > last)
      out.push({ text: text.slice(last, m.index), cls, style });
    out.push({ text: m[0], cls: barCls, style });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), cls, style });
  return out;
}

// A separator that renders as blank: it only opens up space, so it never owns the
// boundary between two widgets. A character-less separator resolves to '|' here, the
// same fallback previewText uses — ccstatusline falls back to `defaultSeparator`
// instead, but the editor keeps that setting and manual separators mutually
// exclusive, so the two can't disagree in a reachable config.
export function isSpacingSeparator(w: Widget | undefined): boolean {
  return w?.type === 'separator' && (w.character ?? '|').trim().length === 0;
}

export interface SeparatorBoundary {
  /** Widget the separator sits behind — the one it inherits colors from. */
  inheritFrom: Widget;
  /** Spacing separators right before it are swallowed by this separator. */
  replacesSpacing: boolean;
}

// Resolve which widget a manually placed `separator` at `index` sits behind, mirroring
// Spacing-only separators are transparent — the separator that follows them takes
// over the boundary and swallows the spacing — while a visible separator already
// owns that boundary, which drops this separator entirely (null). A flex separator
// does not eat the neighbor when the preview has a known width (v2.2.29): that
// space can be the only boundary once the flex gap shrinks to zero. The editor
// always lays the line out inside a measured width, so the no-width fallback
// (drop a spacing separator stranded against flex) does not apply here.
export function separatorBoundary(
  line: Widget[],
  index: number
): SeparatorBoundary | null {
  let replacesSpacing = false;
  for (let j = index - 1; j >= 0; j--) {
    const prev = line[j];
    if (!prev) continue;
    if (prev.type === 'separator') {
      if (!isSpacingSeparator(prev)) return null;
      replacesSpacing = true;
      continue;
    }
    if (prev.type === 'flex-separator') continue;
    return { inheritFrom: prev, replacesSpacing };
  }
  return null;
}

// Resolves how the *auto-inserted* default separator (a plain string, not a widget
// instance) should be styled — mirrors ccstatusline's applyColorsWithOverride call
// for it: global fg/bg/bold overrides always win; short of that, with
// inheritSeparatorColors on, it takes the fg/bg/bold/dim of the widget right before
// it; with nothing to color it, it renders as plain (muted) terminal-default text.
export function separatorToken(
  inheritFrom: Widget | undefined,
  g?: RenderGlobals
): { cls?: string; style: Record<string, string> } {
  const level = g?.colorLevel ?? 3;
  let color: string | undefined;
  let bg: string | undefined;
  let bold: boolean | undefined;
  let dim: boolean | 'parens' | undefined;
  if (inheritFrom) {
    const meta = WIDGET_BY_TYPE.get(inheritFrom.type);
    color = inheritFrom.color ?? meta?.color;
    bg = inheritFrom.backgroundColor;
    bold = inheritFrom.bold;
    dim = inheritFrom.dim;
  }
  const fg = g?.overrideFg ?? color;
  const bgv = g?.overrideBg ?? bg;
  const style: Record<string, string> = {};
  let cls: string | undefined;
  if (fg) {
    const r = foreground(fg, 'white', level);
    cls = r.cls;
    Object.assign(style, r.style);
  }
  const bgHex = resolveBgCss(bgv);
  const bgCss = bgHex ? downgradeHex(bgHex, level) : undefined;
  if (bgCss && !style.backgroundImage) {
    style.backgroundColor = bgCss;
    style.padding = '0 2px';
    style.borderRadius = '2px';
  }
  if (bold || g?.globalBold) style.fontWeight = '700';
  if (dim === true) style.opacity = '0.55';
  if (!cls && Object.keys(style).length === 0) cls = 'text-muted-foreground';
  return { cls, style };
}

// color / backgroundColor / bold / dim settings (mirrors the terminal output).
// `g` carries document-level global overrides (globalBold / override fg+bg).
export function renderWidget(
  w: Widget,
  mode: 'editor' | 'preview' = 'editor',
  g?: RenderGlobals
): Token[] {
  // flex-separator: a hint while editing; nothing in the preview (it just expands to fill).
  if (w.type === 'flex-separator') {
    return mode === 'preview'
      ? []
      : [
          { text: '←', cls: 'text-zinc-600' },
          { text: ' flex ', cls: 'text-zinc-500 italic' },
          { text: '→', cls: 'text-zinc-600' }
        ];
  }
  // A "space" separator is invisible — while editing show a visible "space" placeholder
  // (same muted style as the flex hint); the preview keeps the real space character.
  if (mode === 'editor' && isSpacingSeparator(w)) {
    return [{ text: 'space', cls: 'text-zinc-500 italic' }];
  }

  const meta = WIDGET_BY_TYPE.get(w.type);
  if (!meta) return [{ text: w.type, cls: 'text-red-400' }];

  // minimalistMode forces every widget's raw (icon/label-free) form, same as
  // flipping that widget's own rawValue toggle.
  const src = g?.minimalist ? { ...w, rawValue: true } : w;
  const level = g?.colorLevel ?? 3;

  // Reproduce ccstatusline's isPreview output for the widget's current options
  // (rawValue / display mode / format / glyph / cwd style …); fall back to the
  // static catalog preview for widgets whose output never changes with options.
  const runs =
    (g?.colorLevel ?? 3) > 0 && !g?.overrideFg ? previewRuns(src) : null;
  if (runs) {
    const style: Record<string, string> = {};
    if (w.bold || g?.globalBold) style.fontWeight = '700';
    if (w.dim === true) style.opacity = '0.55';
    const bgHex = resolveBgCss(g?.overrideBg ?? w.backgroundColor);
    const bg = bgHex ? downgradeHex(bgHex, level) : undefined;
    if (bg) {
      style.backgroundColor = bg;
      style.padding = '0 2px';
      style.borderRadius = '2px';
    }
    return runs.flatMap(run => {
      const runStyle = { ...style };
      if (run.color) {
        const shown = downgradeHex(run.color, level);
        if (shown) runStyle.color = shown;
      }
      return splitBars(run.text, undefined, runStyle);
    });
  }

  let text = previewText(src, g?.numberFormat) ?? meta.preview;
  if (!text) text = w.type;

  // Global foreground/background overrides beat the per-widget colors.
  const { cls, style } = foreground(
    g?.overrideFg ?? w.color,
    meta.color,
    level
  );

  // Shared style overlays — background is down-sampled the same way (dropped at level 0).
  const bgHex = resolveBgCss(g?.overrideBg ?? w.backgroundColor);
  const bg = bgHex ? downgradeHex(bgHex, level) : undefined;
  const hasGradient = !!style.backgroundImage;
  if (bg && !hasGradient) {
    style.backgroundColor = bg;
    style.padding = '0 2px';
    style.borderRadius = '2px';
  }
  if (w.bold || g?.globalBold) style.fontWeight = '700';

  // dim: whole-widget vs parens-only.
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
