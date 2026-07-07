<script setup lang="ts">
import { Blocks, SlidersHorizontal } from '@lucide/vue';
import { useEventListener, useMediaQuery } from '@vueuse/core';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Drawer from '@/components/Drawer.vue';
import Inspector from '@/components/Inspector.vue';
import LineEditor from '@/components/LineEditor.vue';
import WidgetPalette from '@/components/WidgetPalette.vue';
import { useConfigStore } from '@/stores/config';

// The actual editor — the palette / line-editor / inspector three-column
// layout, their narrow-screen drawer fallbacks, and the editing keyboard
// shortcuts. It always works on the shared config store. EditorPage hosts it
// full-page (with its own header toolbar around it); RotationPage pulls it out
// inside the theme-editing slide-over panel.
//
// history: whether undo/redo exists in this editor. The rotation panel turns
// it off — a theme session has no history concept (every change live-syncs to
// the pool; the standalone editor's own history is reset on restore anyway),
// so the ⌘Z/⌘⇧Z shortcuts go dead there instead of surprising with a partial
// undo stack. Hosts that disable it must not render undo/redo buttons either.
//
// hotkeys: whether the editing shortcuts are live at all. The rotation page
// keeps the workspace permanently mounted on its slide track, so while it's
// the hidden pane the shortcuts must not fire (Delete would silently edit the
// invisible config).
const props = withDefaults(
  defineProps<{ history?: boolean; hotkeys?: boolean }>(),
  { history: true, hotkeys: true }
);

const store = useConfigStore();
const { t } = useI18n();

// On wide screens the Inspector is a fixed right column (<aside> below). On narrow
// screens that column would eat too much vertical space when stacked, so it collapses
// into a right-edge floating button that opens the Inspector in its own drawer.
const showInspector = ref(false);

// Same treatment, mirrored, for the widget palette: on ≥sm it's a fixed left
// column, but on phones a permanent panel would eat ~45% of the viewport before
// showing the thing you're actually editing. Below sm it collapses into a
// left-edge floating button + drawer — cross-boundary drag-and-drop into the
// editor behind a modal drawer doesn't work anyway, so the drawer leans on the
// existing double-click-to-add-to-active-line path instead (see editor.tips.dblclick).
const showPalette = ref(false);

// These two drawers only exist because their fixed column is hidden below a
// breakpoint (palette < sm, inspector < lg). If the viewport grows past that
// breakpoint while the drawer is open — rotating the phone, resizing the
// window — the column comes back and the drawer would duplicate it, so close it.
const smUp = useMediaQuery('(min-width: 640px)');
const lgUp = useMediaQuery('(min-width: 1024px)');
watch(smUp, up => {
  if (up) showPalette.value = false;
});
watch(lgUp, up => {
  if (up) showInspector.value = false;
});

function isTypingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  return (
    node.tagName === 'INPUT' ||
    node.tagName === 'TEXTAREA' ||
    node.isContentEditable
  );
}

// Keyboard shortcuts (never intercepted while typing in an input):
//   · Delete / Backspace — delete the currently selected widget
//   · ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z or Ctrl+Y redo
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (!props.hotkeys) return;
  if (isTypingTarget(e.target)) return;

  // Shortcuts while a widget is selected (no modifier keys):
  //   · Delete / Backspace — delete it
  //   · ← / → — move to the previous / next widget (in order, across lines)
  if (store.selectedId && !e.metaKey && !e.ctrlKey && !e.altKey) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      store.removeWidgetById(store.selectedId);
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      store.selectAdjacent(-1);
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      store.selectAdjacent(1);
      return;
    }
  }

  if (!props.history) return;
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
  const key = e.key.toLowerCase();
  if (key === 'z' && !e.shiftKey) {
    e.preventDefault();
    if (store.canUndo) store.undo();
  } else if ((key === 'z' && e.shiftKey) || key === 'y') {
    e.preventDefault();
    if (store.canRedo) store.redo();
  }
});
</script>

