import { v4 as uuid } from 'uuid';

// AUTO-GENERATED widget catalog mirroring ccstatusline v2.2.22 (all 85 widgets).
// type     : registry key
// category : matches ccstatusline ADD WIDGET menu
// color    : ccstatusline ANSI default color name (mapped to a tailwind class for preview)
// preview  : the EXACT default value ccstatusline render() outputs in preview mode (isPreview),
//            with ANSI/OSC escape codes stripped for web display.
// Display names & descriptions live in i18n (keyed by type); category labels in i18n.categories.

export type WidgetCategory =
  | 'Core'
  | 'Git'
  | 'Jujutsu'
  | 'Environment'
  | 'Tokens'
  | 'Cache'
  | 'Token Speed'
  | 'Context'
  | 'Session'
  | 'Usage'
  | 'Custom'
  | 'Layout';

export const CATEGORIES: WidgetCategory[] = [
  'Core',
  'Git',
  'Jujutsu',
  'Environment',
  'Tokens',
  'Cache',
  'Token Speed',
  'Context',
  'Session',
  'Usage',
  'Custom',
  'Layout'
];

export interface WidgetMeta {
  type: string;
  category: WidgetCategory;
  /** ccstatusline ANSI default color name (mapped to a tailwind class for preview). */
  color: string;
  /** Exact default value ccstatusline renders for this widget (preview mode). */
  preview: string;
  defaults?: Record<string, unknown>;
}

