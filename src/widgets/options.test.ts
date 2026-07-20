import { describe, expect, it } from 'vitest';
import { emptyConfig, WIDGET_BY_TYPE, type Widget } from '@/widgets';
import {
  optionsFor,
  supportsColors,
  supportsRawValue,
  WIDGET_OPTIONS
} from '@/widgets/options';

const w = (type: string, extra: Partial<Widget> = {}): Widget => ({
  id: 't',
  type,
  ...extra
});
/** Gets a specific option descriptor for a widget (assumed to exist). */
const opt = (type: string, id: string) =>
  optionsFor(type).find(o => o.id === id)!;

describe('supportsRawValue', () => {
  it('a typical widget supports rawValue', () => {
    expect(supportsRawValue('model')).toBe(true);
    expect(supportsRawValue('git-branch')).toBe(true);
  });
  it('widgets in the NO_RAW list do not support it', () => {
    for (const t of [
      'git-changes',
      'git-status',
      'git-sha',
      'git-root-dir',
      'separator',
      'flex-separator',
      'custom-text',
      'custom-command',
      'vim-mode',
      'compaction-counter'
    ]) {
      expect(supportsRawValue(t), t).toBe(false);
    }
  });
});

describe('supportsColors', () => {
  it('a typical widget supports coloring', () => {
    expect(supportsColors(w('model'))).toBe(true);
  });
  it('flex-separator does not support coloring', () => {
    expect(supportsColors(w('flex-separator'))).toBe(false);
  });
  it("custom-command disables coloring only when preserving the command's own ANSI colors", () => {
    expect(supportsColors(w('custom-command'))).toBe(true);
    expect(supportsColors(w('custom-command', { preserveColors: true }))).toBe(
      false
    );
  });
});

describe('optionsFor', () => {
  it('a configured widget returns its list of options', () => {
    expect(optionsFor('separator').length).toBeGreaterThan(0);
  });
  it('an unconfigured / unknown type returns an empty array', () => {
    expect(optionsFor('model')).toEqual([]); // model has no widget-specific options
    expect(optionsFor('does-not-exist')).toEqual([]);
  });
});

describe('ccstatusline v2.2.24 widget options', () => {
  it('git-ci-status supports hiding outside git repositories', () => {
    expect(optionsFor('git-ci-status').map(o => o.id)).toEqual(['hideNoGit']);
  });

  it('sandbox-status exposes its formats and Nerd Font only in glyph mode', () => {
    const format = opt('sandbox-status', 'format');
    expect(format.options?.map(o => o.value)).toEqual([
      'glyph',
      'text',
      'word'
    ]);
    expect(format.defaultValue).toBe('glyph');
    expect(format.clearsMeta).toContain('nerdFont');

    const nerd = opt('sandbox-status', 'nerdFont');
    expect(nerd.showIf!(w('sandbox-status'))).toBe(true);
    expect(
      nerd.showIf!(w('sandbox-status', { metadata: { format: 'text' } }))
    ).toBe(false);
  });

  it('cache-timer exposes TTL, empty-state, and all five symbol slots', () => {
    expect(optionsFor('cache-timer').map(o => o.id)).toEqual([
      'ttl',
      'hideWhenEmpty',
      'symbolHot',
      'symbolFresh',
      'symbolDraining',
      'symbolUrgent',
      'symbolCold'
    ]);
    expect(opt('cache-timer', 'ttl').options?.map(o => o.value)).toEqual([
      '300',
      '3600'
    ]);
    expect(opt('cache-timer', 'symbolFresh').preserveEmpty).toBe(true);
  });
});

