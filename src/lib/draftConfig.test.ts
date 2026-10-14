import { afterEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_STORAGE_KEY, readDraft, writeDraft } from '@/lib/draftConfig';
import { CONFIG_VERSION, emptyConfig } from '@/widgets';

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readDraft / writeDraft', () => {
  it('round-trips a current-schema config and backfills missing defaults', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const draft = emptyConfig();
    draft.lines = [[{ id: 'kept', type: 'version' }]];
    draft.globalBold = true;
    writeDraft(draft);

    const restored = readDraft();
    expect(restored?.version).toBe(CONFIG_VERSION);
    expect(restored?.lines[0]?.[0]?.id).toBe('kept');
    expect(restored?.globalBold).toBe(true);
    expect(restored?.powerline).toEqual(emptyConfig().powerline);
  });

  it('removes a draft whose version does not match and returns null', () => {
    const store = memoryStorage();
    vi.stubGlobal('localStorage', store);
    const old = emptyConfig();
    old.version = CONFIG_VERSION - 1;
    old.lines = [[{ id: 'old', type: 'model' }]];
    store.setItem(DRAFT_STORAGE_KEY, JSON.stringify(old));

    expect(readDraft()).toBeNull();
    expect(store.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('removes a newer draft instead of loading it', () => {
    const store = memoryStorage();
    vi.stubGlobal('localStorage', store);
    store.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ ...emptyConfig(), version: CONFIG_VERSION + 1 })
    );

    expect(readDraft()).toBeNull();
    expect(store.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('removes corrupt JSON and a value that is not a config', () => {
    const store = memoryStorage();
    vi.stubGlobal('localStorage', store);
    store.setItem(DRAFT_STORAGE_KEY, '{');
    expect(readDraft()).toBeNull();
    expect(store.getItem(DRAFT_STORAGE_KEY)).toBeNull();

    store.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ version: CONFIG_VERSION })
    );
    expect(readDraft()).toBeNull();
    expect(store.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('returns null and does not throw when storage is blocked', () => {
    const blocked: Storage = {
      get length() {
        return 0;
      },
      clear: () => {},
      getItem: () => {
        throw new Error('blocked');
      },
      key: () => null,
      removeItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      }
    };
    vi.stubGlobal('localStorage', blocked);
    expect(readDraft()).toBeNull();
    expect(() => writeDraft(emptyConfig())).not.toThrow();
  });

  it('returns null when localStorage cannot be read', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readDraft()).toBeNull();
    expect(() => writeDraft(emptyConfig())).not.toThrow();
  });
});
