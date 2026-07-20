// Faithful port of ccstatusline's render() isPreview branches through v2.2.23,
// plus the widgets introduced in v2.2.24.
// Given a widget instance, returns the exact text the terminal would show in
// preview mode for the current options (rawValue, display mode, format, glyph
// override, cwd style, etc.). Returns null for widgets whose preview never
// changes with options — the caller falls back to the static catalog preview.

import type { Widget } from '@/widgets';

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
const labeled = (w: Widget, label: string, value: string) =>
  raw(w) ? value : label + value;
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
  'context-length': ['Ctx: ', '18.6k'],
  'context-window': ['Win: ', '200k'],
  'claude-session-id': ['Session ID: ', 'preview-session-id'],
  'claude-account-email': ['Account: ', 'you@example.com'],
  'session-clock': ['Session: ', '2hr 15m'],
  'session-cost': ['Cost: ', '$2.45'],
  'session-name': ['Session: ', 'my-session'],
  'free-memory': ['Mem: ', '12.4G/16.0G'],
  'terminal-width': ['Term: ', '80'],
  version: ['v', '1.0.0'],
  'thinking-effort': ['Thinking: ', 'high'],
  'tokens-input': ['In: ', '15.2k'],
  'tokens-output': ['Out: ', '3.4k'],
  'tokens-cached': ['Cached: ', '12k'],
  'tokens-total': ['Total: ', '30.6k'],
  'cache-hit-rate': ['Cache Hit: ', '87.0%'],
  'cache-read': ['Cache Read: ', '12k (64.0%)'],
  'cache-write': ['Cache Write: ', '3k (16.0%)'],
  'extra-usage-remaining': ['Overage Left: ', '$3,894.00'],
  'extra-usage-used': ['Overage Used: ', '$106.00'],
  'git-staged-files': ['S:', '3'],
  'git-unstaged-files': ['M:', '2'],
  'git-untracked-files': ['?:', '1'],
  'git-is-fork': ['isFork: ', 'true']
};