describe('showIf conditional visibility', () => {
  it('timer: bar-family controls (invert) show only in progress-bar mode', () => {
    const invert = opt('reset-timer', 'invert');
    expect(invert.showIf!(w('reset-timer'))).toBe(false); // defaults to time mode
    expect(
      invert.showIf!(w('reset-timer', { metadata: { display: 'slider' } }))
    ).toBe(true);
  });
  it('timer: time-family controls (compact) show only in non-progress-bar mode', () => {
    const compact = opt('reset-timer', 'compact');
    expect(compact.showIf!(w('reset-timer'))).toBe(true);
    expect(
      compact.showIf!(w('reset-timer', { metadata: { display: 'progress' } }))
    ).toBe(false);
  });
  it('timer: hour12 requires both time mode and absolute=on', () => {
    const hour12 = opt('reset-timer', 'hour12');
    expect(hour12.showIf!(w('reset-timer'))).toBe(false); // no absolute
    expect(
      hour12.showIf!(w('reset-timer', { metadata: { absolute: 'true' } }))
    ).toBe(true);
    expect(
      hour12.showIf!(
        w('reset-timer', { metadata: { absolute: 'true', display: 'slider' } })
      )
    ).toBe(false); // not time mode
  });
  it("current-working-dir: segments is always visible (ccstatusline's (s)egments option is unaffected by fishStyle)", () => {
    expect(opt('current-working-dir', 'segments').showIf).toBeUndefined();
  });
  it('skills: listLimit shows only when mode=list', () => {
    const lim = opt('skills', 'listLimit');
    expect(lim.showIf!(w('skills'))).toBe(false);
    expect(lim.showIf!(w('skills', { metadata: { mode: 'list' } }))).toBe(true);
  });
  it('usage percentage: the used/remaining direction toggle is available in every display mode (v2.2.23)', () => {
    const inv = opt('session-usage', 'inverse');
    expect(inv.metaKey).toBe('invert');
    expect(inv.showIf).toBeUndefined();
  });
  it('compaction-counter: composite-display options hide for sub-metrics; hideZero stays (v2.2.23)', () => {
    for (const id of [
      'format',
      'showTriggers',
      'showReclaimed',
      'symbolReclaimed'
    ] as const) {
      const o = opt('compaction-counter', id);
      expect(o.showIf!(w('compaction-counter')), id).toBe(true);
      expect(
        o.showIf!(w('compaction-counter', { metadata: { metric: 'auto' } })),
        id
      ).toBe(false);
    }
    expect(opt('compaction-counter', 'hideZero').showIf).toBeUndefined();
    // an invalid metric value falls back to 'count' (ccstatusline getMetric)
    expect(
      opt('compaction-counter', 'format').showIf!(
        w('compaction-counter', { metadata: { metric: 'bogus' } })
      )
    ).toBe(true);
  });
  it('git-branch / git-root-dir expose maxWidth; cwd exposes the glyph override (v2.2.23)', () => {
    expect(opt('git-branch', 'maxWidth').field).toBe('maxWidth');
    expect(opt('git-root-dir', 'maxWidth').field).toBe('maxWidth');
    expect(opt('current-working-dir', 'glyph').field).toBe('character');
  });
});

describe('option table structural invariants', () => {
  const allEntries = Object.entries(WIDGET_OPTIONS);

  it('every configured widget type exists in the catalog', () => {
    for (const [type] of allEntries)
      expect(WIDGET_BY_TYPE.has(type), type).toBe(true);
  });

  it('every option binds to exactly one of field or metaKey', () => {
    for (const [type, opts] of allEntries)
      for (const o of opts)
        expect(!!o.field !== !!o.metaKey, `${type}.${o.id}`).toBe(true);
  });

  it('enum controls must have options; other controls must not', () => {
    for (const [type, opts] of allEntries)
      for (const o of opts) {
        const isEnum = o.control === 'enum';
        expect(!!o.options, `${type}.${o.id}`).toBe(isEnum);
      }
  });

  it("defaultValue must be within the control's options value set", () => {
    for (const [type, opts] of allEntries)
      for (const o of opts) {
        if (o.defaultValue === undefined) continue;
        const values = (o.options ?? []).map(e => e.value);
        expect(values, `${type}.${o.id}`).toContain(o.defaultValue);
      }
  });

  it('option ids are unique within the same widget', () => {
    for (const [type, opts] of allEntries) {
      const ids = opts.map(o => o.id);
      expect(new Set(ids).size, type).toBe(ids.length);
    }
  });
});

