import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  MAX_CUSTOM_EVERY,
  MAX_POOL_THEMES,
  MAX_THEME_NAME,
  type CustomPeriodUnit,
  type RotationBundle,
  type RotationPeriod,
  type RotationPeriodPreset,
  type RotationStrategy,
  type RotationTheme
} from '@/lib/rotationBundle';
import { fromEpochOrder } from '@/lib/weeklyPreset';
import type { CcStatusConfig } from '@/widgets';

// The rotation pool. In-memory only, like the live editor config — it survives
// route changes within a session but not a refresh. (Deliberately simple; the
// durable copy of a pool is the exported bundle file itself.)
export const useRotationStore = defineStore('rotation', () => {
  const themes = ref<RotationTheme[]>([]);
  // 'custom' and 'weeklyPreset' are UI modes, not bundle values — periodValue
  // below folds them into the RotationPeriod shape the bundle carries ('custom'
  // becomes the sanitized interval; 'weeklyPreset' is a daily cycle, so 'day').
  const period = ref<RotationPeriodPreset | 'custom' | 'weeklyPreset'>('hour');
  const customEvery = ref(1);
  const customUnit = ref<CustomPeriodUnit>('hour');
  const strategy = ref<RotationStrategy>('cycle');

  /** The bundle-shaped period: a preset string, or the sanitized custom interval. */
  const periodValue = computed<RotationPeriod>(() => {
    const p = period.value;
    // The weekly plan is a fixed 7-theme daily cycle (see weeklyPreset.ts), so it
    // exports as an ordinary 'day' period.
    if (p === 'weeklyPreset') return 'day';
    if (p !== 'custom') return p;
    // Sanitize at the read edge, so a mid-edit value (cleared field, out of
    // range) can never leak into an exported bundle.
    const every = Math.min(
      MAX_CUSTOM_EVERY,
      Math.max(1, Math.round(customEvery.value || 1))
    );
    return { every, unit: customUnit.value };
  });

  /** Whether the pool is the built-in weekly plan — the UI locks strategy to
   *  cycle and hides the add/remove/reorder affordances while this is on. */
  const isWeeklyPreset = computed(() => period.value === 'weeklyPreset');

  /** Whether the pool is at its ceiling — add entry points disable on this. */
  const isFull = computed(() => themes.value.length >= MAX_POOL_THEMES);

  /** A rotation needs at least two themes to cycle between, so the "use in
   *  terminal" export gates on this — a one-theme pool is a static config, not
   *  a rotation. */
  const canRotate = computed(() => themes.value.length >= 2);

  // ── editing session ─────────────────────────────────────────────────────────
  // Which pool theme the editor currently holds: while a session is live,
  // EditorPage streams every config change back into this theme (updateEditing)
  // and shows a "return to rotation" badge. Index-based is safe because the
  // session only lives while the user is away from the rotation page: it starts
  // on the edit click and ends the moment RotationPage mounts again (stopEdit),
  // so the pool can't be reordered or pruned under a live session.
  const editingIndex = ref<number | null>(null);

  /** The theme behind the live session, or null when no session is running. */
  const editingTheme = computed(() =>
    editingIndex.value === null
      ? null
      : (themes.value[editingIndex.value] ?? null)
  );

  function beginEdit(index: number) {
    editingIndex.value =
      index >= 0 && index < themes.value.length ? index : null;
  }

  function stopEdit() {
    editingIndex.value = null;
  }

  /**
   * Live-sync the editor's current config into the theme under edit; the
   * session stays open. No-op when no session is live.
   */
  function updateEditing(config: CcStatusConfig) {
    const index = editingIndex.value;
    if (index === null || !themes.value[index]) return;
    themes.value = themes.value.map((t, i) =>
      i === index ? { ...t, config: toRawDeep(config) } : t
    );
  }

  /**
   * Add a config to the pool (deep-cloned, so later editor edits never leak
   * in). Returns false when the pool is full, so callers can toast the limit.
   */
  function addTheme(name: string, config: CcStatusConfig): boolean {
    if (isFull.value) return false;
    themes.value = [
      ...themes.value,
      { name: name.slice(0, MAX_THEME_NAME), config: toRawDeep(config) }
    ];
    return true;
  }

  function removeTheme(index: number) {
    themes.value = themes.value.filter((_, i) => i !== index);
  }

  /**
   * Rename a theme, keeping the old name on rejection: empty names (the CLI
   * refuses nameless themes) and names another theme already carries (themes
   * are told apart by name in the exported bundle). The result says which
   * case hit, so callers can toast the duplicate one.
   */
  function renameTheme(
    index: number,
    name: string
  ): 'renamed' | 'empty' | 'duplicate' {
    const next = name.trim().slice(0, MAX_THEME_NAME);
    if (!next) return 'empty';
    if (themes.value.some((t, i) => i !== index && t.name === next)) {
      return 'duplicate';
    }
    themes.value = themes.value.map((t, i) =>
      i === index ? { ...t, name: next } : t
    );
    return 'renamed';
  }

  /** Replace the whole list — drag-reorder hands back the reordered array. */
  function setThemes(next: RotationTheme[]) {
    themes.value = next;
  }

  /**
   * Swap one theme's config in place (deep-cloned, like addTheme), keeping its
   * name and position. Backs the weekly plan's per-day quick-fill actions ("set
   * this day's look from the editor / a JSON import / a template") — the day is
   * fixed, only its config changes. No-op on an out-of-range index.
   */
  function setThemeConfig(index: number, config: CcStatusConfig) {
    if (index < 0 || index >= themes.value.length) return;
    themes.value = themes.value.map((t, i) =>
      i === index ? { ...t, config: toRawDeep(config) } : t
    );
  }

  /**
   * Switch the pool to the built-in weekly plan: enter 'weeklyPreset' mode, force
   * the strategy to cycle (weekday alignment only works for a cycle, never a
   * random pick), and replace the pool with the seven day themes (deep-cloned,
   * name-capped — same as addTheme). Callers build the themes with the localized
   * weekday labels, since the store stays i18n-free.
   */
  function setWeeklyPreset(next: RotationTheme[]) {
    period.value = 'weeklyPreset';
    strategy.value = 'cycle';
    themes.value = next.map(theme => ({
      name: theme.name.slice(0, MAX_THEME_NAME),
      config: toRawDeep(theme.config)
    }));
  }

  function clear() {
    themes.value = [];
  }

  /**
   * Replace the entire pool from an imported bundle — the reverse of the exported
   * bundle. Reads period/strategy/themes (and, per theme, only name/config) BY NAME
   * — never a spread or Object.assign — so any extra top-level keys on a live
   * ~/.config/ccsa/rotation.json (anchor, snapshot: the RotationState superset that
   * `rotate on` persists) are dropped here, never absorbed into the pool or carried
   * into a later re-export. Keep it that way. Unfolds the bundle's period back into
   * the UI's mode + custom inputs (clamped, mirroring periodValue's read-edge
   * sanitize), deep-clones each theme's config (same JSON round-trip as addTheme),
   * and caps at MAX_POOL_THEMES. Returns how many themes loaded vs. were dropped, so
   * the caller can flag an over-size (hand-edited or CLI-made) bundle instead of
   * silently truncating.
   */
  function loadBundle(bundle: RotationBundle): {
    loaded: number;
    dropped: number;
  } {
    // Our own weekly plan, round-tripping home: restore weekly mode and un-rotate
    // the epoch/slot-ordered themes back to Sunday-first display order. Gated on
    // the full day/cycle/7-theme shape, so a mislabeled bundle falls through to
    // the ordinary import instead of corrupting the fixed-set assumptions.
    if (
      bundle.preset === 'weekly' &&
      bundle.period === 'day' &&
      bundle.strategy === 'cycle' &&
      bundle.themes.length === 7
    ) {
      period.value = 'weeklyPreset';
      strategy.value = 'cycle';
      themes.value = fromEpochOrder(bundle.themes).map(theme => ({
        name: theme.name.slice(0, MAX_THEME_NAME),
        config: toRawDeep(theme.config)
      }));
      return { loaded: 7, dropped: 0 };
    }
    const p = bundle.period;
    if (typeof p === 'string') {
      period.value = p;
    } else {
      period.value = 'custom';
      customEvery.value = Math.min(
        MAX_CUSTOM_EVERY,
        Math.max(1, Math.round(p.every))
      );
      customUnit.value = p.unit;
    }
    strategy.value = bundle.strategy;
    const kept = bundle.themes.slice(0, MAX_POOL_THEMES);
    themes.value = kept.map(theme => ({
      name: theme.name.slice(0, MAX_THEME_NAME),
      config: toRawDeep(theme.config)
    }));
    return { loaded: kept.length, dropped: bundle.themes.length - kept.length };
  }

  /** A name no other theme in the pool uses yet: base, base 2, base 3, … */
  function uniqueName(base: string): string {
    const taken = new Set(themes.value.map(t => t.name));
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) {
      const candidate = `${base} ${n}`;
      if (!taken.has(candidate)) return candidate;
    }
  }

  return {
    themes,
    period,
    customEvery,
    customUnit,
    periodValue,
    strategy,
    isFull,
    canRotate,
    isWeeklyPreset,
    editingIndex,
    editingTheme,
    beginEdit,
    stopEdit,
    updateEditing,
    addTheme,
    removeTheme,
    renameTheme,
    setThemes,
    setThemeConfig,
    setWeeklyPreset,
    clear,
    loadBundle,
    uniqueName
  };
});

// Deep-clone via JSON round-trip: structuredClone throws on Vue reactive proxies,
// and config data is JSON-serializable by definition (it ships to disk as JSON).
function toRawDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
