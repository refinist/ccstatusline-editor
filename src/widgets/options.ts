// Declarative per-widget capability table, derived from a full audit of
// ccstatusline v2.2.23 widget sources plus the v2.2.24 widget additions. Each
// widget's *type-specific* operations
// (the things the TUI exposes as per-widget hotkeys / sub-editors) are described
// here as control descriptors, so the Inspector renders one data-driven panel
// for all 86 non-layout widgets instead of 86 hand-written forms.
//
// Universal operations (color / background / bold / dim / rawValue / merge /
// clone / delete) are NOT listed here — the Inspector renders those for every
// widget. This table is only the "specific" group.

import type { Widget } from '@/widgets';

export type WoControl = 'toggle' | 'enum' | 'text' | 'number';

/** Top-level Widget fields an option may bind to (vs. a metadata.* key). */
type WoField =
  | 'commandPath'
  | 'customText'
  | 'customSymbol'
  | 'character'
  | 'maxWidth'
  | 'timeout'
  | 'preserveColors'
  | 'hide';

export interface WoEnumOption {
  value: string;
  labelKey: string;
}

export interface WidgetOption {
  /** i18n label key suffix → t(`wopt.${id}`). */
  id: string;
  control: WoControl;
  /** Bind to a top-level Widget field… */
  field?: WoField;
  /** …or to metadata[metaKey] (stored as strings; toggles use 'true'). */
  metaKey?: string;
  /** Enum entries. Inspector renders them as a button group (≤4) or a dropdown (≥5). */
  options?: WoEnumOption[];
  /** For enum controls: the value meaning "default" (stored by deleting the key). */
  defaultValue?: string;
  /** Number bounds. */
  min?: number;
  max?: number;
  /**
   * For number controls: hard-clamp the written value into [min,max] instead
   * of just using them as soft HTML input hints. Only set this where
   * ccstatusline itself clamps rather than rejects — e.g. the speed widgets'
   * windowSeconds, which ccstatusline clamps to 0-120 on both read and write
   * (clampSpeedWindowSeconds). Most other bounded numbers (segments,
   * listLimit) instead treat out-of-range input as absent/invalid and clear
   * the key, so leave this unset for those.
   */
  clamp?: boolean;
  /**
   * For number controls: a value that isn't a positive integer (≤0, so no
   * `min` should be declared alongside this — a floor would stop the
   * component from ever emitting a non-positive value to clear against)
   * deletes the key instead of being written, matching ccstatusline's own
   * `>0` guard used by segments/listLimit/maxWidth/timeout (`parseInt(...);
   * if (!isNaN(n) && n > 0) set else delete`). This is the opposite shape
   * from `clamp`: reject-and-clear rather than pin-to-boundary.
   */
  positiveOnly?: boolean;
  /** Placeholder i18n key for text/number inputs. */
  placeholderKey?: string;
  /** Text only: keep an explicit empty string instead of deleting the key. */
  preserveEmpty?: boolean;
  /** When enabling this toggle / setting this value, also clear these metadata keys. */
  clearsMeta?: string[];
  /**
   * For enum controls only: overrides the "when to clear" predicate used by
   * `clearsMeta`. Normally clearsMeta fires when a non-default value is picked
   * (right for options like compaction-counter's format, where the default IS
   * the value that keeps the sibling key meaningful). Some enums need the
   * opposite shape instead — e.g. skills' `mode` must clear `listLimit`
   * whenever the target ISN'T 'list', regardless of which value is the
   * schema-default (ccstatusline's cycle-mode does exactly this). Set this to
   * that one "keep" value to get that behavior.
   */
  clearsMetaExceptValue?: string;
  /**
   * Toggle-off behavior. ccstatusline's shared `toggleMetadataFlag` helper —
   * used by most of its toggles — writes the literal string 'false' on off
   * (checks are `=== 'true'`, so this is render-equivalent to deleting the
   * key). A handful of widgets have bespoke toggle logic that deletes the key
   * instead (current-working-dir's abbreviateHome/fishStyle, every nerdFont
   * toggle, git-branch's own linkToRepo). Default here (false/undefined)
   * writes 'false' to match the common case; set this to delete instead.
   */
  deleteOnOff?: boolean;
  /**
   * A metadata key ccstatusline still reads as a fallback when this option's
   * OWN metaKey is absent (pre-migration configs) — e.g. git-branch's
   * `linkToRepo` falls back to the legacy `linkToGitHub`, and git-root-dir's
   * `linkToIDE` falls back to `linkToCursor`. Reading prefers the new key
   * whenever it's present at all (even 'false'); only true absence falls
   * back. Any write through this option clears the legacy key (ccstatusline
   * migrates on every edit, regardless of the resulting value).
   */
  legacyMetaKey?: string;
  /** Enum only: the effective value implied when `legacyMetaKey` is 'true' and this option's own metaKey is unset. */
  legacyValue?: string;
  /** Hide the control unless this predicate holds (for conditional options). */
  showIf?: (w: Widget) => boolean;
  /** Enum only: always render as a dropdown, even when the option count would
   *  fit a button group — keeps one option family (e.g. the bar "display"
   *  enums) presented the same way across widgets regardless of count. */
  select?: boolean;
}

