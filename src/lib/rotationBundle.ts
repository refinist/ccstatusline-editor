import { isCcStatusConfig } from '@/lib/shareConfig';
import type { CcStatusConfig } from '@/widgets';

// The rotation-bundle contract shared with @refinist/ccsa (`ccsa rotate on`) —
// mirror of RotationBundle in the CLI's src/rotate.ts. The bundle's `version`
// is its own schema version (same field name as a ccstatusline config's
// `version`, just one level up — each theme's nested `config.version` is a
// separate number), currently always 1: older CLIs reject newer bundles with
// an "upgrade ccsa" error.
export type RotationPeriodPreset = 'hour' | 'day' | 'week';
export type CustomPeriodUnit = 'minute' | 'hour' | 'day';
/** An arbitrary interval, counted from the moment rotation is turned on. */
export interface CustomPeriod {
  every: number;
  unit: CustomPeriodUnit;
}
export type RotationPeriod = RotationPeriodPreset | CustomPeriod;
export type RotationStrategy = 'cycle' | 'random';

// Marks a bundle as one of the editor's built-in plans. It rides alongside the
// ordinary period/strategy/themes (the weekly plan really is a `day` + `cycle`
// rotation over seven weekday themes) and never changes how the CLI rotates — it
// only lets us recognize our own plan on re-import and restore that mode (see
// the store's loadBundle) instead of a plain daily rotation. Optional and
// additive, so bundles stay version 1 and already-released CLIs ignore it.
export type RotationPreset = 'weekly';

// The custom count is 1–100 for every unit — keeps the field narrow and rules
// out absurd bundles.
export const MAX_CUSTOM_EVERY = 100;

// Pool ceiling. Generous for real use (hourly rotation fills a day with 24
// slots; most pools are single digits) while keeping the page snappy — every
// card renders a live terminal preview — and drag-sorting manageable.
export const MAX_POOL_THEMES = 20;

// Theme-name length cap — names are labels for `rotate status` and the pool
// cards, not prose; 20 chars fits the widest bundled template name with room.
export const MAX_THEME_NAME = 20;

export interface RotationTheme {
  name: string;
  config: CcStatusConfig;
}

export interface RotationBundle {
  version: 1;
  period: RotationPeriod;
  strategy: RotationStrategy;
  themes: RotationTheme[];
  /** Built-in plan marker (see RotationPreset); absent for hand-built pools. */
  preset?: RotationPreset;
}

function isRotationPeriod(value: unknown): value is RotationPeriod {
  if (typeof value === 'string') return ['hour', 'day', 'week'].includes(value);
  if (!value || typeof value !== 'object') return false;
  const p = value as { every?: unknown; unit?: unknown };
  return (
    typeof p.every === 'number' &&
    Number.isFinite(p.every) &&
    typeof p.unit === 'string' &&
    ['minute', 'hour', 'day'].includes(p.unit)
  );
}

/**
 * Runtime guard for a bundle parsed from an imported file — the reverse side of
 * buildRotationBundle. Shallow but honest, in the same spirit as isCcStatusConfig:
 * it checks the shape the ccsa contract needs and defers each theme's config to
 * isCcStatusConfig. Stays lenient on the custom interval's exact range — the store
 * clamps every/unit when it loads the bundle.
 */
export function isRotationBundle(value: unknown): value is RotationBundle {
  if (!value || typeof value !== 'object') return false;
  const b = value as Record<string, unknown>;
  if (b.version !== 1) return false;
  if (!isRotationPeriod(b.period)) return false;
  if (
    typeof b.strategy !== 'string' ||
    !['cycle', 'random'].includes(b.strategy)
  )
    return false;
  // Optional plan marker — accept it absent, reject an unknown value (matches the
  // CLI's validateBundle). The store re-checks the day/cycle/7-theme shape before
  // trusting it enough to restore weekly mode.
  if (b.preset !== undefined && b.preset !== 'weekly') return false;
  if (!Array.isArray(b.themes)) return false;
  return b.themes.every(
    theme =>
      !!theme &&
      typeof theme === 'object' &&
      typeof (theme as { name?: unknown }).name === 'string' &&
      isCcStatusConfig((theme as { config?: unknown }).config)
  );
}

// Basename for the downloaded bundle. makeBundleFilename() drops a random slug
// between this and `.json`, so every download is uniquely named: the browser has no
// same-name file to collide with, never appends " (1)", and the `-f` command always
// points at the file that just landed. We can't read back the real saved name (the
// download API gives no receipt), so unique-by-construction is the closest we get to
// keeping command and file in sync.
const BUNDLE_FILENAME_BASE = 'ccsa-rotation';

// Lowercase base36 — safe in any filename, nothing a browser would sanitize.
const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SLUG_LENGTH = 6;

function randomSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SLUG_LENGTH));
  let slug = '';
  for (const byte of bytes) slug += SLUG_ALPHABET[byte % SLUG_ALPHABET.length];
  return slug;
}

/**
 * A freshly-named bundle file, e.g. `ccsa-rotation-k3f9a2.json`. Call once per
 * download and feed the SAME value to both the download and buildRotateFileCommand —
 * generate it twice and the command names a different file than the one on disk.
 */
export function makeBundleFilename(): string {
  return `${BUNDLE_FILENAME_BASE}-${randomSlug()}.json`;
}

export function buildRotationBundle(
  period: RotationPeriod,
  strategy: RotationStrategy,
  themes: RotationTheme[],
  // Omitted for ordinary pools; set to 'weekly' for the built-in weekly plan.
  // Spread so the key is simply absent (not `preset: undefined`) when unset,
  // keeping the exported JSON identical to a pre-preset bundle.
  preset?: RotationPreset
): RotationBundle {
  return {
    version: 1,
    period,
    strategy,
    themes,
    ...(preset ? { preset } : {})
  };
}

/**
 * One-line variant: the whole bundle as a single-quoted JSON arg, same shell
 * escaping as buildApplyCommand. Only offered while it stays comfortably under
 * Windows cmd.exe's ~8k command-line limit (see commandTooLong) — the file
 * download + `-f` flow is the primary path.
 */
export function buildRotateOnCommand(bundle: RotationBundle): string {
  const json = JSON.stringify(bundle);
  const arg = json.split("'").join("'\\''");
  return `npx -y @refinist/ccsa@latest rotate on '${arg}'`;
}

// cmd.exe caps a command line at 8191 chars; leave headroom for the prompt/quoting
// differences across shells rather than sailing right up to the edge.
const COMMAND_LIMIT = 7000;
export function commandTooLong(cmd: string): boolean {
  return cmd.length > COMMAND_LIMIT;
}

/**
 * File variant: apply the downloaded bundle. Takes the filename so it stays in
 * lockstep with the makeBundleFilename() value used for this download. `~` works in
 * every POSIX shell and in PowerShell; the page's copy explains adjusting the path
 * if the file was saved elsewhere.
 */
export function buildRotateFileCommand(filename: string): string {
  return `npx -y @refinist/ccsa@latest rotate on -f ~/Downloads/${filename}`;
}

/** Full undo: unregister the scheduled job and restore the pre-rotation config. */
export const ROTATE_OFF_COMMAND = 'npx -y @refinist/ccsa@latest rotate off';
