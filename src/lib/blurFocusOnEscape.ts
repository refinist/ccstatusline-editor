// shadcn components tie their focus ring to :focus-visible (focus-visible:ring-3, etc).
// Clicking a control keeps it focused, but since it's a pointer interaction the
// browser doesn't consider it :focus-visible, so there's no ring at that point. If
// Esc is then pressed (a keyboard interaction), the browser re-evaluates the still-
// focused control as :focus-visible, leaving a stray focus ring behind.
//
// On Esc, we proactively blur "clickable" controls (button / a / [role=button] etc.)
// to clear that stray ring left over from a mouse interaction. Keyboard Tab
// navigation is unaffected: it's supposed to show a focus ring, and tabbing to the
// next element re-triggers :focus-visible. Text-entry controls (input / textarea /
// select / contenteditable) are skipped — their Esc often carries its own meaning and
// shouldn't cause a blur.
export function blurFocusOnEscape() {
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return;
    const tag = el.tagName;
    if (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      el.isContentEditable
    )
      return;
    el.blur();
  });
}