// ── shared enum sets ───────────────────────────────────────────────────────
const O = (value: string, labelKey: string): WoEnumOption => ({
  value,
  labelKey
});

const BARS = [
  O('progress', 'wopt.opt.longBar'),
  O('progress-short', 'wopt.opt.medBar'),
  O('slider', 'wopt.opt.shortBar'),
  O('slider-only', 'wopt.opt.shortBarOnly')
];
const DISPLAY_USAGE_PCT = [O('', 'wopt.opt.percent'), ...BARS];
const DISPLAY_TIMER = [O('time', 'wopt.opt.timeText'), ...BARS];
const DISPLAY_CTX_BAR = BARS;
const DISPLAY_CTX_SLIDER = [
  O('', 'wopt.opt.number'),
  O('slider', 'wopt.opt.shortBar'),
  O('slider-only', 'wopt.opt.shortBarOnly')
];

const VIM_FORMAT = [
  O('icon-dash-letter', 'wopt.opt.iconDashLetter'),
  O('icon-letter', 'wopt.opt.iconLetter'),
  O('icon', 'wopt.opt.icon'),
  O('letter', 'wopt.opt.letter'),
  O('word', 'wopt.opt.word')
];
const STATUS_FORMAT = [
  O('icon', 'wopt.opt.icon'),
  O('icon-text', 'wopt.opt.iconText'),
  O('text', 'wopt.opt.text'),
  O('word', 'wopt.opt.word')
];
const SANDBOX_FORMAT = [
  O('glyph', 'wopt.opt.glyph'),
  O('text', 'wopt.opt.text'),
  O('word', 'wopt.opt.word')
];
const CACHE_TTL = [
  O('300', 'wopt.opt.fiveMinutes'),
  O('3600', 'wopt.opt.oneHour')
];
// remote-control-status has two extra format values that voice-status does NOT:
// its FORMATS enum is icon / icon-text / text / word / label-check / label-mark.
const REMOTE_STATUS_FORMAT = [
  ...STATUS_FORMAT,
  O('label-check', 'wopt.opt.labelCheck'),
  O('label-mark', 'wopt.opt.labelMark')
];
const COMPACTION_FORMAT = [
  O('icon-space-number', 'wopt.opt.iconNumber'),
  O('text-and-number', 'wopt.opt.textNumber'),
  O('number', 'wopt.opt.numberOnly')
];
// compaction-counter metric selector: 'count' keeps the composite display; the
// others emit that single value as a bare number for composing custom layouts.
const COMPACTION_METRIC = [
  O('count', 'wopt.opt.metricCount'),
  O('auto', 'wopt.opt.metricAuto'),
  O('manual', 'wopt.opt.metricManual'),
  O('unknown', 'wopt.opt.metricUnknown'),
  O('reclaimed', 'wopt.opt.metricReclaimed')
];
const SKILLS_MODE = [
  O('current', 'wopt.opt.lastUsed'),
  O('count', 'wopt.opt.totalCount'),
  O('list', 'wopt.opt.uniqueList')
];
const IDE_LINK = [
  O('', 'wopt.opt.none'),
  O('vscode', 'wopt.opt.vscode'),
  O('cursor', 'wopt.opt.cursor')
];
const SEPARATOR_CHARS = [
  O('|', 'wopt.opt.pipe'),
  O('-', 'wopt.opt.dash'),
  O(',', 'wopt.opt.comma'),
  O(' ', 'wopt.opt.space')
];

