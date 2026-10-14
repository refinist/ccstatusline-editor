import type { NumberKind } from '@/lib/numberFormat';

const TOKEN = ['token'] as const;
const SPEED = ['speed'] as const;
const PERCENT = ['percent'] as const;
const MEMORY = ['memory'] as const;
const COST = ['cost'] as const;
const TOKEN_PERCENT = ['token', 'percent'] as const;

const WIDGET_NUMBER_KINDS: Record<string, readonly NumberKind[]> = {
  'tokens-input': TOKEN,
  'tokens-output': TOKEN,
  'tokens-cached': TOKEN,
  'tokens-total': TOKEN,
  'context-length': TOKEN,
  'context-window': TOKEN,
  'compaction-counter': TOKEN,
  'context-bar': TOKEN_PERCENT,
  'cache-read': TOKEN_PERCENT,
  'cache-write': TOKEN_PERCENT,
  'input-speed': SPEED,
  'output-speed': SPEED,
  'total-speed': SPEED,
  'context-percentage': PERCENT,
  'context-percentage-usable': PERCENT,
  'cache-hit-rate': PERCENT,
  'session-usage': PERCENT,
  'weekly-usage': PERCENT,
  'weekly-sonnet-usage': PERCENT,
  'weekly-opus-usage': PERCENT,
  'fable-weekly-usage': PERCENT,
  'extra-usage-utilization': PERCENT,
  'block-timer': PERCENT,
  'reset-timer': PERCENT,
  'weekly-reset-timer': PERCENT,
  'free-memory': MEMORY,
  'session-cost': COST,
  'session-cost-rate': COST,
  'extra-usage-remaining': COST,
  'extra-usage-used': COST,
  'extra-usage-daily-budget': COST
};

export function numberKindsFor(type: string): readonly NumberKind[] {
  return WIDGET_NUMBER_KINDS[type] ?? [];
}

export function supportsNumberFormat(type: string): boolean {
  return numberKindsFor(type).length > 0;
}
