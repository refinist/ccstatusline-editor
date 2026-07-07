// Typing-time rules for NumberField inputs are deliberately loose: digits only,
// capped at the field's DIGIT BUDGET (as many digits as its max has — so a 0–60
// field accepts two digits, letting you type "95" freely). Whether the number is
// actually in range is judged on blur, by NumberField's own :min/:max clamping —
// rejecting keystrokes against the live value ("9" then "5" > 60, key eaten)
// feels broken mid-edit.
const DEFAULT_MAX_DIGITS = 5; // fields without a max (e.g. refresh interval)

function digitBudget(max?: number): number {
  return max === undefined ? DEFAULT_MAX_DIGITS : String(max).length;
}

/** `beforeinput` guard: reject non-digit keys and digits beyond the budget. */
export function guardNumberInput(e: Event, max?: number): void {
  const { data, target } = e as InputEvent;
  if (data == null) return; // deletion / cut / paste (dataTransfer) — scrub handles those
  if (/\D/.test(data)) return e.preventDefault();
  const el = target as HTMLInputElement;
  const next =
    el.value.slice(0, el.selectionStart ?? el.value.length) +
    data +
    el.value.slice(el.selectionEnd ?? el.value.length);
  if (next.length > digitBudget(max)) e.preventDefault();
}

/**
 * `input`-event companion, for what preventDefault can't stop: IME composition
 * (`insertCompositionText` is non-cancelable by spec, so Chinese/Japanese input
 * sails past beforeinput) and paste (whose data rides in dataTransfer, not
 * `data`). Scrubs to digits-within-budget in place and re-dispatches `input` so
 * the NumberField re-reads the clean text — the re-dispatch can't loop, because
 * a clean value scrubs to itself.
 */
export function scrubNumberInput(e: Event, max?: number): void {
  const el = e.target as HTMLInputElement;
  const clean = el.value.replace(/\D/g, '').slice(0, digitBudget(max));
  if (clean === el.value) return;
  el.value = clean;
  el.setSelectionRange(clean.length, clean.length);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