// ── predicates ─────────────────────────────────────────────────────────────
const isBar = (w: Widget) => {
  const d = w.metadata?.display;
  return (
    d === 'progress' ||
    d === 'progress-short' ||
    d === 'slider' ||
    d === 'slider-only'
  );
};
const isTimeMode = (w: Widget) => !isBar(w);
const metaOn = (k: string) => (w: Widget) => w.metadata?.[k] === 'true';
// compaction-counter getMetric: anything but a valid sub-metric means 'count'.
const isCompactionCount = (w: Widget) => {
  const m = w.metadata?.metric;
  return !(
    m === 'auto' ||
    m === 'manual' ||
    m === 'unknown' ||
    m === 'reclaimed'
  );
};

// ── option builders ────────────────────────────────────────────────────────
const toggleMeta = (
  id: string,
  metaKey: string,
  extra: Partial<WidgetOption> = {}
): WidgetOption => ({ id, control: 'toggle', metaKey, ...extra });
const hideNoGit = (): WidgetOption => toggleMeta('hideNoGit', 'hideNoGit');
const hideNoJj = (): WidgetOption => toggleMeta('hideNoJj', 'hideNoJj');
const remoteOpts = (): WidgetOption[] => [
  toggleMeta('hideNoRemote', 'hideNoRemote'),
  toggleMeta('linkToRepo', 'linkToRepo')
];
/** Single-symbol glyph override → stored on `item.character` (empty = default). */
const glyph = (): WidgetOption => ({
  id: 'glyph',
  control: 'text',
  field: 'character',
  placeholderKey: 'wopt.ph.default'
});
const symbolSlot = (id: string, metaKey: string): WidgetOption => ({
  id,
  control: 'text',
  metaKey,
  preserveEmpty: true,
  placeholderKey: 'wopt.ph.default'
});
/** Truncate the widget's visible text to N chars (ccstatusline applyMaxWidth). */
const maxWidth = (): WidgetOption => ({
  id: 'maxWidth',
  control: 'number',
  field: 'maxWidth',
  positiveOnly: true,
  placeholderKey: 'wopt.ph.noLimit'
});

// Usage-percentage family: bar display + used/remaining direction. Since
// v2.2.23 `invert` is a direction toggle that also flips the plain percent
// text (renderedPercent), so it's available in every display mode — it reuses
// the context-percentage "Show remaining" label. `cursor` is a real control
// for session/weekly widgets, but extra-usage-utilization's render ignores it
// (dead metadata), so that one opts out via usagePct({ cursor: false }).
const usagePct = (opts: { cursor?: boolean } = {}): WidgetOption[] => {
  const list: WidgetOption[] = [
    {
      id: 'display',
      control: 'enum',
      metaKey: 'display',
      options: DISPLAY_USAGE_PCT,
      defaultValue: ''
    },
    { id: 'inverse', control: 'toggle', metaKey: 'invert' }
  ];
  if (opts.cursor !== false)
    list.push({
      id: 'cursor',
      control: 'toggle',
      metaKey: 'cursor',
      showIf: isBar
    });
  return list;
};

