import { describe, expect, it } from 'vitest';
import {
  POWERLINE_THEME_NAMES,
  POWERLINE_THEME_OPTIONS,
  POWERLINE_THEMES,
  renderPowerlineLines,
  visibleWidth,
  type PowerlineConfigLike,
  type PowerlineItem
} from '@/preview/powerline';
import type { Widget } from '@/widgets';

let n = 0;
const w = (type: string, extra: Partial<Widget> = {}): Widget => ({
  id: `w-${n++}`,
  type,
  ...extra
});

const pl = (extra: Partial<PowerlineConfigLike> = {}): PowerlineConfigLike => ({
  separators: ['\uE0B0'],
  separatorInvertBackground: [false],
  startCaps: [],
  endCaps: [],
  autoAlign: false,
  continueThemeAcrossLines: false,
  ...extra
});

const kinds = (items: PowerlineItem[]) => items.map(it => it.kind);
const widgets = (items: PowerlineItem[]) =>
  items.filter(it => it.kind === 'widget') as Extract<
    PowerlineItem,
    { kind: 'widget' }
  >[];
const glyphs = (items: PowerlineItem[]) =>
  items.filter(it => it.kind === 'glyph') as Extract<
    PowerlineItem,
    { kind: 'glyph' }
  >[];
const segText = (it: Extract<PowerlineItem, { kind: 'widget' }>) =>
  it.tokens.map(t => t.text).join('');

describe('renderPowerlineLines — segments and arrows', () => {
  it('inserts an arrow between two widgets, colored using the preceding segment background as fill and the following segment background as base', () => {
    const [line] = renderPowerlineLines(
      [
        [
          w('model', { backgroundColor: 'hex:112233' }),
          w('git-branch', { backgroundColor: 'hex:445566' })
        ]
      ],
      pl(),
      ' '
    );
    expect(kinds(line)).toEqual(['widget', 'glyph', 'widget']);
    const [sep] = glyphs(line);
    expect(sep.glyph).toBe('\uE0B0');
    expect(sep.fill).toBe('#112233');
    expect(sep.base).toBe('#445566');
  });

  it('invert flips the arrow fill and base', () => {
    const [line] = renderPowerlineLines(
      [
        [
          w('model', { backgroundColor: 'hex:112233' }),
          w('git-branch', { backgroundColor: 'hex:445566' })
        ]
      ],
      pl({ separators: ['\uE0B2'], separatorInvertBackground: [true] }),
      ' '
    );
    const [sep] = glyphs(line);
    expect(sep.fill).toBe('#445566');
    expect(sep.base).toBe('#112233');
  });

  it('when adjacent segments share a background, the arrow is drawn with the widget foreground color instead', () => {
    const [line] = renderPowerlineLines(
      [
        [
          w('model', { backgroundColor: 'hex:112233', color: 'hex:aabbcc' }),
          w('git-branch', { backgroundColor: 'hex:112233' })
        ]
      ],
      pl(),
      ' '
    );
    const [sep] = glyphs(line);
    expect(sep.fill).toBe('#aabbcc');
    expect(sep.base).toBe('#112233');
  });

  it('when only one side has a background, the arrow uses that background as fill with no base', () => {
    const [line] = renderPowerlineLines(
      [[w('model', { backgroundColor: 'hex:112233' }), w('git-branch')]],
      pl(),
      ' '
    );
    const [sep] = glyphs(line);
    expect(sep.fill).toBe('#112233');
    expect(sep.base).toBeUndefined();
  });

  it('padding is included inside the colored segment (one blank token before and after)', () => {
    const [line] = renderPowerlineLines(
      [[w('model', { backgroundColor: 'hex:112233' })]],
      pl(),
      ' '
    );
    const [seg] = widgets(line);
    expect(segText(seg)).toBe(' Model: Claude ');
    expect(seg.bg).toBe('#112233');
  });

  it('no arrow is inserted between merged widgets; no-padding merge removes the adjacent inner padding', () => {
    const [line] = renderPowerlineLines(
      [[w('git-insertions', { merge: 'no-padding' }), w('git-deletions')]],
      pl(),
      ' '
    );
    expect(kinds(line)).toEqual(['widget', 'widget']);
    const [a, b] = widgets(line);
    expect(segText(a)).toBe(' +42'); // trailing padding is omitted
    expect(segText(b)).toBe('-10 '); // leading padding is omitted
  });

  it('a manual separator widget is invisible under powerline, but still breaks a merge', () => {
    const [line] = renderPowerlineLines(
      [[w('model', { merge: true }), w('separator'), w('git-branch')]],
      pl(),
      ' '
    );
    // the separator itself disappears, but since it breaks the merge, an arrow still appears between the two segments
    expect(kinds(line)).toEqual(['widget', 'glyph', 'widget']);
  });
});

