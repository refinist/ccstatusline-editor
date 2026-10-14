import { describe, expect, it } from 'vitest';
import {
  formatCost,
  formatSpeed,
  formatTokens,
  formatUsageCurrency,
  resolveNumberFormat
} from '@/lib/numberFormat';

describe('number format', () => {
  it('keeps the historical token strings when no format is set', () => {
    expect(formatTokens(18600)).toBe('18.6k');
    expect(formatTokens(12000)).toBe('12.0k');
    expect(formatTokens(200000)).toBe('200.0k');
    expect(formatTokens(999950)).toBe('1.0M');
  });

  it('compacts trailing zeros and can drop decimals', () => {
    expect(formatTokens(12000, { style: 'compact' })).toBe('12k');
    expect(formatTokens(18600, { style: 'whole' })).toBe('19k');
    expect(formatCost(2.45)).toBe('$2.45');
    expect(formatCost(4.9, { style: 'whole' })).toBe('$5');
    expect(formatSpeed(85.2)).toBe('85.2 t/s');
    expect(formatUsageCurrency(3894)).toBe('$3,894.00');
    expect(formatUsageCurrency(3894 / 20)).toBe('$194.70');
  });

  it('lets a global kind override the widget format', () => {
    expect(
      resolveNumberFormat(
        'token',
        { style: 'compact' },
        { token: { style: 'whole' } }
      ).style
    ).toBe('whole');
    expect(
      resolveNumberFormat('cost', { decimals: 0 }, undefined).decimals
    ).toBe(0);
  });
});
