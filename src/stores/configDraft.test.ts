import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_STORAGE_KEY } from '@/lib/draftConfig';
import { useConfigStore } from '@/stores/config';
import {
  CONFIG_VERSION,
  defaultConfig,
  emptyConfig,
  type CcStatusConfig
} from '@/widgets';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: key => (map.has(key) ? map.get(key)! : null),
    key: index => [...map.keys()][index] ?? null,
    removeItem: key => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, String(value));
    }
  };
}

function saved(): CcStatusConfig | null {
  const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as CcStatusConfig) : null;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  setActivePinia(createPinia());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('config draft persistence', () => {
  it('boots from a draft whose version matches', () => {
    const draft = emptyConfig();
    draft.lines = [[{ id: 'kept', type: 'version' }], [], []];
    draft.globalBold = true;
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));

    const store = useConfigStore();
    expect(store.config.lines[0]?.[0]?.id).toBe('kept');
    expect(store.config.globalBold).toBe(true);
    expect(store.canUndo).toBe(false);
  });

  it('drops a different-version draft and boots the factory preset', () => {
    const old = emptyConfig();
    old.version = CONFIG_VERSION - 1;
    old.lines = [[{ id: 'old', type: 'model' }]];
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(old));

    const store = useConfigStore();
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    expect(store.config.lines.map(line => line.map(w => w.type))).toEqual(
      defaultConfig().lines.map(line => line.map(w => w.type))
    );
    expect(store.config.lines.flat().some(w => w.id === 'old')).toBe(false);
  });

  it('writes edits, template/import replacements, and clears back to the draft', () => {
    const store = useConfigStore();
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

    store.updateConfig({ globalBold: true });
    expect(saved()?.globalBold).toBe(true);
    expect(saved()?.version).toBe(CONFIG_VERSION);

    const imported: CcStatusConfig = {
      ...emptyConfig(),
      version: 3,
      lines: [[{ id: 'from-share', type: 'model' }], [], []]
    };
    store.loadConfig(imported);
    expect(saved()?.version).toBe(CONFIG_VERSION);
    expect(saved()?.lines[0]?.[0]?.id).toBe('from-share');

    store.reset();
    expect(saved()?.lines).toEqual([[], [], []]);
    expect(saved()?.version).toBe(CONFIG_VERSION);
  });
});
