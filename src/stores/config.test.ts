import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { MAX_LINES, useConfigStore } from '@/stores/config';
import { defaultConfig, WIDGETS, type CcStatusConfig } from '@/widgets';

const modelMeta = WIDGETS.find(w => w.type === 'model')!;
const sepMeta = WIDGETS.find(w => w.type === 'separator')!;

const DEFAULT_LINE1 = [
  'model',
  'separator',
  'context-length',
  'separator',
  'git-branch',
  'separator',
  'git-changes'
];

beforeEach(() => {
  setActivePinia(createPinia());
  // The store now boots with ccstatusline's default preset on line 1 (verified in
  // the 'initial default preset' block below). Every operation test exercises mutations from a
  // blank canvas, so clear to 3 empty lines first — reset() is the "clear" path.
  useConfigStore().reset();
});

describe('initial default preset', () => {
  it("defaultConfig replicates ccstatusline's default line 1, with lines 2/3 empty", () => {
    const cfg = defaultConfig();
    expect(cfg.lines).toHaveLength(3);
    expect(cfg.lines[0].map(w => w.type)).toEqual(DEFAULT_LINE1);
    // No explicit color is written — each widget falls back to its own default color
    // (matching ccstatusline's default), so the inspector panel shows "default" instead
    // of a hardcoded color name
    expect(cfg.lines[0].every(w => !('color' in w))).toBe(true);
    expect(cfg.lines[1]).toHaveLength(0);
    expect(cfg.lines[2]).toHaveLength(0);
    // every widget has a unique id
    const ids = cfg.lines[0].map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('the store loads the default preset immediately on boot', () => {
    // fresh pinia, bypassing the reset() in beforeEach, to observe the real boot state
    setActivePinia(createPinia());
    const store = useConfigStore();
    expect(store.config.lines[0].map(w => w.type)).toEqual(DEFAULT_LINE1);
    expect(store.config.lines[1]).toHaveLength(0);
    expect(store.config.lines[2]).toHaveLength(0);
  });
});

describe('line add/remove boundaries', () => {
  it('addLine becomes a no-op once MAX_LINES is reached', () => {
    const store = useConfigStore();
    while (store.config.lines.length < MAX_LINES) store.addLine();
    expect(store.config.lines).toHaveLength(MAX_LINES);
    expect(store.canAddLine).toBe(false);
    store.addLine(); // full, no-op
    expect(store.config.lines).toHaveLength(MAX_LINES);
  });

  it('removeLine never removes the last remaining line', () => {
    const store = useConfigStore();
    store.removeLine(0);
    store.removeLine(0);
    expect(store.config.lines).toHaveLength(1);
    store.removeLine(0); // only one line left, no-op
    expect(store.config.lines).toHaveLength(1);
  });
});

describe('widget add/remove/update', () => {
  it('addWidget appends and selects the new widget', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    expect(store.config.lines[0]).toHaveLength(1);
    expect(store.config.lines[0][0].type).toBe('model');
    expect(store.selectedId).toBe(store.config.lines[0][0].id);
    expect(store.selectedWidget?.type).toBe('model');
  });

  it('updateWidget merges a patch; a value of undefined deletes that key', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    const id = store.config.lines[0][0].id;
    store.updateWidget(id, { color: 'cyan' });
    expect(store.config.lines[0][0].color).toBe('cyan');
    store.updateWidget(id, { color: undefined });
    expect(store.config.lines[0][0]).not.toHaveProperty('color');
  });

  it('updateMeta sets metadata; an empty value deletes that key', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    const id = store.config.lines[0][0].id;
    store.updateMeta(id, 'display', 'slider');
    expect(store.config.lines[0][0].metadata).toEqual({ display: 'slider' });
    store.updateMeta(id, 'display', '');
    expect(store.config.lines[0][0].metadata).toBeUndefined();
  });

  it('cloneWidget deep-clones metadata and inserts the clone right after the original', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    const id = store.config.lines[0][0].id;
    store.updateMeta(id, 'display', 'slider');
    store.cloneWidget(id);
    expect(store.config.lines[0]).toHaveLength(2);
    const [orig, clone] = store.config.lines[0];
    expect(clone.id).not.toBe(orig.id);
    expect(clone.metadata).toEqual(orig.metadata);
    expect(clone.metadata).not.toBe(orig.metadata); // different reference = deep clone
    expect(store.selectedId).toBe(orig.id); // cloning doesn't steal selection, it still points at the original
  });

  it('removeWidget also clears the selection when it points at the removed widget', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    const id = store.config.lines[0][0].id;
    expect(store.selectedId).toBe(id);
    store.removeWidget(0, id);
    expect(store.config.lines[0]).toHaveLength(0);
    expect(store.selectedId).toBeNull();
  });
});