// Locks in the "strict alignment with ccstatusline v2.2.22" audit fixes item by item (regression guard).
describe('ccstatusline v2.2.22 alignment fixes', () => {
  const ids = (type: string) => optionsFor(type).map(o => o.id);

  it('#1 context-bar defaults to progress-short (ccstatusline renders a 16-wide bar when display is unset)', () => {
    expect(opt('context-bar', 'display').defaultValue).toBe('progress-short');
  });

  it('#2 block-timer exposes only display/invert/compact (no cursor/absolute/hour12)', () => {
    expect(ids('block-timer').sort()).toEqual(['compact', 'display', 'invert']);
  });

  it('#3/#4 none of the three timers include cursor (cursor belongs to the percentage family)', () => {
    for (const t of ['block-timer', 'reset-timer', 'weekly-reset-timer'])
      expect(ids(t), t).not.toContain('cursor');
  });

  it('reset-timer has the date-capable controls absolute/hour12/timezone/locale', () => {
    for (const id of ['absolute', 'hour12', 'timezone', 'locale'])
      expect(ids('reset-timer'), id).toContain(id);
  });

  it('#8/#9 timezone/locale show only when absolute=on', () => {
    for (const id of ['timezone', 'locale']) {
      const o = opt('reset-timer', id);
      expect(o.showIf!(w('reset-timer')), id).toBe(false);
      expect(
        o.showIf!(w('reset-timer', { metadata: { absolute: 'true' } })),
        id
      ).toBe(true);
    }
  });

  it('#10 weekly-reset-timer hours shows only in time mode with absolute=off', () => {
    const hours = opt('weekly-reset-timer', 'hours');
    expect(hours.showIf!(w('weekly-reset-timer'))).toBe(true);
    expect(
      hours.showIf!(w('weekly-reset-timer', { metadata: { absolute: 'true' } }))
    ).toBe(false);
    expect(
      hours.showIf!(
        w('weekly-reset-timer', { metadata: { display: 'slider' } })
      )
    ).toBe(false);
  });

  it('#5 remote-control-status format has 6 values (including label-check/label-mark); voice-status still has 4', () => {
    const remoteVals = (
      opt('remote-control-status', 'format').options ?? []
    ).map(o => o.value);
    expect(remoteVals).toEqual([
      'icon',
      'icon-text',
      'text',
      'word',
      'label-check',
      'label-mark'
    ]);
    const voiceVals = (opt('voice-status', 'format').options ?? []).map(
      o => o.value
    );
    expect(voiceVals).toEqual(['icon', 'icon-text', 'text', 'word']);
  });

  it('#6 compaction-counter: nerdFont is visible only in the default format, switching format clears nerdFont', () => {
    const nerd = opt('compaction-counter', 'nerdFont');
    expect(nerd.showIf!(w('compaction-counter'))).toBe(true);
    expect(
      nerd.showIf!(
        w('compaction-counter', { metadata: { format: 'icon-space-number' } })
      )
    ).toBe(true);
    expect(
      nerd.showIf!(w('compaction-counter', { metadata: { format: 'number' } }))
    ).toBe(false);
    expect(opt('compaction-counter', 'format').clearsMeta).toContain(
      'nerdFont'
    );
  });

  it('#7 extra-usage-utilization has no cursor; other usage-percentage widgets still have cursor', () => {
    expect(ids('extra-usage-utilization')).not.toContain('cursor');
    for (const t of [
      'session-usage',
      'weekly-usage',
      'weekly-sonnet-usage',
      'weekly-opus-usage'
    ])
      expect(ids(t), t).toContain('cursor');
  });

  it("#11 git-worktree preview carries the default glyph prefix (U+16830, matching GitWorktreeWidget's default rendering)", () => {
    expect(WIDGET_BY_TYPE.get('git-worktree')?.preview).toBe('𖠰 main');
  });

  it('#13 current-working-dir segments has no maximum (ccstatusline places no cap on segment count)', () => {
    expect(opt('current-working-dir', 'segments').max).toBeUndefined();
  });

  it('#17 skills listLimit has no maximum (ccstatusline places no cap on list item count)', () => {
    expect(opt('skills', 'listLimit').max).toBeUndefined();
  });

  it('#18 custom-command maxWidth/timeout have no maximum (ccstatusline caps neither)', () => {
    expect(opt('custom-command', 'maxWidth').max).toBeUndefined();
    expect(opt('custom-command', 'timeout').max).toBeUndefined();
  });

  it('#16 skills mode: leaving list mode clears listLimit; entering/staying in list preserves it', () => {
    const mode = opt('skills', 'mode');
    expect(mode.clearsMetaExceptValue).toBe('list');
    expect(mode.clearsMeta).toContain('listLimit');
    // mirrors Inspector.setEnum's shouldClear check: value !== clearsMetaExceptValue
    const shouldClear = (value: string) => value !== mode.clearsMetaExceptValue;
    expect(shouldClear('current')).toBe(true); // must clear even when switching back to the default value (no longer missed by the isDefault check)
    expect(shouldClear('count')).toBe(true);
    expect(shouldClear('list')).toBe(false); // staying in / switching into list does not clear
  });
});