export const WIDGETS: WidgetMeta[] = [
  { type: 'model', category: 'Core', color: 'cyan', preview: 'Model: Claude' },
  {
    type: 'output-style',
    category: 'Core',
    color: 'cyan',
    preview: 'Style: default'
  },
  { type: 'git-branch', category: 'Git', color: 'magenta', preview: '⎇ main' },
  {
    type: 'git-changes',
    category: 'Git',
    color: 'yellow',
    preview: '(+42,-10)'
  },
  { type: 'git-insertions', category: 'Git', color: 'green', preview: '+42' },
  { type: 'git-deletions', category: 'Git', color: 'red', preview: '-10' },
  { type: 'git-staged-files', category: 'Git', color: 'green', preview: 'S:3' },
  {
    type: 'git-unstaged-files',
    category: 'Git',
    color: 'yellow',
    preview: 'M:2'
  },
  {
    type: 'git-untracked-files',
    category: 'Git',
    color: 'red',
    preview: '?:1'
  },
  { type: 'git-clean-status', category: 'Git', color: 'green', preview: '✓' },
  { type: 'git-root-dir', category: 'Git', color: 'cyan', preview: 'my-repo' },
  {
    type: 'git-review',
    category: 'Git',
    color: 'cyan',
    preview: 'PR #42 OPEN Example PR title'
  },
  { type: 'git-worktree', category: 'Git', color: 'blue', preview: '𖠰 main' },
  { type: 'git-status', category: 'Git', color: 'yellow', preview: '+*' },
  { type: 'git-staged', category: 'Git', color: 'green', preview: '+' },
  { type: 'git-unstaged', category: 'Git', color: 'yellow', preview: '*' },
  { type: 'git-untracked', category: 'Git', color: 'red', preview: '?' },
  { type: 'git-ahead-behind', category: 'Git', color: 'cyan', preview: '↑2↓3' },
  { type: 'git-conflicts', category: 'Git', color: 'red', preview: '⚠ 2' },
  { type: 'git-sha', category: 'Git', color: 'gray', preview: 'a1b2c3d' },
  {
    type: 'git-origin-owner',
    category: 'Git',
    color: 'cyan',
    preview: 'owner'
  },
  { type: 'git-origin-repo', category: 'Git', color: 'cyan', preview: 'repo' },
  {
    type: 'git-origin-owner-repo',
    category: 'Git',
    color: 'cyan',
    preview: 'owner/repo'
  },
  {
    type: 'git-upstream-owner',
    category: 'Git',
    color: 'magenta',
    preview: 'upstream-owner'
  },
  {
    type: 'git-upstream-repo',
    category: 'Git',
    color: 'magenta',
    preview: 'upstream-repo'
  },
  {
    type: 'git-upstream-owner-repo',
    category: 'Git',
    color: 'magenta',
    preview: 'upstream-owner/upstream-repo'
  },
  {
    type: 'git-is-fork',
    category: 'Git',
    color: 'yellow',
    preview: 'isFork: true'
  },
  {
    type: 'jj-bookmarks',
    category: 'Jujutsu',
    color: 'magenta',
    preview: '🔖 main'
  },
  {
    type: 'jj-workspace',
    category: 'Jujutsu',
    color: 'blue',
    preview: '◆ default'
  },
  {
    type: 'jj-root-dir',
    category: 'Jujutsu',
    color: 'cyan',
    preview: 'my-repo'
  },
  {
    type: 'jj-changes',
    category: 'Jujutsu',
    color: 'yellow',
    preview: '(+42,-10)'
  },
  {
    type: 'jj-insertions',
    category: 'Jujutsu',
    color: 'green',
    preview: '+42'
  },
  { type: 'jj-deletions', category: 'Jujutsu', color: 'red', preview: '-10' },
  {
    type: 'jj-description',
    category: 'Jujutsu',
    color: 'white',
    preview: '(no description)'
  },
  {
    type: 'jj-revision',
    category: 'Jujutsu',
    color: 'green',
    preview: 'kkmpptxz'
  },
  {
    type: 'current-working-dir',
    category: 'Environment',
    color: 'blue',
    preview: 'cwd: /Users/example/Documents/Projects/my-project'
  },
  {
    type: 'tokens-input',
    category: 'Tokens',
    color: 'blue',
    preview: 'In: 15.2k'
  },
  {
    type: 'tokens-output',
    category: 'Tokens',
    color: 'white',
    preview: 'Out: 3.4k'
  },
  {
    type: 'tokens-cached',
    category: 'Tokens',
    color: 'cyan',
    preview: 'Cached: 12k'
  },
  {
    type: 'tokens-total',
    category: 'Tokens',
    color: 'cyan',
    preview: 'Total: 30.6k'
  },
  {
    type: 'cache-hit-rate',
    category: 'Cache',
    color: 'green',
    preview: 'Cache Hit: 87.0%'
  },
  {
    type: 'cache-read',
    category: 'Cache',
    color: 'green',
    preview: 'Cache Read: 12k (64.0%)'
  },
  {
    type: 'cache-write',
    category: 'Cache',
    color: 'yellow',
    preview: 'Cache Write: 3k (16.0%)'
  },
  {
    type: 'input-speed',
    category: 'Token Speed',
    color: 'cyan',
    preview: 'In: 85.2 t/s'
  },
  {
    type: 'output-speed',
    category: 'Token Speed',
    color: 'cyan',
    preview: 'Out: 42.5 t/s'
  },
  {
    type: 'total-speed',
    category: 'Token Speed',
    color: 'cyan',
    preview: 'Total: 127.7 t/s'
  },
  {
    type: 'context-length',
    category: 'Context',
    color: 'brightBlack',
    preview: 'Ctx: 18.6k'
  },
  {
    type: 'context-window',
    category: 'Context',
    color: 'brightBlack',
    preview: 'Win: 200k'
  },
  {
    type: 'context-percentage',
    category: 'Context',
    color: 'blue',
    preview: 'Ctx Used: 9.3%'
  },
  {
    type: 'context-percentage-usable',
    category: 'Context',
    color: 'green',
    preview: 'Ctx(u) Used: 11.6%'
  },
  {
    type: 'session-clock',
    category: 'Session',
    color: 'yellow',
    preview: 'Session: 2hr 15m'
  },
  {
    type: 'session-cost',
    category: 'Session',
    color: 'green',
    preview: 'Cost: $2.45'
  },
  {
    type: 'block-timer',
    category: 'Usage',
    color: 'yellow',
    preview: 'Block: 3hr 45m'
  },
  {
    type: 'terminal-width',
    category: 'Environment',
    color: 'gray',
    preview: 'Term: 80'
  },
  { type: 'version', category: 'Core', color: 'gray', preview: 'v1.0.0' },
  { type: 'custom-text', category: 'Custom', color: 'white', preview: '' },
  { type: 'custom-symbol', category: 'Custom', color: 'white', preview: '' },
  {
    type: 'custom-command',
    category: 'Custom',
    color: 'white',
    preview: '[No command]'
  },
  { type: 'link', category: 'Custom', color: 'cyan', preview: '🔗 no url' },
  {
    type: 'claude-session-id',
    category: 'Core',
    color: 'cyan',
    preview: 'Session ID: preview-session-id'
  },
  {
    type: 'claude-account-email',
    category: 'Session',
    color: 'blue',
    preview: 'Account: you@example.com'
  },
  {
    type: 'session-name',
    category: 'Session',
    color: 'cyan',
    preview: 'Session: my-session'
  },
  {
    type: 'free-memory',
    category: 'Environment',
    color: 'cyan',
    preview: 'Mem: 12.4G/16.0G'
  },
  {
    type: 'session-usage',
    category: 'Usage',
    color: 'brightBlue',
    preview: 'Session: 20.0%'
  },
  {
    type: 'weekly-usage',
    category: 'Usage',
    color: 'brightBlue',
    preview: 'Weekly: 12.0%'
  },
  {
    type: 'extra-usage-utilization',
    category: 'Usage',
    color: 'green',
    preview: 'Overage: 2.6%'
  },
  {
    type: 'extra-usage-remaining',
    category: 'Usage',
    color: 'green',
    preview: 'Overage Left: $3,894.00'
  },
  {
    type: 'extra-usage-used',
    category: 'Usage',
    color: 'green',
    preview: 'Overage Used: $106.00'
  },
  {
    type: 'weekly-sonnet-usage',
    category: 'Usage',
    color: 'brightBlue',
    preview: 'Weekly Sonnet: 8.0%'
  },
  {
    type: 'weekly-opus-usage',
    category: 'Usage',
    color: 'brightBlue',
    preview: 'Weekly Opus: 4.0%'
  },
  {
    type: 'reset-timer',
    category: 'Usage',
    color: 'brightBlue',
    preview: 'Reset: 4hr 30m'
  },
  {
    type: 'weekly-reset-timer',
    category: 'Usage',
    color: 'brightBlue',
    preview: 'Weekly Reset: 1d 12hr 30m'
  },
  {
    type: 'context-bar',
    category: 'Context',
    color: 'blue',
    preview: 'Context: [████░░░░░░░░░░░░] 50k/200k (25%)'
  },
  {
    type: 'skills',
    category: 'Session',
    color: 'magenta',
    preview: 'Skill: commit'
  },
  {
    type: 'thinking-effort',
    category: 'Core',
    color: 'magenta',
    preview: 'Thinking: high'
  },
  { type: 'vim-mode', category: 'Core', color: 'green', preview: 'v-N' },
  { type: 'voice-status', category: 'Core', color: 'magenta', preview: '🎤 ◉' },
  {
    type: 'remote-control-status',
    category: 'Core',
    color: 'blue',
    preview: '📡 ◉'
  },
  { type: 'worktree-mode', category: 'Git', color: 'yellow', preview: '⎇' },
  {
    type: 'worktree-name',
    category: 'Git',
    color: 'yellow',
    preview: 'my-feature'
  },
  {
    type: 'worktree-branch',
    category: 'Git',
    color: 'yellow',
    preview: 'wt-my-feature'
  },
  {
    type: 'worktree-original-branch',
    category: 'Git',
    color: 'yellow',
    preview: 'main'
  },
  {
    type: 'compaction-counter',
    category: 'Context',
    color: 'yellow',
    preview: '↻ 2'
  },
  { type: 'separator', category: 'Layout', color: 'gray', preview: '|' },
  { type: 'flex-separator', category: 'Layout', color: 'gray', preview: '' }
];

