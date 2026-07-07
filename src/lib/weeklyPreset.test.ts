import { describe, expect, it } from 'vitest';
import { MAX_THEME_NAME } from '@/lib/rotationBundle';
import { isCcStatusConfig } from '@/lib/shareConfig';
import {
  buildWeeklyThemes,
  fromEpochOrder,
  toEpochOrder
} from '@/lib/weeklyPreset';

// English three-letter day names, indexed by JS weekday (0 = Sunday) — a
// stand-in for the i18n labels the page passes in.
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Mirror of the CLI's daily-cycle slot math (ccsa rotate.ts slotIndex('day') +
// themeIndexAt for a cycle): local calendar day count mod pool size. The plan's
// whole promise rests on this, so the alignment test derives its expectation
// from this independent copy rather than trusting toEpochOrder.
function cliThemeIndex(date: Date, poolSize: number): number {
  const days = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  );
  return days % poolSize;
}

describe('buildWeeklyThemes', () => {
  const themes = () => buildWeeklyThemes(w => DAYS[w]);

  it('is seven editor-default themes in Sunday→Saturday order', () => {
    const list = themes();
    expect(list).toHaveLength(7);
    list.forEach((theme, weekday) => {
      expect(theme.name).toBe(DAYS[weekday]);
      expect(isCcStatusConfig(theme.config)).toBe(true);
    });
  });

  it('keeps names non-empty and within the CLI/store cap', () => {
    for (const theme of themes()) {
      expect(theme.name.trim().length).toBeGreaterThan(0);
      expect(theme.name.length).toBeLessThanOrEqual(MAX_THEME_NAME);
    }
  });

  it('gives every day an independent config — styling one leaks into no other', () => {
    const list = themes();
    list[0].config.lines.push([]);
    expect(list[1].config.lines).not.toBe(list[0].config.lines);
    expect(list[6].config.lines.length).toBeLessThan(
      list[0].config.lines.length
    );
  });
});

describe('toEpochOrder', () => {
  it('leaves a non-7 list untouched (nothing to align)', () => {
    expect(toEpochOrder([1, 2, 3])).toEqual([1, 2, 3]);
    expect(toEpochOrder([])).toEqual([]);
  });

  it('rotates a Sunday-first week onto the epoch grid (slot 0 = Thursday)', () => {
    expect(toEpochOrder(DAYS)).toEqual([
      'Thu',
      'Fri',
      'Sat',
      'Sun',
      'Mon',
      'Tue',
      'Wed'
    ]);
  });

  // The core promise: whatever day the CLI wakes up on, the theme it picks under
  // its own slot math is the one named for that weekday. Walk a full week
  // (2026-07-05 was a Sunday) plus spot-checks far away — including the epoch day
  // and a leap day — deriving both the expected weekday and the slot index from
  // the real date.
  it('pins each exported theme to its weekday under the CLI slot math', () => {
    const exported = toEpochOrder(buildWeeklyThemes(w => DAYS[w]));
    const dates = [
      ...Array.from({ length: 7 }, (_, i) => new Date(2026, 6, 5 + i)),
      new Date(1970, 0, 1), // epoch day 0, a Thursday
      new Date(2024, 1, 29), // leap day
      new Date(2033, 11, 31)
    ];
    for (const date of dates) {
      const picked = exported[cliThemeIndex(date, exported.length)];
      expect(picked.name).toBe(DAYS[date.getDay()]);
    }
  });
});

describe('fromEpochOrder', () => {
  it('leaves a non-7 list untouched', () => {
    expect(fromEpochOrder([1, 2, 3])).toEqual([1, 2, 3]);
    expect(fromEpochOrder([])).toEqual([]);
  });

  it('is the exact inverse of toEpochOrder (round-trips both ways)', () => {
    expect(fromEpochOrder(toEpochOrder(DAYS))).toEqual(DAYS);
    const epoch = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
    expect(toEpochOrder(fromEpochOrder(epoch))).toEqual(epoch);
  });

  it('turns the CLI epoch order back into Sunday-first display order', () => {
    // slot 0 = Thursday, so the on-disk order is Thu..Wed; display wants Sun..Sat
    expect(
      fromEpochOrder(['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'])
    ).toEqual(DAYS);
  });
});