// Timer family (block / reset / weekly-reset). Mirrors ccstatusline getUsageTimerCustomKeybinds:
//   · display / invert(bar) / compact(time) — shared by all three timers
//   · NO cursor — cursor is percent-family only; all three timers call makeSliderBar single-arg
//   · absolute(Timestamp) + hour12 — only the date-capable timers (reset / weekly), gated by opts.date
//   · timezone / locale — only meaningful in absolute/date mode (showIf isTimeMode && absolute)
//   · hours(-only) — only when NOT in absolute/date mode (showIf isTimeMode && !absolute)
const timer = (
  opts: {
    date?: boolean;
    weekday?: boolean;
    hours?: boolean;
    zoneLocale?: boolean;
  } = {}
): WidgetOption[] => {
  const list: WidgetOption[] = [
    {
      id: 'display',
      control: 'enum',
      metaKey: 'display',
      options: DISPLAY_TIMER,
      defaultValue: 'time'
    },
    { id: 'invert', control: 'toggle', metaKey: 'invert', showIf: isBar },
    { id: 'compact', control: 'toggle', metaKey: 'compact', showIf: isTimeMode }
  ];
  if (opts.date) {
    list.push({
      id: 'absolute',
      control: 'toggle',
      metaKey: 'absolute',
      showIf: isTimeMode
    });
    list.push({
      id: 'hour12',
      control: 'toggle',
      metaKey: 'hour12',
      showIf: w => isTimeMode(w) && metaOn('absolute')(w)
    });
  }
  if (opts.weekday)
    list.push({
      id: 'weekday',
      control: 'toggle',
      metaKey: 'weekday',
      showIf: w => isTimeMode(w) && metaOn('absolute')(w)
    });
  if (opts.hours)
    list.push({
      id: 'hours',
      control: 'toggle',
      metaKey: 'hours',
      showIf: w => isTimeMode(w) && !metaOn('absolute')(w)
    });
  if (opts.zoneLocale !== false) {
    list.push({
      id: 'timezone',
      control: 'text',
      metaKey: 'timezone',
      placeholderKey: 'wopt.ph.timezone',
      showIf: w => isTimeMode(w) && metaOn('absolute')(w)
    });
    list.push({
      id: 'locale',
      control: 'text',
      metaKey: 'locale',
      placeholderKey: 'wopt.ph.locale',
      showIf: w => isTimeMode(w) && metaOn('absolute')(w)
    });
  }
  return list;
};

const formatNerd = (
  formatOptions: WoEnumOption[],
  defaultFormat: string
): WidgetOption[] => [
  {
    id: 'format',
    control: 'enum',
    metaKey: 'format',
    options: formatOptions,
    defaultValue: defaultFormat,
    // The format family's counts straddle ENUM_INLINE_MAX (vim 5 / status 4 /
    // remote 6) — force the dropdown so all three widgets present the same way.
    select: true
  },
  { id: 'nerdFont', control: 'toggle', metaKey: 'nerdFont', deleteOnOff: true }
];