export const WIDGET_BY_TYPE: Map<string, WidgetMeta> = new Map(
  WIDGETS.map(w => [w.type, w] as const)
);

/**
 * A widget instance placed on a status line.
 * Field set mirrors ccstatusline's WidgetItem (v2.2.22) so the emitted JSON
 * is consumed verbatim by the real ccstatusline renderer.
 */
export interface Widget {
  id: string;
  type: string;
  /** Foreground: named ANSI color, `ansi256:N`, `hex:RRGGBB`, or `gradient:<preset|stops>`. */
  color?: string;
  /** Background: named ANSI bg color, `ansi256:N`, or `hex:RRGGBB` (no gradient). */
  backgroundColor?: string;
  bold?: boolean;
  /** true = dim whole widget; 'parens' = dim only text inside (...) spans. */
  dim?: boolean | 'parens';
  /** Separator glyph (only meaningful for the `separator` widget). */
  character?: string;
  /** Strip the widget's label/icon, leaving the bare value. */
  rawValue?: boolean;
  customText?: string;
  customSymbol?: string;
  commandPath?: string;
  /** custom-command: truncate output to N chars. */
  maxWidth?: number;
  /** custom-command: keep ANSI colors from command output. */
  preserveColors?: boolean;
  /** custom-command: exec timeout in ms (default 1000). */
  timeout?: number;
  /** Fuse with the next widget: true = drop separator (keep padding); 'no-padding' = glue. */
  merge?: boolean | 'no-padding';
  /** Hide this widget entirely. */
  hide?: boolean;
  metadata?: Record<string, string>;
}

