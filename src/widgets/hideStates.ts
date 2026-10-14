// ccstatusline v2.2.32 hideable states (widgets/shared/hideable.ts) and the
// v3 → v4 migration that folds the old per-widget flags into metadata.hide.

import type { Widget } from '@/widgets';

export interface HideState {
  key: string;
  /** i18n key under `wopt.hide.*`. */
  label: string;
  defaultEnabled?: boolean;
}

const noGit: HideState = { key: 'no-git', label: 'noGit' };
const noJj: HideState = { key: 'no-jj', label: 'noJj' };
const noRemote: HideState = { key: 'no-remote', label: 'noRemote' };
const noUpstream: HideState = { key: 'no-upstream', label: 'noUpstream' };
const notFork: HideState = { key: 'not-fork', label: 'notFork' };
const noData: HideState = { key: 'no-data', label: 'noData' };
const disabled: HideState = { key: 'disabled', label: 'disabled' };
const empty: HideState = { key: 'empty', label: 'empty' };
const zero: HideState = { key: 'zero', label: 'zero' };
const status: HideState = { key: 'status', label: 'status' };
const title: HideState = { key: 'title', label: 'title' };
const mergeTarget: HideState = {
  key: 'merge-target-hidden',
  label: 'mergeTarget'
};

function z(label: string): HideState {
  return { key: 'zero', label };
}

export const HIDE_STATES: Record<string, HideState[]> = {
  'git-branch': [noGit],
  'git-changes': [noGit, z('zeroChanges')],
  'git-insertions': [noGit, z('zeroInsertions')],
  'git-deletions': [noGit, z('zeroDeletions')],
  'git-staged-files': [noGit, z('zeroStagedFiles')],
  'git-unstaged-files': [noGit, z('zeroUnstagedFiles')],
  'git-untracked-files': [noGit, z('zeroUntrackedFiles')],
  'git-clean-status': [noGit],
  'git-root-dir': [noGit],
  'git-worktree': [noGit],
  'git-status': [noGit],
  'git-staged': [noGit],
  'git-unstaged': [noGit],
  'git-untracked': [noGit],
  'git-sha': [noGit],
  'git-ci-status': [noGit, { key: 'no-data', label: 'noChecks' }],
  'git-ahead-behind': [
    noGit,
    noUpstream,
    { key: 'zero', label: 'zeroAhead', defaultEnabled: true }
  ],
  'git-review': [noGit, { key: 'no-data', label: 'noPr' }, status, title],
  'git-pr': [noGit, { key: 'no-data', label: 'noPr' }, status, title],
  'git-conflicts': [noGit, z('zeroConflicts')],
  'git-origin-owner': [noRemote],
  'git-origin-repo': [noRemote],
  'git-origin-owner-repo': [noRemote],
  'git-upstream-owner': [noUpstream],
  'git-upstream-repo': [noUpstream],
  'git-upstream-owner-repo': [noUpstream],
  'git-is-fork': [notFork],
  'jj-bookmarks': [noJj],
  'jj-workspace': [noJj],
  'jj-root-dir': [noJj],
  'jj-changes': [noJj],
  'jj-insertions': [noJj],
  'jj-deletions': [noJj],
  'jj-description': [noJj],
  'jj-revision': [noJj],
  'compaction-counter': [zero],
  skills: [empty],
  'cache-read': [empty],
  'cache-write': [empty],
  'cache-hit-rate': [empty],
  'cache-timer': [empty],
  'extra-usage-utilization': [disabled, noData],
  'extra-usage-remaining': [disabled, noData],
  'extra-usage-used': [disabled, noData],
  'extra-usage-daily-budget': [disabled, noData],
  'input-speed': [{ key: 'no-data', label: 'noSpeed' }],
  'output-speed': [{ key: 'no-data', label: 'noSpeed' }],
  'total-speed': [{ key: 'no-data', label: 'noSpeed' }],
  'session-usage': [noData],
  'weekly-usage': [noData],
  'weekly-sonnet-usage': [noData],
  'weekly-opus-usage': [noData],
  'fable-weekly-usage': [noData],
  'block-timer': [{ key: 'no-data', label: 'noBlock' }],
  'reset-timer': [noData],
  'weekly-reset-timer': [noData],
  'tokens-input': [z('zeroTokens')],
  'tokens-output': [z('zeroTokens')],
  'tokens-cached': [z('zeroTokens')],
  'tokens-total': [z('zeroTokens')],
  'session-clock': [z('zeroClock')],
  'session-cost': [z('zeroCost')],
  'output-style': [{ key: 'default-value', label: 'defaultValue' }],
  'custom-text': [mergeTarget],
  'custom-symbol': [mergeTarget]
};

