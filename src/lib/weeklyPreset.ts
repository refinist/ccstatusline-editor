import { defaultConfig, type CcStatusConfig } from '@/widgets';
import { MAX_THEME_NAME, type RotationTheme } from './rotationBundle';

// The built-in "one fixed look per weekday" plan. Picking it in the period
// dropdown drops seven editor-default configs into the pool — one card per day,
// Sunday through Saturday — for the user to style one by one. Rotation then runs
// as a daily cycle over exactly those seven themes.
//
// Why a daily 7-theme cycle pins each card to a weekday: the CLI picks the theme
// with `slotIndex(date, 'day') % themeCount` (ccsa rotate.ts) — the count of
// local days since 1970-01-01, mod 7. That's a pure function of the calendar
// date, independent of when rotation was turned on, so with exactly seven themes
// a given pool position always lands on the same weekday.
//
// The catch: 1970-01-01 (the CLI's slot 0) was a THURSDAY, so pool index 0 is
// Thursday's slot, not Sunday's. We keep the pool — and the cards — in human
// Sunday→Saturday order for the UI, and rotate that into the epoch-aligned slot
// order only when exporting the bundle (toEpochOrder). So the cards read Sun…Sat
// while each still fires on its real weekday.

// 1970-01-01 (epoch day 0 = the CLI's daily slot 0) was this weekday. The
// Sunday→epoch rotation below is derived entirely from it.
export const EPOCH_WEEKDAY = 4; // Thursday (JS getDay(): 0 = Sunday)

/**
 * Seven editor-default themes in Sunday→Saturday order (index = JS weekday, so
 * 0 = Sunday). `dayLabel` supplies the localized weekday name baked into each
 * theme's name — the CLI needs a non-empty name, and it doubles as the card's
 * "which day is this" label. Each config is a fresh defaultConfig() clone, so the
 * user styles every day independently.
 */
export function buildWeeklyThemes(
  dayLabel: (weekday: number) => string
): RotationTheme[] {
  return Array.from({ length: 7 }, (_, weekday) => ({
    name: dayLabel(weekday).slice(0, MAX_THEME_NAME),
    config: defaultConfig()
  }));
}

/**
 * Re-order a Sunday-first weekly list into the CLI's epoch-aligned slot order for
 * export. The daily cycle shows pool[`days-since-epoch % 7`]; since epoch day 0
 * is a Thursday, slot `i` must hold the theme for weekday `(i + EPOCH_WEEKDAY) % 7`.
 * In a Sunday-first array that theme sits at index `(i + EPOCH_WEEKDAY) % 7`, so
 * slot `i` reads from there. A list that isn't exactly seven long has no weekday
 * alignment to honor and passes through untouched.
 */
export function toEpochOrder<T>(sundayFirst: readonly T[]): T[] {
  if (sundayFirst.length !== 7) return [...sundayFirst];
  return Array.from(
    { length: 7 },
    (_, slot) => sundayFirst[(slot + EPOCH_WEEKDAY) % 7] as T
  );
}

/**
 * The inverse of toEpochOrder: turn a CLI-ordered (epoch-aligned) weekly list
 * back into Sunday→Saturday display order. Used when re-importing a `preset:
 * 'weekly'` bundle, whose themes are stored in slot order — toEpochOrder put
 * weekday `w` at slot `(w + 7 - EPOCH_WEEKDAY) % 7`, so read it back from there.
 * A non-7 list passes through untouched. `fromEpochOrder(toEpochOrder(x)) === x`.
 */
export function fromEpochOrder<T>(epochOrder: readonly T[]): T[] {
  if (epochOrder.length !== 7) return [...epochOrder];
  return Array.from(
    { length: 7 },
    (_, weekday) => epochOrder[(weekday + 7 - EPOCH_WEEKDAY) % 7] as T
  );
}