<template>
  <!-- The wrapper (not <main>) anchors the floating buttons: on <sm the <main>
       is itself the scroll container, so anything absolute inside it would
       scroll away with the content. -->
  <div class="relative flex min-h-0 flex-1 flex-col">
    <!-- Responsive layout, three tiers:
         · <sm  (phone portrait): palette collapses into a left-edge floating drawer;
           editor fills the screen; <main> scrolls as a whole.
         · sm–lg (phone landscape / tablet): palette becomes a fixed left column, sitting
           side-by-side with the editor; the Inspector still rides its right-edge drawer.
         · lg+  (desktop): the Inspector becomes a third fixed column (<aside> below).
         So the palette column appears at `sm`; the Inspector column appears at `lg`. -->
    <main
      class="flex min-h-0 flex-1 flex-col overflow-y-auto sm:flex-row sm:overflow-hidden"
    >
      <aside
        class="border-border bg-card hidden min-h-0 shrink-0 sm:flex sm:w-[220px] sm:flex-col sm:border-r"
      >
        <WidgetPalette />
      </aside>
      <!-- The column's bottom padding is stripped (pb-0); the host's #footer row
           supplies its own gap. Padding is squeezed to p-1 on mobile: this
           content is width-sensitive (the terminal preview / line editor rely
           heavily on character alignment), so every pixel saved here genuinely
           fits more characters. Restored to p-3 from sm on up, once this middle
           column is no longer the only full-width area and there's no need to
           pinch it. -->
      <div
        class="flex w-full min-w-0 shrink-0 grow flex-col p-1 pb-0 sm:flex-1 sm:overflow-hidden sm:p-3 sm:pb-0"
      >
        <LineEditor />
        <!-- Bottom-of-column slot (EditorPage puts the copyright line here) —
             it only spans the middle column, so the side panels can reach all
             the way down. -->
        <slot name="footer" />
      </div>
      <aside
        class="border-border bg-card hidden shrink-0 lg:block lg:w-[330px] lg:overflow-hidden lg:border-l"
      >
        <Inspector />
      </aside>
    </main>

    <!-- Bottom-right floating stack: both panels that collapse into a drawer on
         narrow screens share one corner instead of each hugging its own edge —
         palette on top (its own column takes over at sm), inspector below (its
         column takes over at lg), so at most one of the two is ever missing. -->
    <div class="absolute right-4 bottom-4 z-40 flex flex-col items-end gap-3">
      <!-- Cross-boundary drag-and-drop doesn't reach the editor behind a modal
           drawer, so adding a widget from here relies on double-click / the
           per-item + button → active line instead. -->
      <button
        type="button"
        class="border-border bg-card text-muted-foreground hover:text-foreground flex size-11 items-center justify-center rounded-full border shadow-lg transition-colors sm:hidden"
        :aria-label="t('palette.title')"
        :title="t('palette.title')"
        @click="showPalette = true"
      >
        <Blocks class="size-5" />
      </button>
      <!-- The dot flags that a widget is currently selected (i.e. there's stuff to edit). -->
      <button
        type="button"
        class="border-border bg-card text-muted-foreground hover:text-foreground relative flex size-11 items-center justify-center rounded-full border shadow-lg transition-colors lg:hidden"
        :aria-label="t('inspector.tab')"
        :title="t('inspector.tab')"
        @click="showInspector = true"
      >
        <SlidersHorizontal class="size-5" />
        <span
          v-if="store.selectedId"
          class="bg-primary ring-card absolute top-1 right-1 size-2 rounded-full ring-2"
        />
      </button>
    </div>
    <Drawer
      v-model:open="showPalette"
      :title="t('palette.title')"
      body-class="overflow-hidden"
    >
      <!-- Close on add: the editor sits behind this modal drawer, so collapsing
           it right away shows the freshly added widget. -->
      <WidgetPalette @added="showPalette = false" />
    </Drawer>
    <!-- Like the global-settings drawer, the mask stays transparent so the
         terminal preview remains visible while tweaking widget properties. -->
    <Drawer
      v-model:open="showInspector"
      :title="t('inspector.tab')"
      body-class="overflow-hidden"
      :masked="false"
    >
      <Inspector />
    </Drawer>
  </div>
</template>
