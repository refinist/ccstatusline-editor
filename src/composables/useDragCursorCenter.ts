// Centers the floating "ghost" that follows the mouse during drag on the cursor,
// and exposes a global dragging state.
//
// How it works (based on sortablejs internals):
//   - The forceFallback floating ghost is position:fixed, with top/left set to the
//     grabbed element's initial rect; every frame it only follows the cursor via
//     transform: matrix(translate), never touching margin.
//   - By default the cursor stays at the "grab point" (Pt, Mt) — but our palette
//     chips are wide while the ANSI end state is narrow, so the grab point ends up
//     outside the narrow ghost, which looks bad.
//   - Fix: set a margin on the ghost. With position:fixed + a fixed left, margin-left
//     shifts the box to the right, and sortable never overwrites margin. Setting
//     margin = grab point - ghost size / 2 pulls the cursor to the ghost's center.
//
// isDragging: module-level shared state toggled by both palette and line drags, used
// to disable hover while dragging; it also adds .ccse-grabbing to <body> so the whole
// drag shows a "grabbing" cursor, restored on release.

import { ref } from 'vue';

const grab = { x: 0, y: 0 };
const isDragging = ref(false);

export function useDragCursorCenter() {
  // On pointerdown over the widget element, record the grab point's offset from the
  // element's top-left corner.
  function onItemPointerDown(e: PointerEvent) {
    const item = e.currentTarget as HTMLElement;
    const r = item.getBoundingClientRect();
    grab.x = e.clientX - r.left;
    grab.y = e.clientY - r.top;
  }

  // Horizontal offset of the cursor relative to the ghost: center it, then shift the
  // whole thing left a bit (~slightly more than a hand-cursor's width) so the dragged
  // element sits to the left of the cursor and isn't covered by the "hand" cursor.
  const CURSOR_LEFT_OFFSET = 18;

  // Drag start: the ghost has already been appended to body (class .sortable-fallback).
  // Wait one frame for the max-content width to take effect before measuring its real
  // size, then use margin to pull the cursor to "center, shifted left".
  function onDragStart() {
    isDragging.value = true;
    document.body.classList.add('ccse-grabbing');
    requestAnimationFrame(() => {
      const ghost = document.querySelector(
        '.sortable-fallback'
      ) as HTMLElement | null;
      if (!ghost) return;
      const r = ghost.getBoundingClientRect();
      ghost.style.marginLeft = `${grab.x - r.width / 2 - CURSOR_LEFT_OFFSET}px`;
      ghost.style.marginTop = `${grab.y - r.height / 2}px`;
    });
  }

  function onDragEnd() {
    isDragging.value = false;
    document.body.classList.remove('ccse-grabbing');
  }

  return { onItemPointerDown, onDragStart, onDragEnd, isDragging };
}