describe('renderPowerlineLines — themes', () => {
  it('a theme picks a tier by colorLevel and cycles colors (truecolor)', () => {
    const theme = POWERLINE_THEMES['nord-aurora'];
    const [line] = renderPowerlineLines(
      [[w('model'), w('git-branch'), w('git-changes')]],
      pl({ theme: 'nord-aurora' }),
      ' ',
      { colorLevel: 3 }
    );
    const segs = widgets(line);
    expect(segs[0].bg).toBe(`#${theme[3].bg[0].slice(4)}`);
    expect(segs[1].bg).toBe(`#${theme[3].bg[1].slice(4)}`);
    expect(segs[2].bg).toBe(`#${theme[3].bg[2].slice(4)}`);
  });

  it('a merge group shares a single theme color slot', () => {
    const [line] = renderPowerlineLines(
      [[w('model', { merge: true }), w('git-branch'), w('git-changes')]],
      pl({ theme: 'nord-aurora' }),
      ' ',
      { colorLevel: 3 }
    );
    const segs = widgets(line);
    expect(segs[0].bg).toBe(segs[1].bg); // merge group shares one color
    expect(segs[2].bg).not.toBe(segs[1].bg); // the next group advances to slot 1
  });

  it('continueThemeAcrossLines keeps the theme color sequence going across lines', () => {
    const theme = POWERLINE_THEMES['nord-aurora'];
    const [, line2] = renderPowerlineLines(
      [[w('model'), w('git-branch')], [w('git-changes')]],
      pl({ theme: 'nord-aurora', continueThemeAcrossLines: true }),
      ' ',
      { colorLevel: 3 }
    );
    expect(widgets(line2)[0].bg).toBe(`#${theme[3].bg[2].slice(4)}`);
  });

  it('without continuation enabled, each line restarts its theme color from the beginning', () => {
    const theme = POWERLINE_THEMES['nord-aurora'];
    const [, line2] = renderPowerlineLines(
      [[w('model'), w('git-branch')], [w('git-changes')]],
      pl({ theme: 'nord-aurora' }),
      ' ',
      { colorLevel: 3 }
    );
    expect(widgets(line2)[0].bg).toBe(`#${theme[3].bg[0].slice(4)}`);
  });

  it("theme='custom' uses the widget's own colors", () => {
    const [line] = renderPowerlineLines(
      [[w('model', { backgroundColor: 'hex:123456' })]],
      pl({ theme: 'custom' }),
      ' '
    );
    expect(widgets(line)[0].bg).toBe('#123456');
  });

  it('theme list includes custom plus all 10 official themes, with display names matching the TUI', () => {
    expect(POWERLINE_THEME_NAMES).toContain('custom');
    expect(POWERLINE_THEME_NAMES).toHaveLength(11);
    // order and labels are copied from the ccstatusline TUI theme picker (nord-aurora is the default theme, marked "(original)")
    expect(POWERLINE_THEME_OPTIONS.map(o => o.label)).toEqual([
      'Custom',
      'Nord',
      'Nord Aurora (original)',
      'Monokai',
      'Solarized',
      'Minimal',
      'Dracula',
      'Catppuccin',
      'Gruvbox',
      'One Dark',
      'Tokyo Night'
    ]);
    expect(
      POWERLINE_THEME_OPTIONS.find(o => o.label === 'Tokyo Night')?.value
    ).toBe('tokyonight');
  });
});

describe('renderPowerlineLines — cross-line index and separator cycling', () => {
  it('multiple separator glyphs cycle across lines by global slot', () => {
    const cfg = pl({
      separators: ['\uE0B0', '\uE0B4'],
      separatorInvertBackground: [false, false]
    });
    const bg = { backgroundColor: 'hex:112233' };
    const [l1, l2] = renderPowerlineLines(
      [
        [w('model', bg), w('git-branch', bg), w('git-changes', bg)],
        [w('version', bg), w('git-sha', bg)]
      ],
      cfg,
      ' '
    );
    // line 1 consumes slots 0 and 1; line 2 continues from slot 2 (=0)
    expect(glyphs(l1).map(s => s.glyph)).toEqual(['\uE0B0', '\uE0B4']);
    expect(glyphs(l2).map(s => s.glyph)).toEqual(['\uE0B0']);
  });
});

describe('renderPowerlineLines — caps and flex', () => {
  it('emits a start/end cap at the line start/end, filled with the adjacent segment background', () => {
    const [line] = renderPowerlineLines(
      [[w('model', { backgroundColor: 'hex:112233' })]],
      pl({ startCaps: ['\uE0B6'], endCaps: ['\uE0B4'] }),
      ' '
    );
    expect(kinds(line)).toEqual(['glyph', 'widget', 'glyph']);
    const [start, end] = glyphs(line);
    expect(start.glyph).toBe('\uE0B6');
    expect(start.fill).toBe('#112233');
    expect(end.glyph).toBe('\uE0B4');
    expect(end.fill).toBe('#112233');
  });

  it('flex-separator splits segment groups: preceding end cap + flexible gap + following start cap, with cap slots advancing', () => {
    const [line] = renderPowerlineLines(
      [
        [
          w('model', { backgroundColor: 'hex:111111' }),
          w('flex-separator'),
          w('git-branch', { backgroundColor: 'hex:222222' })
        ]
      ],
      pl({ startCaps: ['\uE0B6', '\uE0B2'], endCaps: ['\uE0B4', '\uE0B0'] }),
      ' '
    );
    expect(kinds(line)).toEqual([
      'glyph',
      'widget',
      'glyph',
      'flex',
      'glyph',
      'widget',
      'glyph'
    ]);
    const g = glyphs(line);
    expect(g[0].glyph).toBe('\uE0B6'); // segment 0 start cap
    expect(g[1].glyph).toBe('\uE0B4'); // segment 0 end cap
    expect(g[2].glyph).toBe('\uE0B2'); // segment 1 start cap (slot +1)
    expect(g[3].glyph).toBe('\uE0B0'); // segment 1 end cap
    // only 4 glyphs total — no extra plain separator arrow at the flex boundary
  });

  it('a flex-separator at the start of the line produces a leading flexible gap (right-aligning the whole line)', () => {
    const [line] = renderPowerlineLines(
      [[w('flex-separator'), w('model')]],
      pl(),
      ' '
    );
    expect(kinds(line)).toEqual(['flex', 'widget']);
  });
});