// ── the table ──────────────────────────────────────────────────────────────
export const WIDGET_OPTIONS: Record<string, WidgetOption[]> = {
  // Core
  'vim-mode': formatNerd(VIM_FORMAT, 'icon-dash-letter'),
  'voice-status': formatNerd(STATUS_FORMAT, 'icon'),
  'remote-control-status': formatNerd(REMOTE_STATUS_FORMAT, 'icon'),
  'sandbox-status': [
    {
      id: 'format',
      control: 'enum',
      metaKey: 'format',
      options: SANDBOX_FORMAT,
      defaultValue: 'glyph',
      clearsMeta: ['nerdFont']
    },
    {
      id: 'nerdFont',
      control: 'toggle',
      metaKey: 'nerdFont',
      deleteOnOff: true,
      showIf: w => (w.metadata?.format ?? 'glyph') === 'glyph'
    }
  ],

  // Git — single-symbol glyph + hide-no-git
  'git-branch': [
    hideNoGit(),
    toggleMeta('linkToRepo', 'linkToRepo', {
      deleteOnOff: true,
      legacyMetaKey: 'linkToGitHub'
    }),
    glyph(),
    maxWidth()
  ],
  'git-changes': [hideNoGit()],
  'git-insertions': [hideNoGit()],
  'git-deletions': [hideNoGit()],
  'git-staged-files': [hideNoGit()],
  'git-unstaged-files': [hideNoGit()],
  'git-untracked-files': [hideNoGit()],
  'git-clean-status': [hideNoGit()],
  'git-sha': [hideNoGit()],
  'git-conflicts': [hideNoGit(), glyph()],
  'git-staged': [hideNoGit(), glyph()],
  'git-unstaged': [hideNoGit(), glyph()],
  'git-untracked': [hideNoGit(), glyph()],
  'git-worktree': [hideNoGit(), glyph()],
  'worktree-mode': [glyph()],
  'git-ahead-behind': [
    hideNoGit(),
    symbolSlot('symbolAhead', 'symbolAhead'),
    symbolSlot('symbolBehind', 'symbolBehind')
  ],
  'git-status': [
    hideNoGit(),
    symbolSlot('symbolConflicts', 'symbolConflicts'),
    symbolSlot('symbolStaged', 'symbolStaged'),
    symbolSlot('symbolUnstaged', 'symbolUnstaged'),
    symbolSlot('symbolUntracked', 'symbolUntracked')
  ],
  'git-root-dir': [
    hideNoGit(),
    {
      id: 'ideLink',
      control: 'enum',
      metaKey: 'linkToIDE',
      options: IDE_LINK,
      defaultValue: '',
      legacyMetaKey: 'linkToCursor',
      legacyValue: 'cursor'
    },
    maxWidth()
  ],
  'git-review': [
    hideNoGit(),
    toggleMeta('hideStatus', 'hideStatus'),
    toggleMeta('hideTitle', 'hideTitle')
  ],
  'git-ci-status': [hideNoGit()],
  'git-is-fork': [toggleMeta('hideWhenNotFork', 'hideWhenNotFork')],
  // Git remotes
  'git-origin-owner': remoteOpts(),
  'git-origin-repo': remoteOpts(),
  'git-origin-owner-repo': [
    ...remoteOpts(),
    toggleMeta('ownerOnlyWhenFork', 'ownerOnlyWhenFork')
  ],
  'git-upstream-owner': remoteOpts(),
  'git-upstream-repo': remoteOpts(),
  'git-upstream-owner-repo': remoteOpts(),

  // Jujutsu
  'jj-bookmarks': [hideNoJj(), glyph()],
  'jj-workspace': [hideNoJj(), glyph()],
  'jj-root-dir': [hideNoJj()],
  'jj-changes': [hideNoJj()],
  'jj-insertions': [hideNoJj()],
  'jj-deletions': [hideNoJj()],
  'jj-description': [hideNoJj()],
  'jj-revision': [hideNoJj()],

  // Environment
  'current-working-dir': [
    {
      id: 'abbreviateHome',
      control: 'toggle',
      metaKey: 'abbreviateHome',
      clearsMeta: ['fishStyle'],
      deleteOnOff: true
    },
    {
      id: 'fishStyle',
      control: 'toggle',
      metaKey: 'fishStyle',
      clearsMeta: ['segments', 'abbreviateHome'],
      deleteOnOff: true
    },
    {
      id: 'segments',
      control: 'number',
      metaKey: 'segments',
      positiveOnly: true,
      placeholderKey: 'wopt.ph.full'
    },
    glyph()
  ],

  // Cache
  'cache-hit-rate': [
    toggleMeta('cacheSession', 'cacheScopeSession'),
    toggleMeta('hideWhenEmpty', 'hideWhenEmpty')
  ],
  'cache-read': [
    toggleMeta('cacheSession', 'cacheScopeSession'),
    toggleMeta('hideWhenEmpty', 'hideWhenEmpty')
  ],
  'cache-write': [
    toggleMeta('cacheSession', 'cacheScopeSession'),
    toggleMeta('hideWhenEmpty', 'hideWhenEmpty')
  ],
  'cache-timer': [
    {
      id: 'ttl',
      control: 'enum',
      metaKey: 'ttlSeconds',
      options: CACHE_TTL,
      defaultValue: '300'
    },
    toggleMeta('hideWhenEmpty', 'hideWhenEmpty'),
    symbolSlot('symbolHot', 'symbolHot'),
    symbolSlot('symbolFresh', 'symbolFresh'),
    symbolSlot('symbolDraining', 'symbolDraining'),
    symbolSlot('symbolUrgent', 'symbolUrgent'),
    symbolSlot('symbolCold', 'symbolCold')
  ],

  // Token Speed
  'input-speed': [
    {
      id: 'window',
      control: 'number',
      metaKey: 'windowSeconds',
      min: 0,
      max: 120,
      clamp: true,
      placeholderKey: 'wopt.ph.sessionAvg'
    }
  ],
  'output-speed': [
    {
      id: 'window',
      control: 'number',
      metaKey: 'windowSeconds',
      min: 0,
      max: 120,
      clamp: true,
      placeholderKey: 'wopt.ph.sessionAvg'
    }
  ],
  'total-speed': [
    {
      id: 'window',
      control: 'number',
      metaKey: 'windowSeconds',
      min: 0,
      max: 120,
      clamp: true,
      placeholderKey: 'wopt.ph.sessionAvg'
    }
  ],

  // Context
  'context-bar': [
    {
      id: 'display',
      control: 'enum',
      metaKey: 'display',
      options: DISPLAY_CTX_BAR,
      defaultValue: 'progress-short',
      select: true
    }
  ],
  'context-percentage': [
    toggleMeta('inverse', 'inverse'),
    {
      id: 'contextDisplay',
      control: 'enum',
      metaKey: 'display',
      options: DISPLAY_CTX_SLIDER,
      defaultValue: '',
      select: true
    }
  ],
  'context-percentage-usable': [
    toggleMeta('inverse', 'inverse'),
    {
      id: 'contextDisplay',
      control: 'enum',
      metaKey: 'display',
      options: DISPLAY_CTX_SLIDER,
      defaultValue: '',
      select: true
    }
  ],
  'compaction-counter': [
    // metric ≠ count switches the widget to a single bare value; the composite
    // display's own controls (format / nerd font / trigger split / reclaimed)
    // only apply to 'count', so they hide for sub-metrics — mirroring the
    // TUI's keybind set, which shrinks to (v)alue + (h)ide-zero there. The
    // metadata itself is kept (ccstatusline's cycle-metric doesn't clear it),
    // so switching back to 'count' restores the previous composite setup.
    {
      id: 'metric',
      control: 'enum',
      metaKey: 'metric',
      options: COMPACTION_METRIC,
      defaultValue: 'count',
      select: true
    },
    {
      id: 'format',
      control: 'enum',
      metaKey: 'format',
      options: COMPACTION_FORMAT,
      defaultValue: 'icon-space-number',
      clearsMeta: ['nerdFont'],
      showIf: isCompactionCount
    },
    toggleMeta('nerdFont', 'nerdFont', {
      showIf: w =>
        isCompactionCount(w) &&
        (w.metadata?.format ?? 'icon-space-number') === 'icon-space-number',
      deleteOnOff: true
    }),
    toggleMeta('showTriggers', 'showTriggers', { showIf: isCompactionCount }),
    toggleMeta('showReclaimed', 'showReclaimed', {
      showIf: isCompactionCount
    }),
    {
      ...symbolSlot('symbolReclaimed', 'symbolReclaimed'),
      showIf: isCompactionCount
    },
    toggleMeta('hideZero', 'hideZero')
  ],

  // Session
  skills: [
    // ccstatusline's cycle-mode strips listLimit whenever the target isn't 'list'
    // (regardless of which mode is the schema-default) — clearsMetaExceptValue
    // expresses that "keep it only for this one value" shape.
    {
      id: 'mode',
      control: 'enum',
      metaKey: 'mode',
      options: SKILLS_MODE,
      defaultValue: 'current',
      clearsMeta: ['listLimit'],
      clearsMetaExceptValue: 'list'
    },
    {
      id: 'listLimit',
      control: 'number',
      metaKey: 'listLimit',
      positiveOnly: true,
      placeholderKey: 'wopt.ph.noLimit',
      showIf: w => w.metadata?.mode === 'list'
    },
    toggleMeta('hideWhenEmpty', 'hideWhenEmpty')
  ],

  // Usage
  'session-usage': usagePct(),
  'weekly-usage': usagePct(),
  'weekly-sonnet-usage': usagePct(),
  'weekly-opus-usage': usagePct(),
  'extra-usage-utilization': [
    ...usagePct({ cursor: false }),
    toggleMeta('hideIfDisabled', 'hideIfDisabled')
  ],
  'extra-usage-remaining': [toggleMeta('hideIfDisabled', 'hideIfDisabled')],
  'extra-usage-used': [toggleMeta('hideIfDisabled', 'hideIfDisabled')],
  'block-timer': timer({ zoneLocale: false }),
  'reset-timer': timer({ date: true }),
  'weekly-reset-timer': timer({ date: true, weekday: true, hours: true }),

  // Custom
  'custom-text': [
    {
      id: 'customText',
      control: 'text',
      field: 'customText',
      placeholderKey: 'wopt.ph.text'
    }
  ],
  'custom-symbol': [
    {
      id: 'customSymbol',
      control: 'text',
      field: 'customSymbol',
      placeholderKey: 'wopt.ph.symbol'
    }
  ],
  'custom-command': [
    {
      id: 'commandPath',
      control: 'text',
      field: 'commandPath',
      placeholderKey: 'wopt.ph.command'
    },
    {
      id: 'maxWidth',
      control: 'number',
      field: 'maxWidth',
      positiveOnly: true,
      placeholderKey: 'wopt.ph.noLimit'
    },
    {
      id: 'timeout',
      control: 'number',
      field: 'timeout',
      positiveOnly: true,
      placeholderKey: 'wopt.ph.timeout'
    },
    { id: 'preserveColors', control: 'toggle', field: 'preserveColors' }
  ],
  link: [
    {
      id: 'url',
      control: 'text',
      metaKey: 'url',
      placeholderKey: 'wopt.ph.url'
    },
    {
      id: 'linkText',
      control: 'text',
      metaKey: 'text',
      placeholderKey: 'wopt.ph.linkText'
    }
  ],

  // Layout
  separator: [
    {
      id: 'separatorChar',
      control: 'enum',
      field: 'character',
      options: SEPARATOR_CHARS,
      defaultValue: '|'
    }
  ]
};