export function hideStatesFor(type: string): HideState[] {
  return HIDE_STATES[type] ?? [];
}

export function parseHideStates(value: string | undefined): string[] {
  if (value === undefined) return [];
  return value
    .split(',')
    .map(key => key.trim())
    .filter(key => key.length > 0);
}

export function isHidden(
  item: Widget,
  key: string,
  defaultEnabled = false
): boolean {
  const hideValue = item.metadata?.hide;
  if (hideValue === undefined) return defaultEnabled;
  return parseHideStates(hideValue).includes(key);
}

export function isStateHidden(item: Widget, state: HideState): boolean {
  return isHidden(item, state.key, state.defaultEnabled ?? false);
}

/** Write metadata.hide, omitting it when the set matches the widget defaults. */
export function withHideStates(item: Widget, enabledKeys: string[]): Widget {
  const states = hideStatesFor(item.type);
  const ordered = states
    .filter(state => enabledKeys.includes(state.key))
    .map(state => state.key);
  const defaults = states.filter(state => state.defaultEnabled).map(s => s.key);
  const matchesDefaults =
    ordered.length === defaults.length &&
    ordered.every(key => defaults.includes(key));
  const meta = { ...(item.metadata ?? {}) };
  for (const key of LEGACY_HIDE_KEYS) delete meta[key];
  delete meta.hide;
  if (!matchesDefaults) meta.hide = ordered.join(',');
  const next: Widget = { ...item };
  if (Object.keys(meta).length > 0) next.metadata = meta;
  else delete next.metadata;
  return next;
}

export function toggleHideState(
  item: Widget,
  key: string,
  on: boolean
): Widget {
  const states = hideStatesFor(item.type);
  const enabled = new Set(
    states.filter(state => isStateHidden(item, state)).map(state => state.key)
  );
  if (on) enabled.add(key);
  else enabled.delete(key);
  return withHideStates(item, [...enabled]);
}

// ── v3 → v4 ────────────────────────────────────────────────────────────────

interface HideFlagRule {
  legacy: Record<string, string[]>;
  stateOrder: string[];
  defaultEnabled?: string[];
}

const NO_GIT: HideFlagRule = {
  legacy: { hideNoGit: ['no-git'] },
  stateOrder: ['no-git']
};
const NO_GIT_ZERO: HideFlagRule = {
  legacy: { hideNoGit: ['no-git'] },
  stateOrder: ['no-git', 'zero']
};
const NO_GIT_NO_DATA: HideFlagRule = {
  legacy: { hideNoGit: ['no-git'] },
  stateOrder: ['no-git', 'no-data']
};
const NO_JJ: HideFlagRule = {
  legacy: { hideNoJj: ['no-jj'] },
  stateOrder: ['no-jj']
};
const NO_REMOTE: HideFlagRule = {
  legacy: { hideNoRemote: ['no-remote'] },
  stateOrder: ['no-remote']
};
const NO_UPSTREAM: HideFlagRule = {
  legacy: { hideNoRemote: ['no-upstream'] },
  stateOrder: ['no-upstream']
};
const GIT_REVIEW: HideFlagRule = {
  legacy: {
    hideNoGit: ['no-git', 'no-data'],
    hideStatus: ['status'],
    hideTitle: ['title']
  },
  stateOrder: ['no-git', 'no-data', 'status', 'title']
};
const EXTRA: HideFlagRule = {
  legacy: { hideIfDisabled: ['disabled'] },
  stateOrder: ['disabled', 'no-data']
};
const CACHE: HideFlagRule = {
  legacy: { hideWhenEmpty: ['empty'] },
  stateOrder: ['empty']
};