describe('derived state', () => {
  it('hasManualSeparators / hasCustomColors track content changes', () => {
    const store = useConfigStore();
    expect(store.hasManualSeparators).toBe(false);
    expect(store.hasCustomColors).toBe(false);
    store.addWidget(0, {
      type: 'separator',
      category: 'Layout',
      color: 'gray',
      preview: '|'
    });
    expect(store.hasManualSeparators).toBe(true);
    store.addWidget(0, modelMeta);
    const id = store.config.lines[0][1].id;
    store.updateWidget(id, { color: 'hex:ff0000' });
    expect(store.hasCustomColors).toBe(true);
  });

  it('stripManualSeparators removes all manually added separators', () => {
    const store = useConfigStore();
    store.addWidget(0, {
      type: 'separator',
      category: 'Layout',
      color: 'gray',
      preview: '|'
    });
    store.addWidget(0, modelMeta);
    store.stripManualSeparators();
    expect(store.config.lines[0].some(w => w.type === 'separator')).toBe(false);
    expect(store.config.lines[0]).toHaveLength(1);
  });
});

describe('undo / redo', () => {
  it('can undo and redo a single widget addition', async () => {
    const store = useConfigStore();
    await nextTick();
    store.addWidget(0, modelMeta);
    await nextTick();
    expect(store.config.lines[0]).toHaveLength(1);
    expect(store.canUndo).toBe(true);

    store.undo();
    expect(store.config.lines[0]).toHaveLength(0);
    expect(store.canRedo).toBe(true);

    store.redo();
    expect(store.config.lines[0]).toHaveLength(1);
  });
});

describe('selection and navigation', () => {
  it('selection exposes the line index the widget is in', () => {
    const store = useConfigStore();
    store.addWidget(1, modelMeta);
    const id = store.config.lines[1][0].id;
    store.selectWidget(id);
    expect(store.selection?.lineIndex).toBe(1);
    expect(store.selection?.widget.id).toBe(id);
  });

  it('selectWidget(null) clears the selection', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    store.selectWidget(null);
    expect(store.selectedId).toBeNull();
    expect(store.selection).toBeNull();
  });

  it('selectAdjacent moves across lines as a flat list, clamped at both ends', () => {
    const store = useConfigStore();
    store.autoSeparator = false; // keep the fixture a plain flat list
    store.addWidget(0, modelMeta);
    store.addWidget(0, modelMeta);
    store.addWidget(1, modelMeta);
    const [a, b] = store.config.lines[0].map(w => w.id);
    const c = store.config.lines[1][0].id;

    store.selectWidget(a);
    store.selectAdjacent(-1); // already at the head, clamped in place
    expect(store.selectedId).toBe(a);
    store.selectAdjacent(1);
    expect(store.selectedId).toBe(b);
    store.selectAdjacent(1);
    expect(store.selectedId).toBe(c);
    store.selectAdjacent(1); // already at the tail, clamped in place
    expect(store.selectedId).toBe(c);
  });

  it('selectAdjacent lands on the first widget when nothing is selected', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    store.selectWidget(null);
    store.selectAdjacent(1);
    expect(store.selectedId).toBe(store.config.lines[0][0].id);
  });

  it('selectAdjacent is a no-op when there are no widgets', () => {
    const store = useConfigStore();
    store.selectAdjacent(1);
    expect(store.selectedId).toBeNull();
  });
});