// Widgets whose render() ignores rawValue (the TUI hides the (r) hotkey for them).
const NO_RAW = new Set([
  'git-changes',
  'git-deletions',
  'git-insertions',
  'git-status',
  'git-sha',
  'git-root-dir',
  'git-origin-owner',
  'git-origin-repo',
  'git-origin-owner-repo',
  'git-upstream-owner',
  'git-upstream-repo',
  'git-upstream-owner-repo',
  'worktree-branch',
  'worktree-name',
  'worktree-original-branch',
  'jj-changes',
  'jj-deletions',
  'jj-insertions',
  'jj-description',
  'jj-root-dir',
  'compaction-counter',
  'vim-mode',
  'custom-text',
  'custom-symbol',
  'custom-command',
  'separator',
  'flex-separator'
]);

export function supportsRawValue(type: string): boolean {
  return !NO_RAW.has(type);
}

// Foreground/background color pickers apply to everything except flex-separator
// and custom-command while it preserves the command's own ANSI colors.
export function supportsColors(w: Widget): boolean {
  if (w.type === 'flex-separator') return false;
  if (w.type === 'custom-command' && w.preserveColors) return false;
  return true;
}

export function optionsFor(type: string): WidgetOption[] {
  return WIDGET_OPTIONS[type] ?? [];
}
