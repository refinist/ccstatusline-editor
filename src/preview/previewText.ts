// Faithful port of each ccstatusline widget's render() isPreview branch (v2.2.32).
// Given a widget instance, returns the exact text the terminal would show in
// preview mode for the current options (rawValue, display mode, format, glyph
// override, label, precision, cwd style, etc.). Returns null for widgets whose
// preview never changes with options — the caller falls back to the catalog.

import {
  formatBytes,
  formatCost,
  formatPercent,
  formatSpeed,
  formatTokens,
  formatUsageCurrency,
  resolveNumberFormat,
  type GlobalNumberFormat,
  type NumberFormat
} from '@/lib/numberFormat';
import { isHidden } from '@/widgets/hideStates';
import type { Widget } from '@/widgets';

export interface PreviewRun {
  text: string;
  /** Intrinsic foreground (`#rrggbb`) the theme must not paint over. */
  color?: string;
}

// ── primitives (mirror shared/usage-display + utils/usage-windows) ──────────
const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** █ filled / ░ empty / │ cursor — timer & usage progress bars. */
function timerBar(
  percent: number,
  width: number,
  cursorPercent?: number
): string {
  const filled = Math.round((clamp(percent) / 100) * width);
  const cursorPos =
    cursorPercent !== undefined
      ? Math.min(Math.floor((clamp(cursorPercent) / 100) * width), width - 1)
      : -1;
  let bar = '';
  for (let i = 0; i < width; i++)
    bar += i === cursorPos ? '│' : i < filled ? '█' : '░';
  return bar;
}
/** ▓ filled / ░ empty / │ cursor — slider bars (default width 10). */
function sliderBar(
  percent: number,
  width = 10,
  cursorPercent?: number
): string {
  const filled = Math.round((clamp(percent) / 100) * width);
  const cursorPos =
    cursorPercent !== undefined
      ? Math.min(Math.floor((clamp(cursorPercent) / 100) * width), width - 1)
      : -1;
  let bar = '';
  for (let i = 0; i < width; i++)
    bar += i === cursorPos ? '│' : i < filled ? '▓' : '░';
  return bar;
}
/** Bracketed usage bar used by context-bar. */
function usageProgressBar(percent: number, width = 15): string {
  const filled = Math.round((percent / 100) * width);
  return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}]`;
}

// ── widget-level helpers ────────────────────────────────────────────────────
const raw = (w: Widget) => !!w.rawValue;
/** Text-label widgets (getLabelPrefix). `metadata.label` replaces the prefix; '' drops it. */
const LABELABLE = new Set([
  'model',
  'output-style',
  'context-length',
  'context-window',
  'context-percentage',
  'context-percentage-usable',
  'context-bar',
  'claude-session-id',
  'claude-account-email',
  'claude-status',
  'session-clock',
  'session-cost',
  'session-cost-rate',
  'session-name',
  'free-memory',
  'terminal-width',
  'thinking-effort',
  'tokens-input',
  'tokens-output',
  'tokens-cached',
  'tokens-total',
  'cache-hit-rate',
  'cache-read',
  'cache-write',
  'cache-timer',
  'input-speed',
  'output-speed',
  'total-speed',
  'extra-usage-remaining',
  'extra-usage-used',
  'extra-usage-daily-budget',
  'extra-usage-utilization',
  'session-usage',
  'weekly-usage',
  'weekly-sonnet-usage',
  'weekly-opus-usage',
  'fable-weekly-usage',
  'block-timer',
  'reset-timer',
  'weekly-reset-timer',
  'git-staged-files',
  'git-unstaged-files',
  'git-untracked-files',
  'current-working-dir'
]);
const labeled = (w: Widget, label: string, value: string) => {
  if (raw(w)) return value;
  const prefix =
    LABELABLE.has(w.type) && w.metadata?.label !== undefined
      ? w.metadata.label
      : label;
  return prefix + value;
};
/** The widget's built-in prefix for the current mode, before any label override. */
export function defaultLabel(w: Widget): string | undefined {
  if (!LABELABLE.has(w.type)) return undefined;
  return builtinLabel(w);
}
const meta = (w: Widget, key: string) => w.metadata?.[key];
const metaOn = (w: Widget, key: string) => w.metadata?.[key] === 'true';
/** symbol + joining space; empty override collapses the space (formatSymbolPrefix). */
const symPrefix = (w: Widget, def: string) => {
  const s = w.character ?? def;
  return s.length > 0 ? `${s} ` : '';
};
// ── families ────────────────────────────────────────────────────────────────

// raw ? value : label+value   (value identical in both modes)
const LABELED: Record<string, [label: string, value: string]> = {
  model: ['Model: ', 'Claude'],
  'output-style': ['Style: ', 'default'],
  'claude-session-id': ['Session ID: ', 'preview-session-id'],
  'claude-account-email': ['Account: ', 'you@example.com'],
  'session-clock': ['Session: ', '2hr 15m'],
  'session-name': ['Session: ', 'my-session'],
  'terminal-width': ['Term: ', '80'],
  version: ['v', '1.0.0'],
  'thinking-effort': ['Thinking: ', 'high'],
  'git-staged-files': ['S:', '3'],
  'git-unstaged-files': ['M:', '2'],
  'git-untracked-files': ['?:', '1']
};

// raw ? base : symPrefix(default) + base   (git/jj symbol-prefixed)
const PREFIXED: Record<string, [def: string, base: string]> = {
  'git-worktree': ['𖠰', 'main'],
  'jj-bookmarks': ['🔖', 'main'],
  'jj-workspace': ['◆', 'default']
};

// raw ? 'true' : (character ?? default)   (git flag widgets)
const FLAG_SYMBOL: Record<string, string> = {
  'git-staged': '+',
  'git-unstaged': '*',
  'git-untracked': '?',
  'worktree-mode': '⎇'
};

// speed widgets: [label, sessionAvg, windowed]
const SPEED: Record<string, [string, number, number]> = {
  'input-speed': ['In: ', 85.2, 31.5],
  'output-speed': ['Out: ', 42.5, 26.8],
  'total-speed': ['Total: ', 127.7, 58.3]
};

const TOKENS: Record<string, [string, number]> = {
  'context-length': ['Ctx: ', 18600],
  'context-window': ['Win: ', 200000],
  'tokens-input': ['In: ', 15200],
  'tokens-output': ['Out: ', 3400],
  'tokens-cached': ['Cached: ', 12000],
  'tokens-total': ['Total: ', 30600]
};

// usage-percentage widgets: [label, previewPercent, hasCursor]
const USAGE_PCT: Record<string, [string, number, boolean]> = {
  'session-usage': ['Session: ', 20, true],
  'weekly-usage': ['Weekly: ', 12, true],
  'weekly-sonnet-usage': ['Weekly Sonnet: ', 8, true],
  'weekly-opus-usage': ['Weekly Opus: ', 4, true],
  // Upstream's label really is "Fable Weekly: " while the widget is named
  // "Weekly Fable Usage" — mirror the inconsistency rather than normalizing it.
  'fable-weekly-usage': ['Fable Weekly: ', 4, true],
  'extra-usage-utilization': ['Overage: ', 2.6, false]
};

function usagePct(
  w: Widget,
  label: string,
  pct: number,
  hasCursor: boolean,
  format: NumberFormat
): string {
  const mode = meta(w, 'display');
  const inverted = metaOn(w, 'invert');
  const cursor = hasCursor && metaOn(w, 'cursor') ? 50 : undefined;
  const rendered = inverted ? 100 - pct : pct;
  const pctText = formatPercent(rendered, format);
  if (mode === 'progress' || mode === 'progress-short') {
    const width = mode === 'progress' ? 32 : 16;
    return labeled(
      w,
      label,
      `[${timerBar(rendered, width, cursor)}] ${pctText}`
    );
  }
  if (mode === 'slider' || mode === 'slider-only') {
    const s = sliderBar(rendered, 10, cursor);
    return labeled(w, label, mode === 'slider' ? `${s} ${pctText}` : s);
  }
  // Since v2.2.23 the plain percent honors the direction too (renderedPercent):
  // inverted shows remaining instead of used.
  return labeled(w, label, pctText);
}

// timer widgets: [labelBar, labelTime, pct, timeCompact, timeFull]
const TIMER: Record<string, [string, string, number, string, string]> = {
  'block-timer': ['Block ', 'Block: ', 73.9, '3h45m', '3hr 45m'],
  'reset-timer': ['Reset ', 'Reset: ', 10, '4h30m', '4hr 30m'],
  'weekly-reset-timer': [
    'Weekly Reset ',
    'Weekly Reset: ',
    10,
    '1d12h30m',
    '1d 12hr 30m'
  ]
};

function timer(
  w: Widget,
  labelBar: string,
  labelTime: string,
  pct: number,
  tc: string,
  tf: string,
  format: NumberFormat
): string {
  const mode = meta(w, 'display');
  const inverted = metaOn(w, 'invert');
  const rendered = inverted ? 100 - pct : pct;
  const pctText = formatPercent(rendered, format);
  if (mode === 'progress' || mode === 'progress-short') {
    const width = mode === 'progress' ? 32 : 16;
    return labeled(w, labelBar, `[${timerBar(rendered, width)}] ${pctText}`);
  }
  if (mode === 'slider' || mode === 'slider-only') {
    const s = sliderBar(rendered);
    return labeled(w, labelBar, mode === 'slider' ? `${s} ${pctText}` : s);
  }
  return labeled(w, labelTime, metaOn(w, 'compact') ? tc : tf);
}

/** `~` stands for home, so it is not one of the counted segments. */
function keepLastSegments(path: string, segments: number): string {
  const useBackslash = path.includes('\\') && !path.includes('/');
  const outSep = useBackslash ? '\\' : '/';
  const filtered = path.split(/[\\/]+/).filter(part => part !== '');
  const prefix = filtered[0] === '~' ? `~${outSep}` : '';
  const pathSegments = prefix ? filtered.slice(1) : filtered;
  if (pathSegments.length <= segments) return path;
  return `${prefix}...${outSep}${pathSegments.slice(-segments).join(outSep)}`;
}

function cwd(w: Widget): string {
  const fish = metaOn(w, 'fishStyle');
  const home = metaOn(w, 'abbreviateHome');
  const segs = parseInt(meta(w, 'segments') ?? '', 10);
  const hasSeg = !Number.isNaN(segs) && segs > 0;
  let path: string;
  if (fish) path = '~/D/P/my-project';
  else {
    path = home
      ? '~/Documents/Projects/my-project'
      : '/Users/example/Documents/Projects/my-project';
    if (hasSeg) path = keepLastSegments(path, segs);
  }
  // Optional glyph (default none). The cwd: prefix is a real label override.
  const glyph = symPrefix(w, '');
  return `${glyph}${labeled(w, 'cwd: ', path)}`;
}

function vim(w: Widget): string {
  const configured = meta(w, 'format');
  const format = [
    'icon-dash-letter',
    'icon-letter',
    'icon',
    'letter',
    'word'
  ].includes(configured ?? '')
    ? configured!
    : 'icon-dash-letter';
  const canUseNerdFont =
    format === 'icon-dash-letter' ||
    format === 'icon-letter' ||
    format === 'icon';
  const icon = canUseNerdFont && metaOn(w, 'nerdFont') ? '' : 'v';
  const letter = 'N';
  switch (format) {
    case 'icon-letter':
      return `${icon} ${letter}`;
    case 'icon':
      return icon;
    case 'letter':
      return letter;
    case 'word':
      return 'NORMAL';
    default:
      return `${icon}-${letter}`; // icon-dash-letter
  }
}

function voiceStatus(w: Widget): string {
  const configured = meta(w, 'format');
  const format = ['icon', 'icon-text', 'text', 'word'].includes(
    configured ?? ''
  )
    ? configured!
    : 'icon';
  const canUseNerdFont =
    format === 'icon' || (format === 'icon-text' && !raw(w));
  const nerdFont = canUseNerdFont && metaOn(w, 'nerdFont');
  const icon = nerdFont ? '' : '🎤';
  const stateDot = '◉';
  switch (format) {
    case 'icon':
      return nerdFont ? icon : raw(w) ? stateDot : `${icon} ${stateDot}`;
    case 'icon-text':
      return raw(w) ? 'on' : `${icon} on`;
    case 'text':
      return 'on';
    case 'word':
      return raw(w) ? 'on' : 'voice on';
  }
  return nerdFont ? icon : raw(w) ? stateDot : `${icon} ${stateDot}`;
}

function remoteStatus(w: Widget): string {
  const configured = meta(w, 'format');
  const format = [
    'icon',
    'icon-text',
    'text',
    'word',
    'label-check',
    'label-mark'
  ].includes(configured ?? '')
    ? configured!
    : 'icon';
  const canUseNerdFont =
    format === 'icon' || (format === 'icon-text' && !raw(w));
  const nerdFont = canUseNerdFont && metaOn(w, 'nerdFont');
  const icon = nerdFont ? '' : '📡';
  const stateDot = '◉';
  switch (format) {
    case 'icon':
      return nerdFont ? icon : raw(w) ? stateDot : `${icon} ${stateDot}`;
    case 'icon-text':
      return raw(w) ? 'on' : `${icon} on`;
    case 'text':
      return 'on';
    case 'word':
      return raw(w) ? 'on' : 'remote on';
    case 'label-check':
      return raw(w) ? '✅' : 'remote ✅';
    case 'label-mark':
      return raw(w) ? '✓' : 'remote ✓';
  }
  return nerdFont ? icon : raw(w) ? stateDot : `${icon} ${stateDot}`;
}

function sandboxStatus(w: Widget): string {
  const format = meta(w, 'format') ?? 'glyph';
  const glyph = metaOn(w, 'nerdFont') ? '' : '●';
  if (format === 'text') return raw(w) ? 'ON' : 'SB: ON';
  if (format === 'word') return raw(w) ? 'ON' : 'Sandbox: ON';
  return raw(w) ? glyph : `SB: ${glyph}`;
}

function cacheTimer(w: Widget): string {
  const symbol = meta(w, 'symbolFresh') ?? '🟢';
  const value = symbol.length > 0 ? `${symbol} 4:52` : '4:52';
  return labeled(w, 'Cache: ', value);
}

function skills(w: Widget): string {
  const mode = meta(w, 'mode') ?? 'current';
  if (mode === 'count') return raw(w) ? '5' : 'Skills: 5';
  if (mode === 'list')
    return raw(w) ? 'commit, review-pr' : 'Skills: commit, review-pr';
  return raw(w) ? 'commit' : 'Skill: commit';
}

function link(w: Widget): string {
  const label = meta(w, 'text')?.trim() || meta(w, 'url')?.trim() || 'no url';
  return raw(w) ? label : `🔗 ${label}`;
}

// Mirrors CompactionCounter's SAMPLE_STATS: count 2 (1 auto, 1 manual,
// 0 unknown), 120k tokens reclaimed. hideZero only applies outside preview.
function compaction(w: Widget, numberFormat: NumberFormat): string {
  const metric = meta(w, 'metric');
  // A sub-metric renders just that one value as a bare number (getMetricValue).
  if (metric === 'auto' || metric === 'manual') return '1';
  if (metric === 'unknown') return '0';
  if (metric === 'reclaimed') return formatTokens(120000, numberFormat);
  const format = meta(w, 'format') ?? 'icon-space-number';
  const nerd = metaOn(w, 'nerdFont') && format === 'icon-space-number';
  const icon = nerd ? '' : '↻';
  let out =
    format === 'text-and-number'
      ? 'Compactions: 2'
      : format === 'number'
        ? '2'
        : `${icon} 2`;
  // formatTriggerSuffix skips zero buckets — unknown (0) never shows here.
  if (metaOn(w, 'showTriggers')) out += ' (1 auto, 1 manual)';
  if (metaOn(w, 'showReclaimed')) {
    // Empty override collapses the symbol; unset falls back to '↓'.
    const s = meta(w, 'symbolReclaimed') ?? '↓';
    const tokens = formatTokens(120000, numberFormat);
    out += s.length > 0 ? ` ${s}${tokens}` : ` ${tokens}`;
  }
  return out;
}

function contextPct(
  w: Widget,
  label: string,
  used: number,
  inv: number,
  format: NumberFormat
): string {
  const pct = metaOn(w, 'inverse') ? inv : used;
  const mode = meta(w, 'display');
  const pctText = formatPercent(pct, format);
  let val: string;
  if (mode === 'slider') val = `${sliderBar(pct)} ${pctText}`;
  else if (mode === 'slider-only') val = sliderBar(pct);
  else val = pctText;
  return labeled(w, label, val);
}

function contextBar(
  w: Widget,
  tokenFormat: NumberFormat,
  percentFormat: NumberFormat
): string {
  const mode = meta(w, 'display') ?? 'progress-short';
  const stats = `${formatTokens(50000, tokenFormat, 0)}/${formatTokens(200000, tokenFormat, 0)} (${formatPercent(25, percentFormat, 0)})`;
  if (mode === 'slider' || mode === 'slider-only') {
    const s = sliderBar(25);
    const disp = mode === 'slider' ? `${s} ${stats}` : s;
    return labeled(w, 'Context: ', disp);
  }
  const width = mode === 'progress' ? 32 : 16;
  return labeled(w, 'Context: ', `${usageProgressBar(25, width)} ${stats}`);
}

function isBarMode(w: Widget): boolean {
  const d = meta(w, 'display');
  return (
    d === 'progress' ||
    d === 'progress-short' ||
    d === 'slider' ||
    d === 'slider-only'
  );
}

function builtinLabel(w: Widget): string {
  const t = w.type;
  if (LABELED[t]) return LABELED[t][0];
  if (TOKENS[t]) return TOKENS[t][0];
  if (SPEED[t]) return SPEED[t][0];
  if (USAGE_PCT[t]) return USAGE_PCT[t][0];
  if (TIMER[t]) return isBarMode(w) ? TIMER[t][0] : TIMER[t][1];
  switch (t) {
    case 'current-working-dir':
      return 'cwd: ';
    case 'context-percentage':
      return metaOn(w, 'inverse') ? 'Ctx Left: ' : 'Ctx Used: ';
    case 'context-percentage-usable':
      return metaOn(w, 'inverse') ? 'Ctx(u) Left: ' : 'Ctx(u) Used: ';
    case 'context-bar':
      return 'Context: ';
    case 'claude-status':
      return 'Claude: ';
    case 'session-cost':
      return 'Cost: ';
    case 'session-cost-rate':
      return 'Rate: ';
    case 'free-memory':
      return 'Mem: ';
    case 'cache-hit-rate':
      return 'Cache Hit: ';
    case 'cache-read':
      return 'Cache Read: ';
    case 'cache-write':
      return 'Cache Write: ';
    case 'extra-usage-remaining':
      return 'Overage Left: ';
    case 'extra-usage-used':
      return 'Overage Used: ';
    case 'extra-usage-daily-budget':
      return 'Daily Budget: ';
    default:
      return '';
  }
}

function nf(
  w: Widget,
  kind: 'token' | 'speed' | 'percent' | 'memory' | 'cost',
  global?: GlobalNumberFormat
): NumberFormat {
  return resolveNumberFormat(kind, w.numberFormat, global);
}

function slot(w: Widget, key: string, fallback: string): string {
  const value = w.metadata?.[key];
  return value === undefined ? fallback : value;
}

function applyMaxWidth(text: string, maxWidth?: number): string {
  if (!maxWidth || maxWidth <= 0 || text.length <= maxWidth) return text;
  if (maxWidth <= 3) return '.'.repeat(maxWidth);
  return `${text.slice(0, maxWidth - 3)}...`;
}

const CLAUDE_STATUS_COLORS: Record<string, string> = {
  none: '#4e9a06',
  minor: '#c4a000',
  major: '#ff8700',
  critical: '#cc0000'
};
const CLAUDE_STATUS_BUCKETS = [
  'none',
  'none',
  'minor',
  'none',
  'major',
  'none',
  'critical',
  'none'
];

/** Multi-colored runs for widgets that paint their own foreground (Claude Status history). */
export function previewRuns(w: Widget): PreviewRun[] | null {
  if (w.type !== 'claude-status' || w.metadata?.history !== 'true') return null;
  return [
    { text: labeled(w, 'Claude: ', 'ok'), color: CLAUDE_STATUS_COLORS.none },
    { text: ' ' },
    ...CLAUDE_STATUS_BUCKETS.map(bucket => ({
      text: '▮',
      color: CLAUDE_STATUS_COLORS[bucket]
    }))
  ];
}

// ── dispatch ────────────────────────────────────────────────────────────────
export function previewText(
  w: Widget,
  global?: GlobalNumberFormat
): string | null {
  const t = w.type;
  const runs = previewRuns(w);
  if (runs) return runs.map(run => run.text).join('');

  if (TOKENS[t]) {
    const [label, count] = TOKENS[t];
    return labeled(w, label, formatTokens(count, nf(w, 'token', global)));
  }
  if (LABELED[t]) {
    const [l, v] = LABELED[t];
    return labeled(w, l, v);
  }
  if (PREFIXED[t]) {
    const [def, base] = PREFIXED[t];
    return raw(w) ? base : `${symPrefix(w, def)}${base}`;
  }
  if (FLAG_SYMBOL[t]) return raw(w) ? 'true' : (w.character ?? FLAG_SYMBOL[t]);
  if (SPEED[t]) {
    const [l, sess, win] = SPEED[t];
    const ws = parseInt(meta(w, 'windowSeconds') ?? '', 10);
    const value = !Number.isNaN(ws) && ws > 0 ? win : sess;
    return labeled(w, l, formatSpeed(value, nf(w, 'speed', global)));
  }
  if (USAGE_PCT[t]) {
    const [l, p, c] = USAGE_PCT[t];
    return usagePct(w, l, p, c, nf(w, 'percent', global));
  }
  if (TIMER[t]) {
    const [lb, lt, p, tc, tf] = TIMER[t];
    return timer(w, lb, lt, p, tc, tf, nf(w, 'percent', global));
  }

  switch (t) {
    case 'separator': {
      // Mirror ccstatusline's formatSeparator(): pad the common chars with spaces
      // so a separator actually opens up spacing between adjacent widgets.
      const sep = w.character ?? '|';
      if (sep === '|') return ' | ';
      if (sep === ',') return ', ';
      if (sep === '-') return ' - ';
      return sep;
    }
    case 'git-branch': {
      const sample = w.maxWidth ? 'feature/long-branch-name' : 'main';
      const text = raw(w) ? sample : `${symPrefix(w, '⎇')}${sample}`;
      return applyMaxWidth(text, w.maxWidth);
    }
    case 'git-root-dir':
      return applyMaxWidth(
        w.maxWidth ? 'my-long-repository-name' : 'my-repo',
        w.maxWidth
      );
    case 'git-changes':
    case 'jj-changes':
      return `(${slot(w, 'symbolInsertions', '+')}42,${slot(w, 'symbolDeletions', '-')}10)`;
    case 'git-insertions':
    case 'jj-insertions':
      return `${slot(w, 'symbolInsertions', '+')}42`;
    case 'git-deletions':
    case 'jj-deletions':
      return `${slot(w, 'symbolDeletions', '-')}10`;
    case 'git-clean-status':
      return raw(w) ? 'clean' : slot(w, 'symbolClean', '✓');
    case 'git-conflicts':
      return raw(w) ? '2' : `${w.character ?? '⚠'}2`;
    case 'git-is-fork':
      return raw(w) ? 'true' : (w.character ?? '⑂');
    case 'git-ahead-behind':
      return raw(w)
        ? '2,3'
        : `${slot(w, 'symbolAhead', '↑')}2${slot(w, 'symbolBehind', '↓')}3`;
    case 'git-status':
      return `${slot(w, 'symbolStaged', '+')}${slot(w, 'symbolUnstaged', '*')}`;
    case 'git-review': {
      const showStatus = !isHidden(w, 'status');
      const showTitle = !isHidden(w, 'title');
      return `PR #42${showStatus ? ' OPEN' : ''}${showTitle ? ' Example PR title' : ''}`;
    }
    case 'git-ci-status':
      return raw(w) ? 'failing' : '✗1 ●1 ✓5';
    case 'git-origin-owner-repo':
      return metaOn(w, 'ownerOnlyWhenFork') ? 'owner' : 'owner/repo';
    case 'jj-revision':
      return raw(w) ? 'kkmpptxz' : `${symPrefix(w, '')}kkmpptxz`;
    case 'current-working-dir':
      return cwd(w);
    case 'vim-mode':
      return vim(w);
    case 'voice-status':
      return voiceStatus(w);
    case 'remote-control-status':
      return remoteStatus(w);
    case 'sandbox-status':
      return sandboxStatus(w);
    case 'cache-timer':
      return cacheTimer(w);
    case 'skills':
      return skills(w);
    case 'link':
      return link(w);
    case 'compaction-counter':
      return compaction(w, nf(w, 'token', global));
    case 'context-percentage':
      return contextPct(
        w,
        builtinLabel(w),
        9.3,
        90.7,
        nf(w, 'percent', global)
      );
    case 'context-percentage-usable':
      return contextPct(
        w,
        builtinLabel(w),
        11.6,
        88.4,
        nf(w, 'percent', global)
      );
    case 'context-bar':
      return contextBar(w, nf(w, 'token', global), nf(w, 'percent', global));
    case 'session-cost':
      return labeled(w, 'Cost: ', formatCost(2.45, nf(w, 'cost', global)));
    case 'session-cost-rate':
      return labeled(
        w,
        'Rate: ',
        `${formatCost(4.9, nf(w, 'cost', global))}/hr`
      );
    case 'extra-usage-remaining':
      return labeled(
        w,
        'Overage Left: ',
        formatUsageCurrency(3894, nf(w, 'cost', global))
      );
    case 'extra-usage-used':
      return labeled(
        w,
        'Overage Used: ',
        formatUsageCurrency(106, nf(w, 'cost', global))
      );
    case 'extra-usage-daily-budget':
      return labeled(
        w,
        'Daily Budget: ',
        formatUsageCurrency(3894 / 20, nf(w, 'cost', global))
      );
    case 'free-memory':
      return labeled(
        w,
        'Mem: ',
        `${formatBytes(12.4 * 1024 ** 3, nf(w, 'memory', global))}/${formatBytes(16 * 1024 ** 3, nf(w, 'memory', global))}`
      );
    case 'cache-hit-rate':
      return labeled(
        w,
        'Cache Hit: ',
        formatPercent(87, nf(w, 'percent', global))
      );
    case 'cache-read':
      return labeled(
        w,
        'Cache Read: ',
        `${formatTokens(12000, nf(w, 'token', global))} (${formatPercent(64, nf(w, 'percent', global))})`
      );
    case 'cache-write':
      return labeled(
        w,
        'Cache Write: ',
        `${formatTokens(3000, nf(w, 'token', global))} (${formatPercent(16, nf(w, 'percent', global))})`
      );
    case 'claude-status':
      return labeled(w, 'Claude: ', 'ok');
    case 'custom-text':
      return w.customText ?? '';
    case 'custom-symbol':
      return w.customSymbol ?? '';
    case 'custom-command':
      return w.commandPath
        ? `[cmd: ${w.commandPath.substring(0, 20)}${w.commandPath.length > 20 ? '...' : ''}]`
        : '[No command]';
  }

  return null;
}