describe('active line (double-click append target)', () => {
  it('the active line defaults to 0', () => {
    const store = useConfigStore();
    expect(store.activeLine).toBe(0);
  });

  it('setActiveLine clamps to the valid range', () => {
    const store = useConfigStore();
    store.setActiveLine(2);
    expect(store.activeLine).toBe(2);
    store.setActiveLine(99); // out of range on the high side → clamps to the last line
    expect(store.activeLine).toBe(2);
    store.setActiveLine(-5); // out of range on the low side → clamps to 0
    expect(store.activeLine).toBe(0);
  });

  it('addWidget sets the target line as the active line', () => {
    const store = useConfigStore();
    store.addWidget(2, modelMeta);
    expect(store.activeLine).toBe(2);
  });

  it('selectWidget focuses the line containing that widget; clearing selection does not change the active line', () => {
    const store = useConfigStore();
    store.addWidget(1, modelMeta);
    const id = store.config.lines[1][0].id;
    store.setActiveLine(0);
    store.selectWidget(id);
    expect(store.activeLine).toBe(1);
    store.selectWidget(null);
    expect(store.activeLine).toBe(1); // clearing the selection does not change the active line
  });

  it('addLine sets the new line as the active line', () => {
    const store = useConfigStore();
    store.addLine(); // 3 → 4 lines
    expect(store.activeLine).toBe(3);
  });

  it('removeLine shifts the active line up when a line above it is removed', () => {
    const store = useConfigStore();
    store.setActiveLine(2);
    store.removeLine(0);
    expect(store.activeLine).toBe(1);
  });

  it('removeLine leaves the active line unchanged when a line below it is removed', () => {
    const store = useConfigStore();
    store.setActiveLine(0);
    store.removeLine(2);
    expect(store.activeLine).toBe(0);
  });

  it('removeLine clears the highlight when the active line itself is removed, without auto-selecting an adjacent line', () => {
    const store = useConfigStore();
    store.setActiveLine(2); // the last line is the active line
    store.removeLine(2);
    expect(store.config.lines).toHaveLength(2);
    expect(store.activeLine).toBeNull();
  });

  it('after the highlight is cleared, a double-click still falls back to line 0', () => {
    const store = useConfigStore();
    store.setActiveLine(1);
    store.removeLine(1); // the active line was removed → null
    expect(store.activeLine).toBeNull();
    store.addWidget(store.activeLine ?? 0, modelMeta); // replicates the panel's double-click fallback
    expect(store.config.lines[0]).toHaveLength(1);
    expect(store.activeLine).toBe(0); // the target line is highlighted again
  });

  it('reorderLines makes the active line follow its logical line', () => {
    const store = useConfigStore();
    const keys = [...store.lineKeys];
    store.setActiveLine(0); // active line = the original line 0
    const reordered = [
      store.config.lines[1],
      store.config.lines[0],
      store.config.lines[2]
    ];
    store.reorderLines(reordered, [keys[1], keys[0], keys[2]]);
    expect(store.activeLine).toBe(1); // the original line 0 is now at position 1
  });

  it('reset resets the active line to 0', () => {
    const store = useConfigStore();
    store.setActiveLine(2);
    store.reset();
    expect(store.activeLine).toBe(0);
  });

  it('selectAdjacent moving across lines makes the active line follow the selection', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    store.addWidget(1, modelMeta);
    store.selectWidget(store.config.lines[0][0].id); // active line 0
    expect(store.activeLine).toBe(0);
    store.selectAdjacent(1); // jumps to the widget on line 1
    expect(store.selectedId).toBe(store.config.lines[1][0].id);
    expect(store.activeLine).toBe(1); // the active line follows along instead of staying on the old line
  });

  it('removeLine uses the clamped active line to decide: after undo desyncs the raw value, removing the highlighted line still clears it', async () => {
    const store = useConfigStore();
    await nextTick();
    store.addLine(); // 4 lines, raw active line = 3
    await nextTick();
    store.addLine(); // 5 lines, raw active line = 4
    await nextTick();
    store.undo(); // back to 4 lines
    await nextTick();
    store.undo(); // back to 3 lines; raw is still 4, clamped activeLine = 2
    await nextTick();
    expect(store.activeLine).toBe(2);
    store.removeLine(2); // removes the currently (clamped) highlighted active line
    expect(store.activeLine).toBeNull();
  });
});