export interface CcStatusConfig {
  version: number;
  lines: Widget[][];
  flexMode: string;
  compactThreshold: number;
  colorLevel: number;
  inheritSeparatorColors: boolean;
  globalBold: boolean;
  gitCacheTtlSeconds: number;
  minimalistMode: boolean;
  /** Auto-separator inserted between every adjacent widget (mutually exclusive with manual separators / powerline). */
  defaultSeparator?: string;
  /** Padding added to the left+right of every widget. */
  defaultPadding?: string;
  /** Force every widget's foreground (named / ansi256 / hex / gradient). */
  overrideForegroundColor?: string;
  /** Force every widget's background (named / ansi256 / hex). */
  overrideBackgroundColor?: string;
  /** Status line refresh interval in seconds (null = default / unsupported). */
  refreshInterval?: number | null;
  powerline: {
    enabled: boolean;
    separators: string[];
    separatorInvertBackground: boolean[];
    startCaps: string[];
    endCaps: string[];
    /** Built-in palette name, or 'custom' / undefined to use each widget's own colors. */
    theme?: string;
    autoAlign: boolean;
    continueThemeAcrossLines: boolean;
  };
}

export function emptyConfig(): CcStatusConfig {
  return {
    version: 3,
    lines: [[], [], []],
    flexMode: 'full-minus-40',
    compactThreshold: 60,
    colorLevel: 2,
    inheritSeparatorColors: false,
    globalBold: false,
    gitCacheTtlSeconds: 5,
    minimalistMode: false,
    powerline: {
      enabled: false,
      separators: ['\uE0B0'],
      separatorInvertBackground: [false],
      startCaps: [],
      endCaps: [],
      autoAlign: false,
      continueThemeAcrossLines: false
    }
  };
}

// The preset a fresh editor boots with — mirrors ccstatusline's own out-of-the-box
// config (its SettingsSchema `lines` default): line 1 shows model · context-length ·
// git-branch · git-changes joined by separators, lines 2-3 start empty. IDs are
// freshly minted (the app keys everything by uuid). No explicit `color` is set:
// ccstatusline's default colors ARE each widget's own default, which rendering
// already falls back to — so the preview looks identical while the Inspector shows
// "default" (not a hard-coded name) and the exported JSON stays minimal.
// `emptyConfig()` stays the truly-blank baseline the "clear" button resets to.
export function defaultConfig(): CcStatusConfig {
  const cfg = emptyConfig();
  cfg.lines[0] = [
    { id: uuid(), type: 'model' },
    { id: uuid(), type: 'separator' },
    { id: uuid(), type: 'context-length' },
    { id: uuid(), type: 'separator' },
    { id: uuid(), type: 'git-branch' },
    { id: uuid(), type: 'separator' },
    { id: uuid(), type: 'git-changes' }
  ];
  return cfg;
}
