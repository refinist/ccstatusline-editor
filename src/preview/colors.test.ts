import { describe, expect, it } from 'vitest';
import {
  ansi256ToHex,
  colorClass,
  GRADIENT_PRESETS,
  NAMED_BG_COLORS,
  parseGradientStops,
  resolveBgCss,
  resolveFgCss,
  swatchCss
} from '@/preview/colors';

describe('ansi256ToHex', () => {
  // codes 0-15 map to named colors; then a 6x6x6 color cube; the last 24 are grayscale levels.
  it.each([
    [0, '#000000'], // named color: black
    [15, '#eeeeec'], // named color: brightWhite
    [16, '#000000'], // cube start (0,0,0)
    [21, '#0000ff'], // cube: pure blue
    [46, '#00ff00'], // cube: pure green
    [196, '#ff0000'], // cube: pure red
    [231, '#ffffff'], // cube end (255,255,255)
    [232, '#080808'], // grayscale start
    [244, '#808080'], // grayscale midpoint
    [255, '#eeeeee'] // grayscale end
  ])('ansi256:%i → %s', (n, hex) => {
    expect(ansi256ToHex(n)).toBe(hex);
  });
});

describe('resolveFgCss', () => {
  it('empty value returns undefined', () => {
    expect(resolveFgCss(undefined)).toBeUndefined();
    expect(resolveFgCss('')).toBeUndefined();
  });
  it('gradient prefix is handled by dedicated logic; here it returns undefined', () => {
    expect(resolveFgCss('gradient:rainbow')).toBeUndefined();
  });
  it('hex: prefix → #RRGGBB', () => {
    expect(resolveFgCss('hex:ff8800')).toBe('#ff8800');
  });
  it('ansi256: prefix goes through ansi256ToHex', () => {
    expect(resolveFgCss('ansi256:196')).toBe('#ff0000');
  });
  it('ansi256: an invalid number falls back to 0 (black)', () => {
    expect(resolveFgCss('ansi256:bad')).toBe('#000000');
  });
  it('named colors are looked up in the ccstatusline truecolor palette', () => {
    expect(resolveFgCss('cyan')).toBe('#06989a');
    expect(resolveFgCss('brightBlue')).toBe('#729fcf');
  });
  it('unknown name → undefined', () => {
    expect(resolveFgCss('chartreuse')).toBeUndefined();
  });
});

describe('resolveBgCss', () => {
  it('hex: / ansi256: behave the same as foreground', () => {
    expect(resolveBgCss('hex:333333')).toBe('#333333');
    expect(resolveBgCss('ansi256:16')).toBe('#000000');
  });
  it('bg<Name> prefix is stripped, then looked up', () => {
    expect(resolveBgCss('bgRed')).toBe('#cc0000');
    expect(resolveBgCss('bgBrightBlue')).toBe('#729fcf');
  });
  it('a bare named color also resolves (used for swatches)', () => {
    expect(resolveBgCss('red')).toBe('#cc0000');
  });
  it('every NAMED_BG_COLORS entry resolves to a color', () => {
    for (const name of NAMED_BG_COLORS) {
      expect(resolveBgCss(name)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('swatchCss', () => {
  it('background color takes priority, then foreground color', () => {
    expect(swatchCss('bgRed')).toBe('#cc0000');
    expect(swatchCss('hex:abcabc')).toBe('#abcabc');
    expect(swatchCss('cyan')).toBe('#06989a');
  });
});

describe('parseGradientStops', () => {
  it('a preset name (case-insensitive) expands to its stops', () => {
    expect(parseGradientStops('gradient:rainbow')).toHaveLength(
      GRADIENT_PRESETS.rainbow.length
    );
    expect(parseGradientStops('gradient:RAINBOW')).toHaveLength(
      GRADIENT_PRESETS.rainbow.length
    );
  });
  it('comma-separated hex list', () => {
    expect(parseGradientStops('gradient:#ff0000,#00ff00,#0000ff')).toEqual([
      '#ff0000',
      '#00ff00',
      '#0000ff'
    ]);
  });
  it('hyphen-separated hex list', () => {
    expect(parseGradientStops('gradient:#ff0000-#00ff00')).toEqual([
      '#ff0000',
      '#00ff00'
    ]);
  });
  it('stops support the hex: prefix form', () => {
    expect(parseGradientStops('gradient:hex:ff0000-hex:00ff00')).toEqual([
      '#ff0000',
      '#00ff00'
    ]);
  });
  it('non-gradient: prefix → null', () => {
    expect(parseGradientStops('cyan')).toBeNull();
  });
  it('empty content → null', () => {
    expect(parseGradientStops('gradient:')).toBeNull();
  });
  it('fewer than 2 valid stops → null', () => {
    expect(parseGradientStops('gradient:#ff0000')).toBeNull(); // only 1
    expect(parseGradientStops('gradient:#zzzzzz,#yyyyyy')).toBeNull(); // all invalid
  });
});

describe('colorClass', () => {
  it('hits a tuned tailwind class; misses fall back to a safe default', () => {
    expect(colorClass('cyan')).toBe('text-cyan-300');
    expect(colorClass()).toBe('text-zinc-200');
    expect(colorClass('chartreuse')).toBe('text-zinc-200');
  });
});