describe('line reordering and selection clearing on removal', () => {
  it('reorderLines replaces lines and lineKeys in sync', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    const keys = [...store.lineKeys];
    const reordered = [
      store.config.lines[1],
      store.config.lines[0],
      store.config.lines[2]
    ];
    store.reorderLines(reordered, [keys[1], keys[0], keys[2]]);
    expect(store.lineKeys).toEqual([keys[1], keys[0], keys[2]]);
    expect(store.config.lines[1][0].type).toBe('model'); // the original line 0 was moved to line 1
  });

  it('removeLine clears the selection when it removes the line containing the selected widget', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    const id = store.config.lines[0][0].id;
    expect(store.selectedId).toBe(id);
    store.removeLine(0);
    expect(store.selectedId).toBeNull();
  });

  it('removeLine preserves the selection when removing a different line', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    const id = store.config.lines[0][0].id;
    store.removeLine(1); // removes an empty line
    expect(store.selectedId).toBe(id);
  });

  it('lineKeys always stays aligned with the length of lines', () => {
    const store = useConfigStore();
    expect(store.lineKeys).toHaveLength(3);
    store.addLine();
    expect(store.lineKeys).toHaveLength(4);
    store.removeLine(0);
    expect(store.lineKeys).toHaveLength(3);
  });
});

describe('additional widget removal and cloning behavior', () => {
  it('removeWidgetById removes by id across lines and clears the selection', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    store.addWidget(1, modelMeta);
    const id = store.config.lines[1][0].id;
    store.selectWidget(id);
    store.removeWidgetById(id);
    expect(store.config.lines[1]).toHaveLength(0);
    expect(store.selectedId).toBeNull();
  });

  it('cloneWidget does not produce a metadata key for a widget with no metadata', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    store.cloneWidget(store.config.lines[0][0].id);
    expect(store.config.lines[0]).toHaveLength(2);
    expect(store.config.lines[0][1]).not.toHaveProperty('metadata');
  });

  it('cloneWidget is a no-op for a nonexistent id', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    store.cloneWidget('missing');
    expect(store.config.lines[0]).toHaveLength(1);
  });

  it('stripManualSeparators clears the selection when it points at a removed separator', () => {
    const store = useConfigStore();
    store.addWidget(0, sepMeta);
    const sepId = store.config.lines[0][0].id;
    expect(store.selectedId).toBe(sepId);
    store.stripManualSeparators();
    expect(store.selectedId).toBeNull();
  });

  it('stripManualSeparators preserves the selection when it points at a regular widget', () => {
    const store = useConfigStore();
    store.addWidget(0, sepMeta);
    store.addWidget(0, modelMeta);
    const modelId = store.config.lines[0][1].id;
    expect(store.selectedId).toBe(modelId);
    store.stripManualSeparators();
    expect(store.selectedId).toBe(modelId);
  });
});

