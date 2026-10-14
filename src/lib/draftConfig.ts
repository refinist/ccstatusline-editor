import { isCcStatusConfig } from '@/lib/shareConfig';
import { CONFIG_VERSION, emptyConfig, type CcStatusConfig } from '@/widgets';

// One autosaved editor draft. Share links, templates, clears, imports, and
// ordinary edits all end up in the config store; this mirrors that store into
// localStorage so a refresh reopens the same config.
//
// A draft is restored only when its `version` equals CONFIG_VERSION. Anything
// else is removed and the editor boots on the factory preset. Old shapes are
// not migrated here — JSON import and share links still go through migrateConfig.

export const DRAFT_STORAGE_KEY = 'ccse-draft';

function storage(): Storage | null {
  try {
    const candidate = globalThis.localStorage;
    if (!candidate || typeof candidate.getItem !== 'function') return null;
    return candidate;
  } catch {
    // Node tests, or a browser that blocks storage access.
    return null;
  }
}

function removeDraft(store: Storage) {
  try {
    store.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Ignore a storage that rejects the delete; the caller still boots fresh.
  }
}

/** Fill fields the UI reads unconditionally, without migrating an older schema. */
function withDefaults(next: CcStatusConfig): CcStatusConfig {
  const defaults = emptyConfig();
  return {
    ...defaults,
    ...next,
    version: CONFIG_VERSION,
    powerline: { ...defaults.powerline, ...next.powerline }
  };
}

/** The saved draft when it matches the current schema; otherwise null.
 *  A present but unusable value is removed so the next visit starts clean. */
export function readDraft(): CcStatusConfig | null {
  const store = storage();
  if (!store) return null;
  let raw: string | null;
  try {
    raw = store.getItem(DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw == null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    removeDraft(store);
    return null;
  }
  if (!isCcStatusConfig(parsed) || parsed.version !== CONFIG_VERSION) {
    removeDraft(store);
    return null;
  }
  return withDefaults(parsed);
}

export function writeDraft(config: CcStatusConfig): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(DRAFT_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Quota or disabled storage. The in-memory edit still stands.
  }
}
