import { describe, expect, it } from 'vitest';
import {
  buildRotateFileCommand,
  buildRotationBundle,
  isRotationBundle,
  makeBundleFilename
} from '@/lib/rotationBundle';
import { defaultConfig } from '@/widgets';

describe('makeBundleFilename', () => {
  it('is a ccsa-rotation-<slug>.json name with a 6-char base36 slug', () => {
    expect(makeBundleFilename()).toMatch(/^ccsa-rotation-[a-z0-9]{6}\.json$/);
  });

  it('never reuses a name — this is the whole point, so a repeat download cannot collide', () => {
    const names = new Set(
      Array.from({ length: 1000 }, () => makeBundleFilename())
    );
    // 36^6 keyspace: 1000 draws colliding is astronomically unlikely, so a dupe
    // here means the slug lost its entropy (e.g. a constant crept into randomSlug).
    expect(names.size).toBe(1000);
  });
});

describe('buildRotateFileCommand', () => {
  it('points -f at the given filename under ~/Downloads', () => {
    expect(buildRotateFileCommand('ccsa-rotation-k3f9a2.json')).toBe(
      'npx -y @refinist/ccsa@latest rotate on -f ~/Downloads/ccsa-rotation-k3f9a2.json'
    );
  });

  it('stays in lockstep with a makeBundleFilename() name', () => {
    const name = makeBundleFilename();
    expect(buildRotateFileCommand(name)).toBe(
      `npx -y @refinist/ccsa@latest rotate on -f ~/Downloads/${name}`
    );
  });
});

describe('isRotationBundle', () => {
  const theme = () => ({ name: 'A', config: defaultConfig() });

  it('accepts a well-formed bundle with a preset period', () => {
    expect(
      isRotationBundle({
        version: 1,
        period: 'day',
        strategy: 'cycle',
        themes: [theme()]
      })
    ).toBe(true);
  });

  it('accepts a custom-interval period and an empty pool', () => {
    expect(
      isRotationBundle({
        version: 1,
        period: { every: 30, unit: 'minute' },
        strategy: 'random',
        themes: []
      })
    ).toBe(true);
  });

  it('accepts the optional weekly preset marker and rejects an unknown one', () => {
    expect(
      isRotationBundle({
        version: 1,
        period: 'day',
        strategy: 'cycle',
        preset: 'weekly',
        themes: [theme()]
      })
    ).toBe(true);
    expect(
      isRotationBundle({
        version: 1,
        period: 'day',
        strategy: 'cycle',
        preset: 'monthly',
        themes: [theme()]
      })
    ).toBe(false);
  });

  it('rejects malformed bundles — bad version/period/strategy/themes/config', () => {
    const bad: unknown[] = [
      null,
      'nope',
      { version: 2, period: 'day', strategy: 'cycle', themes: [] },
      { version: 1, period: 'fortnight', strategy: 'cycle', themes: [] },
      {
        version: 1,
        period: { every: 5, unit: 'year' },
        strategy: 'cycle',
        themes: []
      },
      { version: 1, period: 'day', strategy: 'spiral', themes: [] },
      { version: 1, period: 'day', strategy: 'cycle', themes: {} },
      // a theme missing its name
      {
        version: 1,
        period: 'day',
        strategy: 'cycle',
        themes: [{ config: defaultConfig() }]
      },
      // a theme whose config isn't a valid ccstatusline config
      {
        version: 1,
        period: 'day',
        strategy: 'cycle',
        themes: [{ name: 'A', config: { nope: true } }]
      }
    ];
    for (const value of bad) expect(isRotationBundle(value)).toBe(false);
  });
});

describe('buildRotationBundle', () => {
  const themes = [{ name: 'A', config: defaultConfig() }];

  it('omits the preset key entirely for an ordinary pool', () => {
    const b = buildRotationBundle('day', 'cycle', themes);
    expect('preset' in b).toBe(false);
    // and the exported JSON stays byte-identical to a pre-preset bundle
    expect(JSON.parse(JSON.stringify(b)).preset).toBeUndefined();
  });

  it('stamps preset when the weekly plan passes it', () => {
    const b = buildRotationBundle('day', 'cycle', themes, 'weekly');
    expect(b.preset).toBe('weekly');
    expect(isRotationBundle(b)).toBe(true);
  });
});