describe('global config patching', () => {
  it('defaults padding to both sides', () => {
    expect(useConfigStore().config.defaultPaddingSide).toBe('both');
  });

  it('updateConfig merges a top-level patch; undefined deletes the key', () => {
    const store = useConfigStore();
    store.updateConfig({ defaultSeparator: ' ' });
    expect(store.config.defaultSeparator).toBe(' ');
    store.updateConfig({ defaultSeparator: undefined });
    expect(store.config).not.toHaveProperty('defaultSeparator');
  });

  it('updatePowerline merges the sub-object while preserving other fields', () => {
    const store = useConfigStore();
    store.updatePowerline({ enabled: true });
    expect(store.config.powerline.enabled).toBe(true);
    expect(store.config.powerline.separators).toEqual(['\uE0B0']); // untouched fields are preserved
  });

  it('setColorLevel writes the color level', () => {
    const store = useConfigStore();
    store.setColorLevel(0);
    expect(store.config.colorLevel).toBe(0);
  });

  it('hasCustomColors recognizes ansi256 / hex, named colors do not count', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    const id = store.config.lines[0][0].id;
    store.updateWidget(id, { color: 'cyan' });
    expect(store.hasCustomColors).toBe(false);
    store.updateWidget(id, { color: 'ansi256:200' });
    expect(store.hasCustomColors).toBe(true);
    store.updateWidget(id, { color: undefined, backgroundColor: 'hex:112233' });
    expect(store.hasCustomColors).toBe(true);
  });
});

describe('insertSeparator (quick left/right separator insertion)', () => {
  it("side='left' inserts before the target", () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    const id = store.config.lines[0][0].id;
    store.insertSeparator(id, 'left');
    expect(store.config.lines[0].map(w => w.type)).toEqual([
      'separator',
      'model'
    ]);
    expect(store.config.lines[0][1].id).toBe(id);
  });

  it("side='right' inserts after the target", () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    const id = store.config.lines[0][0].id;
    store.insertSeparator(id, 'right');
    expect(store.config.lines[0].map(w => w.type)).toEqual([
      'model',
      'separator'
    ]);
    expect(store.config.lines[0][0].id).toBe(id);
  });

  it('inserts relative to the target among multiple widgets without changing the active line', () => {
    const store = useConfigStore();
    store.autoSeparator = false; // this test inserts its own separator manually
    store.addWidget(1, modelMeta);
    store.addWidget(1, modelMeta);
    const secondId = store.config.lines[1][1].id;
    store.setActiveLine(0);
    store.insertSeparator(secondId, 'left');
    expect(store.config.lines[1].map(w => w.type)).toEqual([
      'model',
      'separator',
      'model'
    ]);
    // inserting a separator from the floating toolbar should not change the active line
    // (the double-click target line stays the same)
    expect(store.activeLine).toBe(0);
  });

  it('is a no-op for a nonexistent id', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    store.insertSeparator('nope', 'left');
    expect(store.config.lines[0]).toHaveLength(1);
  });
});

describe('copy / paste', () => {
  it('when the selection is on the highlighted line, paste inserts right after it', () => {
    const store = useConfigStore();
    store.addWidget(0, sepMeta);
    store.addWidget(0, modelMeta); // highlighted line = 0
    const [, modelId] = store.config.lines[0].map(w => w.id);
    store.copyWidget(store.config.lines[0][0].id); // copies the separator
    store.selectWidget(modelId); // selects the model widget (on highlighted line 0)
    store.pasteWidget();
    expect(store.config.lines[0]).toHaveLength(3);
    expect(store.config.lines[0][1].id).toBe(modelId); // inserted right after the selected item
    expect(store.config.lines[0][2].type).toBe('separator'); // the pasted item is the clipboard content
  });

  it('after deselecting, paste appends to the end of the highlighted line (regression: no longer jumps to the last line)', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta); // highlighted line = 0
    const srcId = store.config.lines[0][0].id;
    store.copyWidget();
    store.selectWidget(null); // deselects; the highlighted line is still 0
    store.pasteWidget();
    expect(store.config.lines[0]).toHaveLength(2); // stays on highlighted line 0
    expect(store.config.lines[0][0].id).toBe(srcId);
    expect(store.config.lines[2]).toHaveLength(0); // no longer jumps to the last line
  });

  it('when the selection is not on the highlighted line, paste appends to the end of the highlighted line', () => {
    const store = useConfigStore();
    store.addWidget(1, modelMeta); // the selected item is on line 1
    store.copyWidget();
    store.setActiveLine(0); // switches the highlighted line to 0 (the selection stays on line 1)
    store.pasteWidget();
    expect(store.config.lines[0]).toHaveLength(1); // lands at the end of highlighted line 0
    expect(store.config.lines[1]).toHaveLength(1); // line 1 is unaffected
  });

  it('falls back to line 0 when the highlighted line is null', () => {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    store.copyWidget();
    store.selectWidget(null);
    store.setActiveLine(2);
    store.removeLine(2); // highlighted line → null
    expect(store.activeLine).toBeNull();
    store.pasteWidget();
    expect(store.config.lines[0]).toHaveLength(2); // falls back to the end of line 0
  });
});