// Second round of alignment fixes (found during Codex review): legacy metadata key
// compatibility, windowSeconds clamp, toggle-off writes 'false', flexMode default.
// Locked in item by item as a regression guard.
describe('ccstatusline v2.2.22 alignment fixes (round two)', () => {
  // Manually mirrors Inspector.vue's isOn/getVal/setToggle/setEnum to exercise the real
  // read/write path (these functions are internal to <script setup> and not exported,
  // so the test replicates the same logic).
  function isOn(o: ReturnType<typeof opt>, item: Widget): boolean {
    if (o.field) return !!(item as any)[o.field];
    const meta = item.metadata;
    const primary = meta?.[o.metaKey!];
    if (primary !== undefined) return primary === 'true';
    return o.legacyMetaKey ? meta?.[o.legacyMetaKey] === 'true' : false;
  }
  function getVal(o: ReturnType<typeof opt>, item: Widget): string {
    if (o.metaKey) {
      const primary = item.metadata?.[o.metaKey];
      if (primary !== undefined) return primary;
      if (
        o.legacyMetaKey &&
        item.metadata?.[o.legacyMetaKey] === 'true' &&
        o.legacyValue !== undefined
      )
        return o.legacyValue;
    }
    return '';
  }
  function setToggle(
    o: ReturnType<typeof opt>,
    item: Widget,
    on: boolean
  ): Record<string, string> | undefined {
    const offValue = o.deleteOnOff ? undefined : 'false';
    const meta = { ...(item.metadata ?? {}) };
    if (on) meta[o.metaKey!] = 'true';
    else if (offValue === undefined) delete meta[o.metaKey!];
    else meta[o.metaKey!] = offValue;
    if (o.legacyMetaKey) delete meta[o.legacyMetaKey];
    return Object.keys(meta).length ? meta : undefined;
  }

  it('legacy key: git-branch linkToRepo reads are backward-compatible with the old linkToGitHub key, and writes clear the old key', () => {
    const o = opt('git-branch', 'linkToRepo');
    expect(o.legacyMetaKey).toBe('linkToGitHub');
    expect(o.deleteOnOff).toBe(true); // ccstatusline's own toggleLink deletes the key rather than writing 'false'
    // an old config with only linkToGitHub=true and no linkToRepo should be recognized as "on"
    expect(
      isOn(o, w('git-branch', { metadata: { linkToGitHub: 'true' } }))
    ).toBe(true);
    // once the new key exists (even as 'false'), the old key no longer applies — matches ccstatusline's isLinkEnabled
    expect(
      isOn(
        o,
        w('git-branch', {
          metadata: { linkToGitHub: 'true', linkToRepo: 'false' }
        })
      )
    ).toBe(false);
    // any write must clear the old key
    expect(
      setToggle(
        o,
        w('git-branch', { metadata: { linkToGitHub: 'true' } }),
        false
      )
    ).toBeUndefined();
  });

  it('legacy key: git-root-dir ideLink reads are backward-compatible with the old linkToCursor=true → cursor', () => {
    const o = opt('git-root-dir', 'ideLink');
    expect(o.legacyMetaKey).toBe('linkToCursor');
    expect(o.legacyValue).toBe('cursor');
    expect(
      getVal(o, w('git-root-dir', { metadata: { linkToCursor: 'true' } }))
    ).toBe('cursor');
    // once the new key exists, the old key no longer applies
    expect(
      getVal(
        o,
        w('git-root-dir', {
          metadata: { linkToCursor: 'true', linkToIDE: 'vscode' }
        })
      )
    ).toBe('vscode');
  });

  it("toggle-off writes false (ccstatusline's general toggleMetadataFlag family): hideNoGit and others", () => {
    for (const [type, id] of [
      ['git-branch', 'hideNoGit'],
      ['cache-hit-rate', 'hideWhenEmpty'],
      ['session-usage', 'inverse']
    ] as const) {
      const o = opt(type, id);
      expect(o.deleteOnOff, `${type}.${id}`).toBeFalsy();
    }
  });

  it("toggle-off still deletes the key (ccstatusline's dedicated delete-on-off logic): nerdFont / abbreviateHome / fishStyle", () => {
    for (const [type, id] of [
      ['vim-mode', 'nerdFont'],
      ['voice-status', 'nerdFont'],
      ['remote-control-status', 'nerdFont'],
      ['compaction-counter', 'nerdFont'],
      ['current-working-dir', 'abbreviateHome'],
      ['current-working-dir', 'fishStyle']
    ] as const) {
      expect(opt(type, id).deleteOnOff, `${type}.${id}`).toBe(true);
    }
  });

  it('windowSeconds declares clamp (ccstatusline clamps to 0-120 on both read and write); segments/listLimit do not clamp', () => {
    for (const type of ['input-speed', 'output-speed', 'total-speed']) {
      const o = opt(type, 'window');
      expect(o.clamp, type).toBe(true);
      expect(o.min).toBe(0);
      expect(o.max).toBe(120);
    }
    expect(opt('current-working-dir', 'segments').clamp).toBeFalsy();
    expect(opt('skills', 'listLimit').clamp).toBeFalsy();
  });

  it("flexMode default aligns with ccstatusline SettingsSchema's full-minus-40", () => {
    expect(emptyConfig().flexMode).toBe('full-minus-40');
  });

  it('positiveOnly: segments/listLimit/maxWidth/timeout declare a >0 check without declaring min (otherwise the component would clamp 0 to 1, hiding invalid input forever)', () => {
    for (const [type, id] of [
      ['current-working-dir', 'segments'],
      ['skills', 'listLimit'],
      ['custom-command', 'maxWidth'],
      ['custom-command', 'timeout']
    ] as const) {
      const o = opt(type, id);
      expect(o.positiveOnly, `${type}.${id}`).toBe(true);
      expect(o.min, `${type}.${id}`).toBeUndefined();
    }
  });

  it('positiveOnly write semantics: ≤0 clears the key (aligning with ccstatusline\'s ">0 else delete"), rather than clamping to 1', () => {
    // mirrors the positiveOnly branch of Inspector.vue's setNumber
    function setNumber(
      o: ReturnType<typeof opt>,
      value: number | undefined
    ): string | undefined {
      let v = value;
      if (v !== undefined && o.positiveOnly && v <= 0) v = undefined;
      return v === undefined ? undefined : String(v);
    }
    const segments = opt('current-working-dir', 'segments');
    expect(setNumber(segments, 0)).toBeUndefined();
    expect(setNumber(segments, -3)).toBeUndefined();
    expect(setNumber(segments, 2)).toBe('2');
  });
});
