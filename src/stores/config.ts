import { useRefHistory, useStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { v4 as uuid } from 'uuid';
import { computed, ref, watch } from 'vue';
import {
  defaultConfig,
  emptyConfig,
  WIDGET_BY_TYPE,
  type CcStatusConfig,
  type Widget,
  type WidgetMeta
} from '@/widgets';

// ccstatusline's schema only enforces `min(1)` lines (no hard max). We cap the
// editor at 5 so the UI stays tidy; the exported JSON is unaffected.
export const MAX_LINES = 5;

export const useConfigStore = defineStore('config', () => {
  // Boot with ccstatusline's default preset (populated line 1) so a first-time
  // visitor lands on a useful status line, matching the real tool. The "clear"
  // button (reset) still wipes back to a truly-empty canvas via emptyConfig().
  const config = ref<CcStatusConfig>(defaultConfig());

  // The widget currently open in the Inspector (null = none).
  const selectedId = ref<string | null>(null);

  // The line new widgets are appended to (double-clicking a palette item).
  // `null` = no line is highlighted (e.g. right after the active line was
  // deleted — we deliberately don't auto-pick a neighbour). Read through the
  // clamped `activeLine` getter so it stays valid across add/remove/reorder.
  const activeLineIndex = ref<number | null>(0);

  // App-local clipboard for copy/paste of a widget chip (Cmd/Ctrl+C / +V on a
  // selected item). Kept out of `config` so it never lands in history or export.
  const clipboard = ref<Widget | null>(null);

  // Stable, NON-persisted keys paired 1:1 with config.lines, so the editor can
  // drag-reorder whole lines (which have no id of their own) without polluting
  // the exported config. Kept length-synced with lines below.
  const lineKeys = ref<string[]>(config.value.lines.map(() => uuid()));
  watch(
    () => config.value.lines.length,
    n => {
      const keys = lineKeys.value;
      while (keys.length < n) keys.push(uuid());
      if (keys.length > n) keys.splice(n);
    }
  );

  const {
    undo,
    redo,
    canUndo,
    canRedo,
    clear: clearHistory
  } = useRefHistory(config, {
    deep: true,
    capacity: 100
  });

  const json = computed(() => JSON.stringify(config.value, null, 2));

  /** The selected widget + which line it sits on, or null. */
  const selection = computed(() => {
    if (!selectedId.value) return null;
    const lines = config.value.lines;
    for (let i = 0; i < lines.length; i++) {
      const w = lines[i]!.find(x => x.id === selectedId.value);
      if (w) return { lineIndex: i, widget: w };
    }
    return null;
  });
  const selectedWidget = computed(() => selection.value?.widget ?? null);

  /** Whether another line can still be appended (under MAX_LINES). */
  const canAddLine = computed(() => config.value.lines.length < MAX_LINES);

  /** The highlighted line (clamped), or null when none is active. */
  const activeLine = computed(() =>
    activeLineIndex.value === null
      ? null
      : Math.min(
          Math.max(activeLineIndex.value, 0),
          config.value.lines.length - 1
        )
  );

  /** Set which line new widgets get appended to (clamped to a valid index). */
  function setActiveLine(index: number) {
    activeLineIndex.value = Math.min(
      Math.max(index, 0),
      config.value.lines.length - 1
    );
  }

  function setLines(lines: Widget[][]) {
    config.value = { ...config.value, lines };
  }

  /** Append an empty line (no-op once at MAX_LINES) and make it the active target. */
  function addLine() {
    if (config.value.lines.length >= MAX_LINES) return;
    lineKeys.value.push(uuid());
    setLines([...config.value.lines, []]);
    activeLineIndex.value = config.value.lines.length - 1;
  }

  /** Remove a line by index (never removes the last remaining line). */
  function removeLine(index: number) {
    if (config.value.lines.length <= 1) return;
    const removed = config.value.lines[index] ?? [];
    // Capture the *clamped* active line before the mutation — the raw index can
    // drift out of range (it's excluded from undo history), so reading it raw
    // would misjudge the comparisons below.
    const active = activeLine.value;
    lineKeys.value.splice(index, 1);
    setLines(config.value.lines.filter((_, i) => i !== index));
    // Drop the Inspector selection if it pointed at a widget on the deleted line.
    if (selectedId.value && removed.some(w => w.id === selectedId.value))
      selectedId.value = null;
    // Active-line bookkeeping. Deleting the active line clears the highlight
    // (no auto-pick of a neighbour); deleting a line above shifts it up; deleting
    // a line below leaves it in place. Each branch normalises the raw index to the
    // clamped value so any prior drift is healed.
    if (active !== null) {
      if (index === active) activeLineIndex.value = null;
      else if (index < active) activeLineIndex.value = active - 1;
      else activeLineIndex.value = active;
    }
  }

  /** Reorder lines (drag) — `keys` keeps the UI identity aligned with `lines`. */
  function reorderLines(lines: Widget[][], keys: string[]) {
    // Remember which logical line was active so the highlight follows it, not its slot.
    const active = activeLine.value;
    const activeKey = active === null ? null : lineKeys.value[active];
    lineKeys.value = keys;
    setLines(lines);
    if (activeKey !== null && activeKey !== undefined) {
      const nextActive = keys.indexOf(activeKey);
      activeLineIndex.value = nextActive === -1 ? null : nextActive;
    }
  }

  function selectWidget(id: string | null) {
    selectedId.value = id;
    // Selecting a widget focuses its line too, so palette double-clicks land there.
    if (id) {
      const li = config.value.lines.findIndex(l => l.some(w => w.id === id));
      if (li !== -1) activeLineIndex.value = li;
    }
  }

  /** Move selection to the prev/next widget, flattened across all lines (clamped at the ends). */
  function selectAdjacent(dir: number) {
    const ids = config.value.lines.flatMap(l => l.map(w => w.id));
    if (!ids.length) return;
    const cur = selectedId.value ? ids.indexOf(selectedId.value) : -1;
    const next =
      cur === -1 ? 0 : Math.min(ids.length - 1, Math.max(0, cur + dir));
    // Go through selectWidget so the active line follows the selection across
    // line boundaries (keeping the highlight and palette target in sync).
    selectWidget(ids[next] ?? null);
  }

  function addWidget(lineIndex: number, meta: WidgetMeta) {
    const w: Widget = { id: uuid(), type: meta.type, ...(meta.defaults || {}) };
    const lines = config.value.lines.map((l, i) => {
      if (i !== lineIndex) return l;
      // Editor preference: build "A | B | C" as you add. The separator goes
      // BETWEEN the previous widget and the new one — never after the new
      // (last) widget, so a line can't end in a dangling separator — and only
      // when the line isn't empty and doesn't already end in one. Skipped for
      // powerline / defaultSeparator, both of which are mutually exclusive
      // with manual separators (see stripManualSeparators).
      const slipSeparator =
        autoSeparator.value &&
        meta.type !== 'separator' &&
        l.length > 0 &&
        l[l.length - 1]!.type !== 'separator' &&
        !config.value.powerline.enabled &&
        !config.value.defaultSeparator;
      if (!slipSeparator) return [...l, w];
      const sepMeta = WIDGET_BY_TYPE.get('separator');
      const sep: Widget = {
        id: uuid(),
        type: 'separator',
        ...(sepMeta?.defaults || {})
      };
      return [...l, sep, w];
    });
    setLines(lines);
    selectedId.value = w.id;
    // Adding to a line makes it the active target for the next widget too.
    activeLineIndex.value = lineIndex;
  }

  /** Insert a fresh separator widget immediately to the left/right of a widget. */
  function insertSeparator(widgetId: string, side: 'left' | 'right') {
    const li = config.value.lines.findIndex(l =>
      l.some(x => x.id === widgetId)
    );
    if (li === -1) return;
    const line = config.value.lines[li]!;
    const idx = line.findIndex(x => x.id === widgetId);
    const meta = WIDGET_BY_TYPE.get('separator');
    const sep: Widget = {
      id: uuid(),
      type: 'separator',
      ...(meta?.defaults || {})
    };
    const at = side === 'left' ? idx : idx + 1;
    setLines(
      config.value.lines.map((l, i) => {
        if (i !== li) return l;
        const copy = [...l];
        copy.splice(at, 0, sep);
        return copy;
      })
    );
    // Note: deliberately does NOT change the active line — inserting a separator
    // from the hover toolbar shouldn't move the palette double-click target.
  }

  /** Merge a patch into a widget; keys whose value is `undefined` are removed. */
  function updateWidget(id: string, patch: Partial<Widget>) {
    const lines = config.value.lines.map(line =>
      line.map(w => {
        if (w.id !== id) return w;
        const next: Record<string, unknown> = { ...w };
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined) delete next[k];
          else next[k] = v;
        }
        return next as unknown as Widget;
      })
    );
    setLines(lines);
  }

  /** Patch a single metadata key; empty/undefined value removes the key (and metadata if it empties). */
  function updateMeta(id: string, key: string, value: string | undefined) {
    const w = config.value.lines.flat().find(x => x.id === id);
    if (!w) return;
    const meta = { ...(w.metadata || {}) };
    if (value === undefined || value === '') delete meta[key];
    else meta[key] = value;
    updateWidget(id, { metadata: Object.keys(meta).length ? meta : undefined });
  }

  function cloneWidget(id: string) {
    const lines = config.value.lines.map(line => {
      const idx = line.findIndex(w => w.id === id);
      if (idx === -1) return line;
      const src = line[idx]!;
      const clone: Widget = {
        ...src,
        id: uuid(),
        ...(src.metadata ? { metadata: { ...src.metadata } } : {})
      };
      const next = [...line];
      next.splice(idx + 1, 0, clone);
      return next;
    });
    setLines(lines);
  }

  /** Reset a single widget's customization (color/bold/dim/options/merge/…) back to its freshly-added defaults, keeping its id, type, and position. */
  function resetWidgetToDefaults(id: string) {
    const lines = config.value.lines.map(line =>
      line.map(w => {
        if (w.id !== id) return w;
        const meta = WIDGET_BY_TYPE.get(w.type);
        const reset: Widget = {
          id: w.id,
          type: w.type,
          ...(meta?.defaults || {})
        };
        return reset;
      })
    );
    setLines(lines);
  }

  /** Copy the selected (or given) widget into the app-local clipboard. Returns whether a widget was actually copied. */
  function copyWidget(id?: string): boolean {
    const targetId = id ?? selectedId.value;
    if (!targetId) return false;
    const src = config.value.lines.flat().find(x => x.id === targetId);
    if (!src) return false;
    clipboard.value = {
      ...src,
      ...(src.metadata ? { metadata: { ...src.metadata } } : {})
    };
    return true;
  }

  /** Paste the clipboard widget onto the active line: right after the selected widget when it sits on that line, otherwise appended to the line's end. Selection is left as-is, matching the clone button. */
  function pasteWidget() {
    if (!clipboard.value) return;
    const src = clipboard.value;
    const w: Widget = {
      ...src,
      id: uuid(),
      ...(src.metadata ? { metadata: { ...src.metadata } } : {})
    };
    // Paste always targets the active (highlighted) line. Within it: insert right
    // after the selected widget when that widget lives on this line, otherwise
    // append to the end. (activeLine is only ever null in the brief window after
    // its line was deleted; fall back to line 0, which always exists.)
    const target = activeLine.value ?? 0;
    const line = config.value.lines[target]!;
    const selIdx = selectedId.value
      ? line.findIndex(x => x.id === selectedId.value)
      : -1;
    const at = selIdx === -1 ? line.length : selIdx + 1;
    setLines(
      config.value.lines.map((l, i) => {
        if (i !== target) return l;
        const copy = [...l];
        copy.splice(at, 0, w);
        return copy;
      })
    );
  }

  // Editor-only preference, persisted in localStorage — NOT part of the config,
  // so it never lands in history, export, or the apply command. When on,
  // removing a widget also removes the separator right after it (deleting a
  // widget usually strands that separator). In node tests (no localStorage)
  // useStorage degrades to a plain ref with the default value.
  const removeTrailingSeparator = useStorage(
    'ccse-remove-trailing-separator',
    true
  );

  // Editor-only preference, same storage story as removeTrailingSeparator:
  // when adding a widget from the palette, slip a separator in between it and
  // the previous widget (see addWidget for the exact rules).
  const autoSeparator = useStorage('ccse-auto-separator', true);

  // Drop `widgetId` from a line, taking the immediately-following separator with
  // it when the preference is on (and the removed widget isn't a separator
  // itself). Returns the new line plus every id that was removed, so callers can
  // clear a selection pointing at either of them.
  function dropFromLine(
    line: Widget[],
    widgetId: string
  ): { line: Widget[]; removed: string[] } {
    const idx = line.findIndex(w => w.id === widgetId);
    if (idx === -1) return { line, removed: [] };
    const removed = [widgetId];
    const next = line[idx + 1];
    if (
      removeTrailingSeparator.value &&
      line[idx]!.type !== 'separator' &&
      next?.type === 'separator'
    )
      removed.push(next.id);
    return { line: line.filter(w => !removed.includes(w.id)), removed };
  }

  function removeWidget(lineIndex: number, widgetId: string) {
    const removed: string[] = [];
    const lines = config.value.lines.map((l, i) => {
      if (i !== lineIndex) return l;
      const r = dropFromLine(l, widgetId);
      removed.push(...r.removed);
      return r.line;
    });
    setLines(lines);
    if (selectedId.value && removed.includes(selectedId.value))
      selectedId.value = null;
  }

  function removeWidgetById(id: string) {
    const removed: string[] = [];
    const lines = config.value.lines.map(l => {
      const r = dropFromLine(l, id);
      removed.push(...r.removed);
      return r.line;
    });
    setLines(lines);
    if (selectedId.value && removed.includes(selectedId.value))
      selectedId.value = null;
  }

  function setColorLevel(level: number) {
    config.value = { ...config.value, colorLevel: level };
  }

  // ── global config ──────────────────────────────────────────────────────────
  /** Merge a top-level config patch; keys whose value is `undefined` are removed. */
  function updateConfig(patch: Partial<CcStatusConfig>) {
    const next: Record<string, unknown> = { ...config.value };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) delete next[k];
      else next[k] = v;
    }
    config.value = next as unknown as CcStatusConfig;
  }

  /** Merge a patch into config.powerline. */
  function updatePowerline(patch: Partial<CcStatusConfig['powerline']>) {
    config.value = {
      ...config.value,
      powerline: { ...config.value.powerline, ...patch }
    };
  }

  /** Reset every global setting (all top-level fields + powerline) to its default, keeping `lines` intact. Undoable like any config edit. */
  function resetGlobalSettings() {
    config.value = { ...emptyConfig(), lines: config.value.lines };
  }

  /** Remove all manual `separator` widgets from every line (powerline / defaultSeparator are mutually exclusive with them). */
  function stripManualSeparators() {
    setLines(
      config.value.lines.map(l => l.filter(w => w.type !== 'separator'))
    );
    if (
      selectedId.value &&
      !config.value.lines.flat().some(w => w.id === selectedId.value)
    ) {
      selectedId.value = null;
    }
  }

  const hasManualSeparators = computed(() =>
    config.value.lines.some(l => l.some(w => w.type === 'separator'))
  );
  const isCustomColor = (c?: string) =>
    !!c && (c.startsWith('hex:') || c.startsWith('ansi256:'));
  const hasCustomColors = computed(() =>
    config.value.lines.some(l =>
      l.some(w => isCustomColor(w.color) || isCustomColor(w.backgroundColor))
    )
  );

  function reset() {
    config.value = emptyConfig();
    lineKeys.value = config.value.lines.map(() => uuid());
    selectedId.value = null;
    activeLineIndex.value = 0;
    clearHistory();
  }

  /**
   * Replace the whole config (template pick / `?json=` share-link import / JSON paste)
   * and reset editor-local state, same as `reset()`. Callers only guarantee the loose
   * shape checked by `isCcStatusConfig` (has `lines`) — merge over `emptyConfig()` so a
   * config missing fields the UI unconditionally reads (`powerline.enabled`, …) can't
   * crash it; `next` still wins for anything it does provide.
   */
  function loadConfig(next: CcStatusConfig) {
    const defaults = emptyConfig();
    config.value = {
      ...defaults,
      ...next,
      powerline: { ...defaults.powerline, ...next.powerline }
    };
    lineKeys.value = config.value.lines.map(() => uuid());
    selectedId.value = null;
    activeLineIndex.value = config.value.lines.length ? 0 : null;
    clearHistory();
  }

  return {
    config,
    json,
    selectedId,
    selection,
    selectedWidget,
    clipboard,
    lineKeys,
    canAddLine,
    activeLine,
    MAX_LINES,
    setLines,
    addLine,
    removeLine,
    reorderLines,
    setActiveLine,
    selectWidget,
    selectAdjacent,
    addWidget,
    insertSeparator,
    updateWidget,
    updateMeta,
    cloneWidget,
    resetWidgetToDefaults,
    copyWidget,
    pasteWidget,
    autoSeparator,
    removeTrailingSeparator,
    removeWidget,
    removeWidgetById,
    setColorLevel,
    updateConfig,
    updatePowerline,
    resetGlobalSettings,
    stripManualSeparators,
    hasManualSeparators,
    hasCustomColors,
    reset,
    loadConfig,
    undo,
    redo,
    canUndo,
    canRedo
  };
});