describe('reset', () => {
  it('clears to 3 empty lines, clears the selection, and clears history', async () => {
    const store = useConfigStore();
    await nextTick();
    store.addWidget(0, modelMeta);
    await nextTick();
    expect(store.canUndo).toBe(true);

    store.reset();
    expect(store.config.lines).toHaveLength(3);
    expect(store.config.lines.every(l => l.length === 0)).toBe(true);
    expect(store.selectedId).toBeNull();
    expect(store.canUndo).toBe(false); // clearHistory takes effect synchronously
  });
});

describe('loadConfig (the unified entry point for templates/share links/JSON import)', () => {
  it('replaces the config wholesale with the one passed in, and clears selection and history', async () => {
    const store = useConfigStore();
    await nextTick();
    store.addWidget(0, modelMeta);
    await nextTick();
    expect(store.canUndo).toBe(true);

    const next: CcStatusConfig = {
      ...defaultConfig(),
      lines: [[{ id: 'x', type: 'git-branch' }], [], []]
    };
    store.loadConfig(next);
    expect(store.config.lines[0].map(w => w.type)).toEqual(['git-branch']);
    expect(store.selectedId).toBeNull();
    expect(store.canUndo).toBe(false);
  });

  it('missing fields (e.g. a pasted minimal JSON without powerline) do not crash the code that reads it, and are backfilled with defaults', () => {
    const store = useConfigStore();
    // isCcStatusConfig only validates that lines is an array — even this bare minimum must load successfully.
    // Deliberately fakes an incomplete CcStatusConfig to exercise the runtime fallback merge; the type
    // assertion here is intentional.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const minimal = { version: 3, lines: [[]] } as CcStatusConfig;
    store.loadConfig(minimal);
    expect(store.config.powerline).toEqual(defaultConfig().powerline);
    expect(store.config.flexMode).toBe(defaultConfig().flexMode);
    expect(store.config.colorLevel).toBe(defaultConfig().colorLevel);
    expect(store.config.defaultPaddingSide).toBe('both');
  });

  it('fields that are passed in still take priority over defaults (they are not overwritten by defaults)', () => {
    const store = useConfigStore();
    const next: CcStatusConfig = {
      ...defaultConfig(),
      lines: [[]],
      globalBold: true,
      powerline: { ...defaultConfig().powerline, enabled: true }
    };
    store.loadConfig(next);
    expect(store.config.globalBold).toBe(true);
    expect(store.config.powerline.enabled).toBe(true);
    // sub-fields not provided within powerline are still backfilled with defaults
    // (a partial merge, not a wholesale discard of defaults)
    expect(store.config.powerline.separators).toEqual(
      defaultConfig().powerline.separators
    );
  });
});