const V4_HIDE_FLAG_RULES: Record<string, HideFlagRule> = {
  'git-branch': NO_GIT,
  'git-changes': NO_GIT_ZERO,
  'git-insertions': NO_GIT_ZERO,
  'git-deletions': NO_GIT_ZERO,
  'git-staged-files': NO_GIT_ZERO,
  'git-unstaged-files': NO_GIT_ZERO,
  'git-untracked-files': NO_GIT_ZERO,
  'git-clean-status': NO_GIT,
  'git-root-dir': NO_GIT,
  'git-worktree': NO_GIT,
  'git-status': NO_GIT,
  'git-staged': NO_GIT,
  'git-unstaged': NO_GIT,
  'git-untracked': NO_GIT,
  'git-conflicts': NO_GIT_ZERO,
  'git-sha': NO_GIT,
  'git-ci-status': NO_GIT_NO_DATA,
  'git-ahead-behind': {
    legacy: { hideNoGit: ['no-git', 'no-upstream'] },
    stateOrder: ['no-git', 'no-upstream', 'zero'],
    defaultEnabled: ['zero']
  },
  'git-review': GIT_REVIEW,
  'git-pr': GIT_REVIEW,
  'git-origin-owner': NO_REMOTE,
  'git-origin-repo': NO_REMOTE,
  'git-origin-owner-repo': NO_REMOTE,
  'git-upstream-owner': NO_UPSTREAM,
  'git-upstream-repo': NO_UPSTREAM,
  'git-upstream-owner-repo': NO_UPSTREAM,
  'git-is-fork': {
    legacy: { hideWhenNotFork: ['not-fork'] },
    stateOrder: ['not-fork']
  },
  'jj-bookmarks': NO_JJ,
  'jj-workspace': NO_JJ,
  'jj-root-dir': NO_JJ,
  'jj-changes': NO_JJ,
  'jj-insertions': NO_JJ,
  'jj-deletions': NO_JJ,
  'jj-description': NO_JJ,
  'jj-revision': NO_JJ,
  'compaction-counter': {
    legacy: { hideZero: ['zero'] },
    stateOrder: ['zero']
  },
  skills: CACHE,
  'cache-read': CACHE,
  'cache-write': CACHE,
  'cache-hit-rate': CACHE,
  'cache-timer': CACHE,
  'extra-usage-utilization': EXTRA,
  'extra-usage-remaining': EXTRA,
  'extra-usage-used': EXTRA
};

const LEGACY_HIDE_KEYS = [
  'hideNoGit',
  'hideNoJj',
  'hideNoRemote',
  'hideZero',
  'hideWhenEmpty',
  'hideIfDisabled',
  'hideStatus',
  'hideTitle',
  'hideWhenNotFork'
];

function migrateItem(item: Widget): Widget {
  const raw = item as Widget & { hide?: unknown };
  let next: Widget = item;
  if (typeof raw.hide === 'boolean') {
    const rest = { ...raw };
    delete rest.hide;
    next = rest;
  }
  if (!next.metadata) return next;
  const rule = Object.hasOwn(V4_HIDE_FLAG_RULES, next.type)
    ? V4_HIDE_FLAG_RULES[next.type]
    : undefined;
  const metadata = next.metadata;
  const presentKeys = LEGACY_HIDE_KEYS.filter(key => key in metadata);
  const hasLegacyHiddenZero =
    next.type === 'git-conflicts' && metadata.zeroDisplay === 'hidden';
  if (!rule || (presentKeys.length === 0 && !hasLegacyHiddenZero)) {
    if (typeof raw.hide === 'boolean') return next;
    return item;
  }

  const writtenList =
    typeof metadata.hide === 'string' ? metadata.hide : undefined;
  const enabled = new Set<string>(
    writtenList === undefined ? (rule.defaultEnabled ?? []) : []
  );
  if (writtenList !== undefined) {
    for (const key of parseHideStates(writtenList)) enabled.add(key);
  }
  for (const key of presentKeys) {
    if (metadata[key] === 'true') {
      for (const state of rule.legacy[key] ?? []) enabled.add(state);
    }
  }
  if (hasLegacyHiddenZero) enabled.add('zero');

  const nextMeta: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (LEGACY_HIDE_KEYS.includes(key) || key === 'hide') continue;
    if (hasLegacyHiddenZero && key === 'zeroDisplay') continue;
    nextMeta[key] = value;
  }
  const ordered = rule.stateOrder.filter(state => enabled.has(state));
  const defaults = rule.defaultEnabled ?? [];
  const matchesDefaults =
    ordered.length === defaults.length &&
    ordered.every(state => defaults.includes(state));
  if (!matchesDefaults) nextMeta.hide = ordered.join(',');

  const migrated: Widget = { ...next };
  if (Object.keys(nextMeta).length > 0) migrated.metadata = nextMeta;
  else delete migrated.metadata;
  return migrated;
}

/** Lift a pre-v4 config onto schema v4. v4 configs are returned unchanged. */
export function migrateConfig<T extends { version?: unknown; lines?: unknown }>(
  config: T
): T {
  if (typeof config.version === 'number' && config.version >= 4) return config;
  const lines = Array.isArray(config.lines)
    ? config.lines.map(line =>
        Array.isArray(line)
          ? line.map(item =>
              item && typeof item === 'object'
                ? migrateItem(item as Widget)
                : item
            )
          : line
      )
    : config.lines;
  return { ...config, version: 4, lines };
}
