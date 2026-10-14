// Port of ccstatusline v2.2.32 number-format helpers (utils/number-format.ts,
// utils/format-tokens.ts, the currency / byte / speed formatters). Empty format
// reproduces each formatter's historical output.

export const NUMBER_STYLES = ['precise', 'compact', 'whole'] as const;
export type NumberStyle = (typeof NUMBER_STYLES)[number];

export const NUMBER_KINDS = [
  'token',
  'speed',
  'percent',
  'memory',
  'cost'
] as const;
export type NumberKind = (typeof NUMBER_KINDS)[number];

export interface NumberFormat {
  style?: NumberStyle;
  decimals?: number;
}

export interface GlobalNumberFormat {
  token?: NumberFormat;
  speed?: NumberFormat;
  percent?: NumberFormat;
  memory?: NumberFormat;
  cost?: NumberFormat;
}

export function effectiveDecimals(
  format: NumberFormat,
  baselineDecimals: number
): number {
  if (format.style === 'whole') return 0;
  return format.decimals ?? baselineDecimals;
}

function trimTrailingZeros(value: string): string {
  return value.includes('.') ? value.replace(/\.?0+$/, '') : value;
}

export function renderMagnitude(
  value: number,
  format: NumberFormat,
  baselineDecimals: number
): string {
  const fixed = value.toFixed(effectiveDecimals(format, baselineDecimals));
  return format.style === 'compact' ? trimTrailingZeros(fixed) : fixed;
}

export function formatPercent(
  value: number,
  format: NumberFormat = {},
  baselineDecimals = 1
): string {
  return `${renderMagnitude(value, format, baselineDecimals)}%`;
}

export function formatCost(value: number, format: NumberFormat = {}): string {
  return `$${renderMagnitude(value, format, 2)}`;
}

export function formatTokens(
  count: number,
  format: NumberFormat = {},
  decimals = 1
): string {
  const kDecimals = effectiveDecimals(format, decimals);
  if (count >= 1000000 - 500 / 10 ** kDecimals)
    return `${renderMagnitude(count / 1000000, format, 1)}M`;
  if (count >= 1000)
    return `${renderMagnitude(count / 1000, format, decimals)}k`;
  return count.toString();
}

export function formatSpeed(
  tokensPerSec: number,
  format: NumberFormat = {}
): string {
  if (tokensPerSec >= 1000 - 0.5 / 10 ** effectiveDecimals(format, 1))
    return `${renderMagnitude(tokensPerSec / 1000, format, 1)}k t/s`;
  return `${renderMagnitude(tokensPerSec, format, 1)} t/s`;
}

export function formatBytes(bytes: number, format: NumberFormat = {}): string {
  const GB = 1024 ** 3;
  const MB = 1024 ** 2;
  const KB = 1024;
  if (bytes >= GB) return `${renderMagnitude(bytes / GB, format, 1)}G`;
  if (bytes >= MB) return `${renderMagnitude(bytes / MB, format, 0)}M`;
  if (bytes >= KB) return `${renderMagnitude(bytes / KB, format, 0)}K`;
  return `${bytes}B`;
}

export function formatUsageCurrency(
  amount: number,
  format: NumberFormat = {}
): string {
  const fractionDigits = effectiveDecimals(format, 2);
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: format.style === 'compact' ? 0 : fractionDigits,
    maximumFractionDigits: fractionDigits
  });
}

/** Global kind wins, then the widget's own format, then the formatter baseline. */
export function resolveNumberFormat(
  kind: NumberKind,
  itemFormat: NumberFormat | undefined,
  global: GlobalNumberFormat | undefined
): NumberFormat {
  return global?.[kind] ?? itemFormat ?? {};
}