describe('removeTrailingSeparator preference', () => {
  // Build "model | separator | model" on line 0 and return the three ids.
  function seed() {
    const store = useConfigStore();
    store.addWidget(0, modelMeta);
    store.addWidget(0, sepMeta);
    store.addWidget(0, modelMeta);
    return { store, ids: store.config.lines[0].map(w => w.id) };
  }

  it('defaults to on; when off, removing a widget leaves the separator after it alone', () => {
    const { store, ids } = seed();
    expect(store.removeTrailingSeparator).toBe(true);
    store.removeTrailingSeparator = false;
    store.removeWidget(0, ids[0]);
    expect(store.config.lines[0].map(w => w.type)).toEqual([
      'separator',
      'model'
    ]);
  });

  it('when on, removing a widget also removes the separator right after it', () => {
    const { store, ids } = seed();
    store.removeTrailingSeparator = true;
    store.removeWidget(0, ids[0]);
    expect(store.config.lines[0].map(w => w.id)).toEqual([ids[2]]);
  });

  it('when on, removeWidgetById takes the trailing separator too, and one undo restores both', async () => {
    const { store, ids } = seed();
    store.removeTrailingSeparator = true;
    await nextTick(); // let history capture the seeded state before mutating
    store.removeWidgetById(ids[0]);
    expect(store.config.lines[0].map(w => w.id)).toEqual([ids[2]]);
    await nextTick();
    store.undo();
    expect(store.config.lines[0].map(w => w.id)).toEqual(ids);
  });

  it('when on, only the separator directly after the widget is taken — not one before it', () => {
    const { store, ids } = seed();
    store.removeTrailingSeparator = true;
    // Remove the LAST widget: the separator sits before it, so it stays.
    store.removeWidget(0, ids[2]);
    expect(store.config.lines[0].map(w => w.id)).toEqual([ids[0], ids[1]]);
  });

  it('when on, removing a separator itself never cascades', () => {
    const store = useConfigStore();
    store.addWidget(0, sepMeta);
    store.addWidget(0, sepMeta);
    store.removeTrailingSeparator = true;
    const ids = store.config.lines[0].map(w => w.id);
    store.removeWidget(0, ids[0]);
    expect(store.config.lines[0].map(w => w.id)).toEqual([ids[1]]);
  });

  it('clears the selection when it points at the cascaded separator', () => {
    const { store, ids } = seed();
    store.removeTrailingSeparator = true;
    store.selectWidget(ids[1]); // select the separator…
    store.removeWidgetById(ids[0]); // …then remove the widget before it
    expect(store.selectedId).toBeNull();
  });
});

describe('autoSeparator preference', () => {
  it('defaults to on; when off, adding widgets never inserts separators', () => {
    const store = useConfigStore();
    expect(store.autoSeparator).toBe(true);
    store.autoSeparator = false;
    store.addWidget(0, modelMeta);
    store.addWidget(0, modelMeta);
    expect(store.config.lines[0].map(w => w.type)).toEqual(['model', 'model']);
  });

  it('when on, builds A | B | C as widgets are added — the new widget stays last, no dangling separator', () => {
    const store = useConfigStore();
    store.autoSeparator = true;
    store.addWidget(0, modelMeta); // first widget on the line: nothing to separate
    store.addWidget(0, modelMeta);
    store.addWidget(0, modelMeta);
    expect(store.config.lines[0].map(w => w.type)).toEqual([
      'model',
      'separator',
      'model',
      'separator',
      'model'
    ]);
    // the added widget is selected, i.e. the separator went BEFORE it, not after
    expect(store.selectedId).toBe(store.config.lines[0].at(-1)!.id);
  });

  it('when on, does not double up after an existing trailing separator, and adding a separator itself never cascades', () => {
    const store = useConfigStore();
    store.autoSeparator = true;
    store.addWidget(0, modelMeta);
    store.addWidget(0, sepMeta); // manual separator, no auto one before it
    store.addWidget(0, modelMeta); // line already ends in a separator: no extra
    expect(store.config.lines[0].map(w => w.type)).toEqual([
      'model',
      'separator',
      'model'
    ]);
  });

  it('skipped while powerline is enabled or a default separator is set', () => {
    const store = useConfigStore();
    store.autoSeparator = true;

    store.updatePowerline({ enabled: true });
    store.addWidget(0, modelMeta);
    store.addWidget(0, modelMeta);
    expect(store.config.lines[0].map(w => w.type)).toEqual(['model', 'model']);
    store.updatePowerline({ enabled: false });

    store.updateConfig({ defaultSeparator: '|' });
    store.addWidget(1, modelMeta);
    store.addWidget(1, modelMeta);
    expect(store.config.lines[1].map(w => w.type)).toEqual(['model', 'model']);
  });
});
