import { describe, expect, it } from 'vitest';
import { renderWidget } from '@/preview/renderers';
import type { Widget } from '@/widgets';

const w = (type: string, extra: Partial<Widget> = {}): Widget => ({
  id: 'test-id',
  type,
  ...extra
});

describe('renderWidget — layout placeholders', () => {
  it('flex-separator shows a hint in editor mode and disappears in preview mode', () => {
    expect(
      renderWidget(w('flex-separator'), 'editor')
        .map(t => t.text)
        .join('')
    ).toBe('← flex →');
    expect(renderWidget(w('flex-separator'), 'preview')).toEqual([]);
  });
  it('a space separator shows a visible placeholder in editor mode', () => {
    expect(renderWidget(w('separator', { character: ' ' }), 'editor')).toEqual([
      { text: 'space', cls: 'text-zinc-500 italic' }
    ]);
  });
  it('an unknown widget type is highlighted in red', () => {
    expect(renderWidget(w('does-not-exist'), 'editor')).toEqual([
      { text: 'does-not-exist', cls: 'text-red-400' }
    ]);
  });
});

describe('renderWidget — style stacking', () => {
  it('bold sets fontWeight', () => {
    const [tok] = renderWidget(w('model', { bold: true }));
    expect(tok.style?.fontWeight).toBe('700');
  });
  it('dim=true reduces opacity across the whole token', () => {
    const [tok] = renderWidget(w('model', { dim: true }));
    expect(tok.style?.opacity).toBe('0.55');
  });
  it("dim='parens' reduces opacity only for the parenthesized segment", () => {
    // git-changes catalog default is (+42,-10), fully wrapped in parentheses.
    const [tok] = renderWidget(w('git-changes', { dim: 'parens' }));
    expect(tok.text).toBe('(+42,-10)');
    expect(tok.style?.opacity).toBe('0.55');
  });
  it('background color adds padding and rounded corners', () => {
    const [tok] = renderWidget(w('model', { backgroundColor: 'hex:333333' }));
    expect(tok.style?.backgroundColor).toBe('#333333');
    expect(tok.style?.padding).toBe('0 2px');
  });
  it('gradient foreground uses background-clip:text, with transparent text', () => {
    const [tok] = renderWidget(w('model', { color: 'gradient:rainbow' }));
    expect(tok.style?.color).toBe('transparent');
    expect(tok.style?.backgroundImage).toContain('linear-gradient');
  });
});

describe('renderWidget — global overrides', () => {
  it("overrideFg takes precedence over the widget's own foreground color", () => {
    const [tok] = renderWidget(w('model'), 'editor', {
      overrideFg: 'hex:ff0000'
    });
    expect(tok.style?.color).toBe('#ff0000');
  });
  it('globalBold forces bold', () => {
    const [tok] = renderWidget(w('model'), 'editor', { globalBold: true });
    expect(tok.style?.fontWeight).toBe('700');
  });
});

describe('renderWidget — color depth downgrade (colorLevel)', () => {
  const fg = (color: string, level: number) =>
    renderWidget(w('model', { color }), 'preview', { colorLevel: level })[0];

  it('level 3 (truecolor) keeps hex as-is', () => {
    expect(fg('hex:1af2c3', 3).style?.color).toBe('#1af2c3');
  });
  it('level 2 (256) quantizes hex to the nearest xterm-256 color', () => {
    const tok = fg('hex:ff0000', 2);
    // pure red already lands on the 256 palette, so it stays red after quantization
    expect(tok.style?.color).toBe('#ff0000');
    // an arbitrary truecolor gets snapped to the 256 grid — it changes but remains an inline color
    expect(fg('hex:1af2c3', 2).style?.color).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('level 1 (16) snaps hex to the nearest named color and reuses its class (no inline color)', () => {
    const tok = fg('hex:00ff00', 1);
    expect(tok.style?.color).toBeUndefined();
    expect(tok.cls).toBe('text-emerald-400'); // nearest named color = green (Tango #4e9a06)
  });
  it('level 0 (monochrome) strips all color, falling back to the default foreground', () => {
    const tok = fg('hex:00ff00', 0);
    expect(tok.style?.color).toBeUndefined();
    expect(tok.cls).toBeUndefined();
  });
  it('a named color always keeps its tuned class at level >= 1', () => {
    expect(
      renderWidget(w('model', { color: 'cyan' }), 'preview', {
        colorLevel: 1
      })[0].cls
    ).toBe('text-cyan-300');
    expect(
      renderWidget(w('model', { color: 'cyan' }), 'preview', {
        colorLevel: 2
      })[0].cls
    ).toBe('text-cyan-300');
  });
  it('a gradient collapses to the nearest named color at level 1 (terminals cannot render truecolor gradients)', () => {
    const tok = renderWidget(
      w('model', { color: 'gradient:rainbow' }),
      'preview',
      { colorLevel: 1 }
    )[0];
    expect(tok.style?.backgroundImage).toBeUndefined();
    expect(tok.cls).toBeTruthy();
  });
  it('level 0 also strips the background color', () => {
    const tok = renderWidget(
      w('model', { backgroundColor: 'hex:333333' }),
      'preview',
      { colorLevel: 0 }
    )[0];
    expect(tok.style?.backgroundColor).toBeUndefined();
  });
});

describe('renderWidget — bar character splitting and inline color', () => {
  it('bar characters are split into individual tokens with the ccse-bar class, but the joined text stays the same', () => {
    const tokens = renderWidget(w('context-bar'));
    expect(tokens.map(t => t.text).join('')).toBe(
      'Context: [████░░░░░░░░░░░░] 50k/200k (25%)'
    );
    expect(tokens.some(t => t.cls?.includes('ccse-bar'))).toBe(true);
  });
  it('ansi256 / hex foreground resolves to an inline color', () => {
    expect(
      renderWidget(w('model', { color: 'ansi256:196' }))[0].style?.color
    ).toBe('#ff0000');
    expect(
      renderWidget(w('model', { color: 'hex:00ff00' }))[0].style?.color
    ).toBe('#00ff00');
  });
  it("dim='parens' dims only the parenthesized segment; segments outside parens have no opacity", () => {
    const tokens = renderWidget(
      w('custom-text', { customText: 'a (b) c', dim: 'parens' })
    );
    expect(tokens.map(t => t.text).join('')).toBe('a (b) c');
    expect(tokens.find(t => t.text === '(b)')?.style?.opacity).toBe('0.55');
    expect(tokens.find(t => t.text === 'a ')?.style?.opacity).toBeUndefined();
  });
});
