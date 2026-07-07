import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_CUSTOM_EVERY,
  MAX_POOL_THEMES,
  MAX_THEME_NAME
} from '@/lib/rotationBundle';
import { toEpochOrder } from '@/lib/weeklyPreset';
import { useRotationStore } from '@/stores/rotation';
import { defaultConfig, type CcStatusConfig } from '@/widgets';

function makeConfig(): CcStatusConfig {
  return defaultConfig();
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('pool basics', () => {
  it('addTheme deep-clones the config, so later mutations of the source never leak in', () => {
    const rot = useRotationStore();
    const cfg = makeConfig();
    expect(rot.addTheme('a', cfg)).toBe(true);
    cfg.lines[0].pop();
    expect(rot.themes[0].config.lines[0].length).toBeGreaterThan(
      cfg.lines[0].length
    );
  });

  it('addTheme rejects beyond MAX_POOL_THEMES and truncates long names', () => {
    const rot = useRotationStore();
    for (let i = 0; i < MAX_POOL_THEMES; i++) {
      expect(rot.addTheme(`t${i}`, makeConfig())).toBe(true);
    }
    expect(rot.isFull).toBe(true);
    expect(rot.addTheme('overflow', makeConfig())).toBe(false);

    setActivePinia(createPinia());
    const rot2 = useRotationStore();
    rot2.addTheme('x'.repeat(MAX_THEME_NAME + 10), makeConfig());
    expect(rot2.themes[0].name).toHaveLength(MAX_THEME_NAME);
  });

  it('renameTheme drops empty names (the CLI rejects nameless themes)', () => {
    const rot = useRotationStore();
    rot.addTheme('keep', makeConfig());
    expect(rot.renameTheme(0, '   ')).toBe('empty');
    expect(rot.themes[0].name).toBe('keep');
    expect(rot.renameTheme(0, 'next')).toBe('renamed');
    expect(rot.themes[0].name).toBe('next');
  });

  it("renameTheme rejects another theme's name, but allows re-committing your own", () => {
    const rot = useRotationStore();
    rot.addTheme('a', makeConfig());
    rot.addTheme('b', makeConfig());
    expect(rot.renameTheme(1, 'a')).toBe('duplicate');
    expect(rot.renameTheme(1, '  a  ')).toBe('duplicate');
    expect(rot.themes[1].name).toBe('b');
    // committing the unchanged name on itself is not a duplicate
    expect(rot.renameTheme(1, 'b')).toBe('renamed');
  });

  it('uniqueName suffixes taken names: base, base 2, base 3, …', () => {
    const rot = useRotationStore();
    expect(rot.uniqueName('theme')).toBe('theme');
    rot.addTheme('theme', makeConfig());
    expect(rot.uniqueName('theme')).toBe('theme 2');
    rot.addTheme('theme 2', makeConfig());
    expect(rot.uniqueName('theme')).toBe('theme 3');
  });

  it('canRotate turns true only once the pool holds at least two themes', () => {
    const rot = useRotationStore();
    expect(rot.canRotate).toBe(false);
    rot.addTheme('a', makeConfig());
    expect(rot.canRotate).toBe(false);
    rot.addTheme('b', makeConfig());
    expect(rot.canRotate).toBe(true);
    rot.removeTheme(0);
    expect(rot.canRotate).toBe(false);
  });
});

describe('editing session (live sync from the editor)', () => {
  it('beginEdit exposes the theme under edit; stopEdit clears it', () => {
    const rot = useRotationStore();
    rot.addTheme('a', makeConfig());
    rot.addTheme('b', makeConfig());
    rot.beginEdit(1);
    expect(rot.editingTheme?.name).toBe('b');
    rot.stopEdit();
    expect(rot.editingTheme).toBeNull();
  });

  it('beginEdit with an out-of-range index never opens a session', () => {
    const rot = useRotationStore();
    rot.addTheme('a', makeConfig());
    rot.beginEdit(5);
    expect(rot.editingTheme).toBeNull();
    rot.beginEdit(-1);
    expect(rot.editingTheme).toBeNull();
  });

  it('updateEditing writes a deep clone into the edited theme and keeps the session open', () => {
    const rot = useRotationStore();
    rot.addTheme('a', makeConfig());
    rot.beginEdit(0);
    const edited = makeConfig();
    edited.lines[0] = [];
    rot.updateEditing(edited);
    expect(rot.themes[0].config.lines[0]).toHaveLength(0);
    expect(rot.editingTheme?.name).toBe('a');
    // deep clone: mutating the synced source doesn't touch the pool
    edited.lines[0].push(makeConfig().lines[0][0]);
    expect(rot.themes[0].config.lines[0]).toHaveLength(0);
    // live sync: a second update lands too
    const again = makeConfig();
    rot.updateEditing(again);
    expect(rot.themes[0].config.lines[0]).toHaveLength(again.lines[0].length);
  });

  it('updateEditing without a live session is a no-op', () => {
    const rot = useRotationStore();
    rot.addTheme('a', makeConfig());
    const before = JSON.stringify(rot.themes);
    rot.updateEditing(makeConfig());
    expect(JSON.stringify(rot.themes)).toBe(before);
  });
});

describe('loadBundle (import a whole bundle, replacing the pool)', () => {
  it('replaces period, strategy, and themes wholesale', () => {
    const rot = useRotationStore();
    rot.addTheme('old', makeConfig());
    const result = rot.loadBundle({
      version: 1,
      period: 'week',
      strategy: 'random',
      themes: [
        { name: 'a', config: makeConfig() },
        { name: 'b', config: makeConfig() }
      ]
    });
    expect(result).toEqual({ loaded: 2, dropped: 0 });
    expect(rot.period).toBe('week');
    expect(rot.strategy).toBe('random');
    expect(rot.themes.map(t => t.name)).toEqual(['a', 'b']);
  });

  it('unfolds a custom interval back into the UI mode + inputs, clamping range', () => {
    const rot = useRotationStore();
    rot.loadBundle({
      version: 1,
      period: { every: 9999, unit: 'minute' },
      strategy: 'cycle',
      themes: []
    });
    expect(rot.period).toBe('custom');
    expect(rot.customEvery).toBe(MAX_CUSTOM_EVERY);
    expect(rot.customUnit).toBe('minute');
  });

  it('deep-clones configs, so mutating the source bundle never leaks in', () => {
    const rot = useRotationStore();
    const cfg = makeConfig();
    rot.loadBundle({
      version: 1,
      period: 'day',
      strategy: 'cycle',
      themes: [{ name: 'a', config: cfg }]
    });
    cfg.lines[0].pop();
    expect(rot.themes[0].config.lines[0].length).toBeGreaterThan(
      cfg.lines[0].length
    );
  });

  it('caps at MAX_POOL_THEMES and reports the dropped overflow', () => {
    const rot = useRotationStore();
    const themes = Array.from({ length: MAX_POOL_THEMES + 3 }, (_, i) => ({
      name: `t${i}`,
      config: makeConfig()
    }));
    const result = rot.loadBundle({
      version: 1,
      period: 'day',
      strategy: 'cycle',
      themes
    });
    expect(result).toEqual({ loaded: MAX_POOL_THEMES, dropped: 3 });
    expect(rot.themes).toHaveLength(MAX_POOL_THEMES);
  });
});

describe('loadBundle (weekly plan round-trip)', () => {
  // Seven day cards in the store's Sunday-first display order.
  const sundayFirst = () =>
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(name => ({
      name,
      config: makeConfig()
    }));

  it('restores weekly mode and un-rotates epoch order back to Sunday-first', () => {
    const rot = useRotationStore();
    // As exported: preset marker, day/cycle, themes rotated into epoch order.
    rot.loadBundle({
      version: 1,
      period: 'day',
      strategy: 'cycle',
      preset: 'weekly',
      themes: toEpochOrder(sundayFirst())
    });
    expect(rot.isWeeklyPreset).toBe(true);
    expect(rot.period).toBe('weeklyPreset');
    expect(rot.strategy).toBe('cycle');
    // display order comes back Sunday-first, whatever the on-disk slot order was
    expect(rot.themes.map(t => t.name)).toEqual([
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat'
    ]);
  });

  it('ignores the marker when the shape does not fit (falls through to a plain import)', () => {
    const rot = useRotationStore();
    // preset says weekly, but it is not day/cycle/7 — treat as an ordinary bundle
    rot.loadBundle({
      version: 1,
      period: 'week',
      strategy: 'random',
      preset: 'weekly',
      themes: [
        { name: 'a', config: makeConfig() },
        { name: 'b', config: makeConfig() }
      ]
    });
    expect(rot.isWeeklyPreset).toBe(false);
    expect(rot.period).toBe('week');
    expect(rot.strategy).toBe('random');
    expect(rot.themes.map(t => t.name)).toEqual(['a', 'b']);
  });
});