// raw ? base : symPrefix(default) + base   (git/jj symbol-prefixed)
const PREFIXED: Record<string, [def: string, base: string]> = {
  'git-branch': ['⎇', 'main'],
  'git-conflicts': ['⚠', '2'],
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
const SPEED: Record<string, [string, string, string]> = {
  'input-speed': ['In: ', '85.2 t/s', '31.5 t/s'],
  'output-speed': ['Out: ', '42.5 t/s', '26.8 t/s'],
  'total-speed': ['Total: ', '127.7 t/s', '58.3 t/s']
};

// usage-percentage widgets: [label, previewPercent, hasCursor]
const USAGE_PCT: Record<string, [string, number, boolean]> = {
  'session-usage': ['Session: ', 20, true],
  'weekly-usage': ['Weekly: ', 12, true],
  'weekly-sonnet-usage': ['Weekly Sonnet: ', 8, true],
  'weekly-opus-usage': ['Weekly Opus: ', 4, true],
  'extra-usage-utilization': ['Overage: ', 2.6, false]
};

function usagePct(
  w: Widget,
  label: string,
  pct: number,
  hasCursor: boolean
): string {
  const mode = meta(w, 'display');
  const inverted = metaOn(w, 'invert');
  const cursor = hasCursor && metaOn(w, 'cursor') ? 50 : undefined;
  const rendered = inverted ? 100 - pct : pct;
  if (mode === 'progress' || mode === 'progress-short') {
    const width = mode === 'progress' ? 32 : 16;
    return labeled(
      w,
      label,
      `[${timerBar(rendered, width, cursor)}] ${rendered.toFixed(1)}%`
    );
  }
  if (mode === 'slider' || mode === 'slider-only') {
    const s = sliderBar(rendered, 10, cursor);
    return labeled(
      w,
      label,
      mode === 'slider' ? `${s} ${rendered.toFixed(1)}%` : s
    );
  }
  // Since v2.2.23 the plain percent honors the direction too (renderedPercent):
  // inverted shows remaining instead of used.
  return labeled(w, label, `${rendered.toFixed(1)}%`);
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
  tf: string
): string {
  const mode = meta(w, 'display');
  const inverted = metaOn(w, 'invert');
  const rendered = inverted ? 100 - pct : pct;
  if (mode === 'progress' || mode === 'progress-short') {
    const width = mode === 'progress' ? 32 : 16;
    return labeled(
      w,
      labelBar,
      `[${timerBar(rendered, width)}] ${rendered.toFixed(1)}%`
    );
  }
  if (mode === 'slider' || mode === 'slider-only') {
    const s = sliderBar(rendered);
    return labeled(
      w,
      labelBar,
      mode === 'slider' ? `${s} ${rendered.toFixed(1)}%` : s
    );
  }
  return labeled(w, labelTime, metaOn(w, 'compact') ? tc : tf);
}

function cwd(w: Widget): string {
  const fish = metaOn(w, 'fishStyle');
  const home = metaOn(w, 'abbreviateHome');
  const segs = parseInt(meta(w, 'segments') ?? '', 10);
  const hasSeg = !Number.isNaN(segs) && segs > 0;
  let path: string;
  if (fish) path = '~/D/P/my-project';
  else if (home && hasSeg)
    path = segs === 1 ? '~/.../my-project' : '~/.../Projects/my-project';
  else if (home) path = '~/Documents/Projects/my-project';
  else if (hasSeg) path = segs === 1 ? '.../project' : '.../example/project';
  else path = '/Users/example/Documents/Projects/my-project';
  // Optional glyph (default none); in raw mode it replaces the cwd: label.
  const prefix = symPrefix(w, '');
  return raw(w) ? `${prefix}${path}` : `${prefix}cwd: ${path}`;
}

function vim(w: Widget): string {
  const format = meta(w, 'format') ?? 'icon-dash-letter';
  const icon = metaOn(w, 'nerdFont') ? '' : 'v';
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

function statusWidget(w: Widget, emoji: string): string {
  if (raw(w)) return 'on';
  const format = meta(w, 'format') ?? 'icon';
  const stateDot = '◉';
  switch (format) {
    case 'icon-text':
      return `${emoji} on`;
    case 'text':
      return 'on';
    case 'word':
      return 'on';
    default:
      return `${emoji} ${stateDot}`; // icon
  }
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
function compaction(w: Widget): string {
  const metric = meta(w, 'metric');
  // A sub-metric renders just that one value as a bare number (getMetricValue).
  if (metric === 'auto' || metric === 'manual') return '1';
  if (metric === 'unknown') return '0';
  if (metric === 'reclaimed') return '120k';
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
    out += s.length > 0 ? ` ${s}120k` : ' 120k';
  }
  return out;
}

function contextPct(
  w: Widget,
  label: string,
  used: number,
  inv: number
): string {
  const pct = metaOn(w, 'inverse') ? inv : used;
  const mode = meta(w, 'display');
  let val: string;
  if (mode === 'slider') val = `${sliderBar(pct)} ${pct.toFixed(1)}%`;
  else if (mode === 'slider-only') val = sliderBar(pct);
  else val = `${pct.toFixed(1)}%`;
  return labeled(w, label, val);
}

function contextBar(w: Widget): string {
  const mode = meta(w, 'display') ?? 'progress-short';
  if (mode === 'slider' || mode === 'slider-only') {
    const s = sliderBar(25);
    const disp = mode === 'slider' ? `${s} 50k/200k (25%)` : s;
    return raw(w) ? disp : `Context: ${disp}`;
  }
  const width = mode === 'progress' ? 32 : 16;
  const disp = `${usageProgressBar(25, width)} 50k/200k (25%)`;
  return raw(w) ? disp : `Context: ${disp}`;
}

// ── dispatch ────────────────────────────────────────────────────────────────
export function previewText(w: Widget): string | null {
  const t = w.type;

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
    return labeled(w, l, !Number.isNaN(ws) && ws > 0 ? win : sess);
  }
  if (USAGE_PCT[t]) {
    const [l, p, c] = USAGE_PCT[t];
    return usagePct(w, l, p, c);
  }
  if (TIMER[t]) {
    const [lb, lt, p, tc, tf] = TIMER[t];
    return timer(w, lb, lt, p, tc, tf);
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
    case 'git-clean-status':
      return raw(w) ? 'clean' : '✓';
    case 'git-ahead-behind':
      return raw(w)
        ? '2,3'
        : `${meta(w, 'symbolAhead') ?? '↑'}2${meta(w, 'symbolBehind') ?? '↓'}3`;
    case 'git-status':
      return `${meta(w, 'symbolStaged') ?? '+'}${meta(w, 'symbolUnstaged') ?? '*'}`;
    case 'git-review': {
      const s = !metaOn(w, 'hideStatus'),
        ti = !metaOn(w, 'hideTitle');
      return `PR #42${s ? ' OPEN' : ''}${ti ? ' Example PR title' : ''}`;
    }
    case 'git-ci-status':
      return raw(w) ? 'failing' : '✗1 ●1 ✓5';
    case 'git-origin-owner-repo':
      return metaOn(w, 'ownerOnlyWhenFork') ? 'owner' : 'owner/repo';
    case 'jj-revision':
      return raw(w) ? 'kkmpptxz' : ' kkmpptxz';
    case 'current-working-dir':
      return cwd(w);
    case 'vim-mode':
      return vim(w);
    case 'voice-status':
      return statusWidget(w, '🎤');
    case 'remote-control-status':
      return statusWidget(w, '📡');
    case 'sandbox-status':
      return sandboxStatus(w);
    case 'cache-timer':
      return cacheTimer(w);
    case 'skills':
      return skills(w);
    case 'link':
      return link(w);
    case 'compaction-counter':
      return compaction(w);
    case 'context-percentage':
      return contextPct(w, 'Ctx Used: ', 9.3, 90.7);
    case 'context-percentage-usable':
      return contextPct(w, 'Ctx(u) Used: ', 11.6, 88.4);
    case 'context-bar':
      return contextBar(w);
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