describe('renderPowerlineLines — autoAlign and colorLevel', () => {
  it('autoAlign pads shorter segments in the same column with spaces to the max width', () => {
    const [l1, l2] = renderPowerlineLines(
      [[w('git-insertions')], [w('git-origin-owner-repo')]], // +42 vs owner/repo
      pl({ autoAlign: true }),
      ' '
    );
    const t1 = segText(widgets(l1)[0]);
    const t2 = segText(widgets(l2)[0]);
    expect(visibleWidth(t1)).toBe(visibleWidth(t2));
    expect(t1.endsWith('  ')).toBe(true);
  });

  it('excludeFromAutoAlign keeps the flagged widget at its natural width', () => {
    const [l1, l2] = renderPowerlineLines(
      [
        [w('git-insertions', { excludeFromAutoAlign: true })],
        [w('git-origin-owner-repo')]
      ],
      pl({ autoAlign: true }),
      ' '
    );
    const t1 = segText(widgets(l1)[0]);
    const t2 = segText(widgets(l2)[0]);
    expect(visibleWidth(t1)).toBe(visibleWidth(' +42 '));
    expect(visibleWidth(t1)).not.toBe(visibleWidth(t2));
  });

  it('excludeFromAutoAlign stops alignment for the rest of the line but keeps earlier columns aligned', () => {
    const [l1, l2] = renderPowerlineLines(
      [
        [
          w('git-insertions'),
          w('git-insertions', { excludeFromAutoAlign: true })
        ],
        [w('git-origin-owner-repo'), w('git-origin-owner-repo')]
      ],
      pl({ autoAlign: true }),
      ' '
    );
    // Column 0 still aligns across lines…
    expect(visibleWidth(segText(widgets(l1)[0]))).toBe(
      visibleWidth(segText(widgets(l2)[0]))
    );
    // …while the excluded widget keeps its natural width.
    expect(visibleWidth(segText(widgets(l1)[1]))).toBe(visibleWidth(' +42 '));
  });

  it('colorLevel=0 outputs no color at all', () => {
    const [line] = renderPowerlineLines(
      [
        [
          w('model', { backgroundColor: 'hex:112233', color: 'hex:aabbcc' }),
          w('git-branch', { backgroundColor: 'hex:445566' })
        ]
      ],
      pl({ theme: 'nord' }),
      ' ',
      { colorLevel: 0 }
    );
    const [seg] = widgets(line);
    expect(seg.bg).toBeUndefined();
    expect(seg.tokens.every(t => !t.style?.color && !t.cls)).toBe(true);
    const [sep] = glyphs(line);
    expect(sep.fill).toBeUndefined();
    expect(sep.base).toBeUndefined();
  });

  it('colorLevel=1 uses the theme 16-color tier (named background colors)', () => {
    const [line] = renderPowerlineLines(
      [[w('model')]],
      pl({ theme: 'nord' }),
      ' ',
      { colorLevel: 1 }
    );
    // nord level-1's first bg is bgBrightCyan (#34e2e2)
    expect(widgets(line)[0].bg).toBe('#34e2e2');
  });
});

describe('renderPowerlineLines — global overrides', () => {
  it('a solid-color overrideFg overrides the theme foreground but leaves the background untouched', () => {
    const [line] = renderPowerlineLines(
      [[w('model')]],
      pl({ theme: 'nord' }),
      ' ',
      { colorLevel: 3, overrideFg: 'hex:ff0000' }
    );
    const [seg] = widgets(line);
    const textTok = seg.tokens.find(t => t.text.trim());
    expect(textTok?.style?.color).toBe('#ff0000');
    expect(seg.bg).toBe('#88C0D0'); // nord truecolor tier's first background stays unchanged
  });

  it('globalBold bolds all segments', () => {
    const [line] = renderPowerlineLines([[w('model')]], pl(), ' ', {
      globalBold: true
    });
    const textTok = widgets(line)[0].tokens.find(t => t.text.trim());
    expect(textTok?.style?.fontWeight).toBe('700');
  });
});
