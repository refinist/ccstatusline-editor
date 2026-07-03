<script setup lang="ts">
import {
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Camera,
  Copy,
  GripVertical,
  Plus,
  Share2,
  Trash2,
  X
} from '@lucide/vue';
import { useClipboard } from '@vueuse/core';
import { v4 as uuid } from 'uuid';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import EditorTips from '@/components/EditorTips.vue';
import StatusPreview from '@/components/StatusPreview.vue';
import TerminalPreview from '@/components/TerminalPreview.vue';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { useDragCursorCenter } from '@/composables/useDragCursorCenter';
import {
  copyPngToClipboard,
  downloadBlob,
  exportElementPngBlob,
  exportFilename
} from '@/lib/exportImage';
import { buildShortShareUrl, createShortShare } from '@/lib/shareConfig';
import { renderWidget } from '@/preview/renderers';
import { useConfigStore } from '@/stores/config';
import type { Widget } from '@/widgets';

const store = useConfigStore();
const { t } = useI18n();
const { onItemPointerDown, onDragStart, onDragEnd, isDragging } =
  useDragCursorCenter();

type Row = { key: string; widgets: Widget[] };

// Pair each line with a stable, non-persisted key so the outer list can be
// drag-reordered (persisted lines have no id of their own).
const rows = computed<Row[]>(() =>
  store.config.lines.map((widgets, i) => ({
    key: store.lineKeys[i] ?? `line-${i}`,
    widgets
  }))
);

// Normalizes a dropped list, assigning a fresh id to any item that doesn't
// have one yet (i.e. a clone freshly dragged in from the palette). Returns
// that new id so the caller can auto-select it.
function normalize(line: Widget[]): {
  widgets: Widget[];
  newId: string | null;
} {
  let newId: string | null = null;
  const widgets = line.map((item: any) => {
    if (item.id) return item;
    const { type, defaults } = item;
    const w: Widget = { id: uuid(), type, ...(defaults || {}) };
    newId = w.id;
    return w;
  });
  return { widgets, newId };
}

function onUpdate(i: number, list: Widget[]) {
  const { widgets, newId } = normalize(list);
  const next = store.config.lines.map((l, idx) => (idx === i ? widgets : l));
  store.setLines(next);
  // A widget freshly cloned in from the palette lands here with no id; once it
  // gets one, select it so the Inspector opens on it immediately.
  if (newId) store.selectWidget(newId);
}

function onLinesReorder(next: Row[]) {
  store.reorderLines(
    next.map(r => r.widgets),
    next.map(r => r.key)
  );
}

// Line drag only needs the global "grabbing" cursor; the cursor-centering trick
// is widget-specific, so lines use a plain start/end.
function onLineStart() {
  document.body.classList.add('ccse-grabbing');
}
function onLineEnd() {
  document.body.classList.remove('ccse-grabbing');
}

// Starting to drag a widget: just kick off the cursor-centering behaviour.
// The selection is keyed by widget id and survives the drag on its own —
// setLines/normalize preserve ids across reorders and cross-line moves — so
// dragging the selected widget keeps it selected (its outline is hidden
// mid-drag via isDragging and reappears on the same widget after drop).
function onWidgetStart() {
  onDragStart();
}

// A plain click (no drag) toggles the widget's selection: click to select it
// for the Inspector, click the already-selected one again to deselect. This is
// the ONLY way selection is cleared — clicking a line or anywhere else never
// deselects, keeping the mental model simple.
function onChipClick(w: Widget) {
  if (isDragging.value) return;
  store.selectWidget(store.selectedId === w.id ? null : w.id);
}

// Clicking a line's empty space makes it the active target (new widgets from
// the palette land here). It deliberately does NOT touch the widget selection:
// the active line and the selected widget are independent concerns.
function onBgClick(i: number) {
  if (isDragging.value) return;
  store.setActiveLine(i);
}

// ── Hover action toolbar (sep-left / clone / delete / sep-right) ─────────────
// The chips live in a horizontally-scrolling zone (overflow-x:auto, which forces
// overflow-y to clip too), so an in-flow toolbar above a chip gets clipped by the
// zone — worst for narrow chips whose buttons overflow the chip's box. We instead
// Teleport ONE toolbar to <body> and anchor it over the hovered chip, so it can
// never be clipped by any scroll container. A short leave-delay bridges the gap
// between the chip and the toolbar so moving onto the buttons keeps it open.
const hoveredId = ref<string | null>(null);
const hoverRect = ref<{ left: number; top: number } | null>(null);
let hoveredEl: HTMLElement | null = null;
let overToolbar = false;
let leaveTimer: ReturnType<typeof setTimeout> | undefined;

// Re-read the hovered chip's viewport rect into hoverRect. Called on hover and
// again on every scroll/resize so the fixed-position toolbar stays glued to its
// chip instead of floating at a now-stale spot.
function syncHoverRect() {
  if (!hoveredEl) return;
  const r = hoveredEl.getBoundingClientRect();
  hoverRect.value = { left: r.left + r.width / 2, top: r.top };
}

function onChipEnter(w: Widget, e: MouseEvent) {
  if (isDragging.value) return;
  clearTimeout(leaveTimer);
  hoveredEl = e.currentTarget as HTMLElement;
  syncHoverRect();
  hoveredId.value = w.id;
}
function onChipLeave() {
  clearTimeout(leaveTimer);
  leaveTimer = setTimeout(() => {
    if (!overToolbar) hideToolbar();
  }, 120);
}
function onToolbarEnter() {
  overToolbar = true;
  clearTimeout(leaveTimer);
}
function onToolbarLeave() {
  overToolbar = false;
  hideToolbar();
}
// Delete removes the hovered chip, so close the (now-orphaned) toolbar too.
function onDeleteHovered() {
  if (hoveredId.value) store.removeWidgetById(hoveredId.value);
  overToolbar = false;
  hideToolbar();
}
function hideToolbar() {
  hoveredId.value = null;
  hoveredEl = null;
}

// The toolbar is teleported to <body> and positioned from viewport coords
// captured on hover, so it must be re-synced whenever anything scrolls (the
// chips sit in an overflow-auto zone) or the viewport resizes — otherwise it
// drifts off its chip. Capture phase is required to catch scrolls in inner
// containers, since scroll events don't bubble.
function onReposition() {
  if (hoveredId.value) syncHoverRect();
}

// Keyboard copy/paste for the selected chip: Cmd/Ctrl+C copies it into the store
// clipboard, Cmd/Ctrl+V pastes a fresh copy after the selection. Skipped while
// focus is in a form field (or there's a text selection) so the browser's native
// copy/paste still works there.
function onKeydown(e: KeyboardEvent) {
  if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
  const el = e.target as HTMLElement | null;
  const tag = el?.tagName;
  if (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el?.isContentEditable
  )
    return;
  const key = e.key.toLowerCase();
  if (key === 'c' && store.selectedId) {
    if (window.getSelection()?.toString()) return; // let native text copy win
    if (store.copyWidget()) toast.success(t('editor.copied'));
    e.preventDefault();
  } else if (key === 'v' && store.clipboard) {
    store.pasteWidget();
    e.preventDefault();
  }
}
onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('scroll', onReposition, true);
  window.addEventListener('resize', onReposition);
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('scroll', onReposition, true);
  window.removeEventListener('resize', onReposition);
});

// Deleting a line is confirmed via a popover anchored to the trash button
// (only one line's confirm can be open at a time).
const deleteConfirmIndex = ref<number | null>(null);
function confirmDeleteLine(i: number) {
  store.removeLine(i);
  deleteConfirmIndex.value = null;
}

// "Share": POST the current config to /api/share (KV, valid for 7 days),
// copying a `?s=<id>` short link. Content-addressed — sharing the same config
// repeatedly returns the same link, so it doesn't keep eating write quota.
const { copy } = useClipboard();
const sharing = ref(false);
const hasWidgets = computed(() => store.config.lines.some(l => l.length > 0));
async function onShare() {
  if (sharing.value) return;
  sharing.value = true;
  try {
    const result = await createShortShare(store.config);
    if (result.id) {
      await copy(buildShortShareUrl(result.id));
      toast.success(t('share.copied'));
    } else {
      toast.error(
        t(
          result.error === 'rate_limited'
            ? 'share.rateLimited'
            : 'share.unavailable'
        )
      );
    }
  } finally {
    sharing.value = false;
  }
}

// "Save image": rasterize the config into a PNG, download it AND copy it to
// the clipboard. The live editor preview (StatusPreview, below) simulates a
// fixed-column terminal — width-dependent ellipsis, a reserved gray strip for
// Claude's compact notice — none of which makes sense once the image leaves
// the editor. So this captures a second, offscreen instance of the same
// read-only, no-simulation rendering the template cards use instead, and
// exportElementPngBlob forces it to a fixed terminal width (see exportImage.ts)
// — independent of both the contributor's window size and the live preview's
// drag-resized width. Mounted only while capturing (v-if="showcasing" below)
// rather than kept alive permanently just for this occasional export.
//
// Deliberately NOT an async function: copyPngToClipboard must be invoked
// synchronously inside the click's user-gesture context or Safari rejects the
// clipboard write, so the whole render chain is packed into a promise handed
// to the clipboard first and only then awaited for the download.
const exportPreviewRef = ref<HTMLElement | null>(null);
const showcasing = ref(false);
function onShowcase() {
  if (showcasing.value) return;
  showcasing.value = true;
  const blobPromise = (async () => {
    await nextTick();
    const el = exportPreviewRef.value;
    if (!el) throw new Error('export preview not mounted');
    return await exportElementPngBlob(el);
  })();
  const copiedPromise = copyPngToClipboard(blobPromise);
  const finish = async () => {
    try {
      const blob = await blobPromise;
      downloadBlob(blob, exportFilename());
      const copied = await copiedPromise;
      toast.success(t(copied ? 'showcase.doneCopied' : 'showcase.done'));
    } catch {
      toast.error(t('showcase.failed'));
    } finally {
      showcasing.value = false;
    }
  };
  finish();
}
</script>

<template>
  <section class="flex flex-col gap-3 sm:min-h-0 sm:flex-1">
    <!-- Share row: its own row separate from the terminal preview, buttons
         right-aligned — they act on the config shown in the preview. The hint
         rides each button itself as a hover Tooltip instead of a separate ⓘ
         icon per button, which crowded the row. reka-ui tooltips only open
         from hover/keyboard focus, so on touch they never appear and never
         swallow the tap — there the buttons' text labels stand on their own. -->
    <TooltipProvider :delay-duration="300">
      <div class="flex items-center justify-end gap-1.5">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              size="xs"
              variant="outline"
              class="text-muted-foreground"
              :disabled="!hasWidgets || showcasing"
              @click="onShowcase"
            >
              <Camera class="size-3" />
              <span>{{ t('showcase.label') }}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" class="max-w-60">
            {{ t('showcase.hint') }}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              size="xs"
              class="border-transparent bg-[#D97757] text-white hover:bg-[#D97757]/90"
              :disabled="!hasWidgets || sharing"
              @click="onShare"
            >
              <Share2 class="size-3" />
              <span>{{ t('share.label') }}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" class="max-w-60">
            {{ t('share.hint') }}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>

    <!-- Live, read-only terminal preview of the rendered status line. -->
    <StatusPreview />

    <!-- Offscreen showcase capture target — see onShowcase. Only mounted while
         capturing. The outer box clips to nothing so it's invisible on screen.
         The captured element (the ref) is `absolute` with no inset set, which
         shrink-to-fits its own content instead of stretching to fill the outer
         box's 0 width the way a normal in-flow block would — downloadElementAsPng
         then forces it to a fixed width anyway, but it still needs a sane,
         non-collapsed layout going into the clone (see exportImage.ts for why).
         It also carries no opacity/offscreen-position tricks of its own, since
         html-to-image bakes a node's own computed style into the clone it
         rasterizes: an `opacity: 0` (or a `left: -9999px` placement) on the
         captured node itself reproduces in the PNG too, exporting a blank
         image instead of the terminal card. -->
    <div
      v-if="showcasing"
      aria-hidden="true"
      class="fixed top-0 left-0 size-0 overflow-hidden"
    >
      <div ref="exportPreviewRef" class="absolute">
        <TerminalPreview :config="store.config" />
      </div>
    </div>

    <!-- Rotating keyboard/interaction hints, between the preview and the lines. -->
    <EditorTips />

    <!-- Editable lines: drag a grip to reorder; widgets drag within/across lines.
         On touch (delay-on-touch-only), drag activates only after a long-press:
         a quick swipe stays a native scroll (vertical page / horizontal line zone),
         moving past the threshold during the delay cancels the drag. Mouse drag
         is untouched. -->
    <div class="sm:min-h-0 sm:flex-1 sm:overflow-auto">
      <VueDraggable
        :model-value="rows"
        :group="{ name: 'lines', pull: false, put: false }"
        item-key="key"
        handle=".ccse-line-grip"
        :animation="150"
        :force-fallback="true"
        :delay="250"
        :delay-on-touch-only="true"
        :touch-start-threshold="5"
        ghost-class="ccse-row-ghost"
        chosen-class="ccse-noop"
        drag-class="ccse-row-drag"
        class="text-foreground flex flex-col gap-2 font-mono text-[13px] leading-7"
        @update:model-value="onLinesReorder"
        @start="onLineStart"
        @end="onLineEnd"
      >
        <div
          v-for="(row, i) in rows"
          :key="row.key"
          class="ccse-line-wrap group/line relative flex items-stretch gap-1 sm:gap-1.5"
        >
          <!-- drag handle (tinted when this is the active target line).
               touchstart.prevent: a long-press here must ONLY arm the drag —
               without it, iOS's long-press text-selection gesture finds no
               selectable text under the (select-none) grip and jumps to the
               nearest selectable node on the page (e.g. the copyright line),
               popping the copy callout mid-drag. Preventing the default kills
               that native gesture at the source; sortablejs listens to touch
               events itself, so the delayed drag still works. Scrolling can't
               start from the grip anymore, which is fine for a drag handle. -->
          <Button
            type="button"
            variant="ghost"
            size="icon"
            :class="[
              'ccse-line-grip size-5 shrink-0 cursor-grab self-center rounded-md active:cursor-grabbing sm:size-7',
              rows.length > 1 && store.activeLine === i
                ? 'text-primary hover:text-primary'
                : 'text-muted-foreground/40 hover:text-muted-foreground'
            ]"
            :title="t('editor.dragLine')"
            @touchstart.prevent
          >
            <GripVertical class="size-3.5" />
          </Button>

          <!-- the line itself (widgets draggable within / across lines) -->
          <div class="relative min-w-0 flex-1" @click="onBgClick(i)">
            <VueDraggable
              :model-value="row.widgets"
              :group="{ name: 'widgets', pull: true, put: true }"
              item-key="id"
              :empty-insert-threshold="5"
              :force-fallback="true"
              :fallback-on-body="true"
              :delay="250"
              :delay-on-touch-only="true"
              :touch-start-threshold="5"
              :scroll="true"
              :scroll-sensitivity="40"
              :scroll-speed="10"
              drag-class="ccse-line-drag"
              ghost-class="ccse-line-ghost"
              chosen-class="ccse-noop"
              :class="[
                'ccse-zone-line flex min-h-12 w-full flex-nowrap items-center gap-x-[11px] overflow-x-auto rounded-md border px-2 py-1 transition-colors select-none sm:px-3',
                rows.length > 1 && store.activeLine === i
                  ? 'ccse-line-active border-solid'
                  : 'border-border border-dashed'
              ]"
              @update:model-value="onUpdate(i, $event)"
              @start="onWidgetStart()"
              @end="onDragEnd"
            >
              <span
                v-for="w in row.widgets"
                :key="w.id"
                :class="[
                  'relative inline-flex shrink-0 cursor-grab items-center rounded-sm p-0 font-mono text-[13px] leading-none whitespace-pre outline outline-1 outline-offset-4 transition-[outline-color,background-color] duration-150 ease-out select-none active:cursor-grabbing',
                  isDragging
                    ? 'outline-transparent'
                    : store.selectedId === w.id
                      ? 'ccse-item-active outline-ring'
                      : hoveredId === w.id
                        ? 'outline-ring/25'
                        : 'outline-transparent'
                ]"
                :title="w.type"
                @pointerdown="onItemPointerDown"
                @click.stop="onChipClick(w)"
                @mouseenter="onChipEnter(w, $event)"
                @mouseleave="onChipLeave"
              >
                <span
                  v-for="(tok, k) in renderWidget(w)"
                  :key="k"
                  :class="tok.cls"
                  :style="tok.style"
                >
                  {{ tok.text }}
                </span>
              </span>
            </VueDraggable>
            <!-- empty line: the active line's hint also explains double-click -->
            <span
              v-if="row.widgets.length === 0"
              class="ccse-drophint text-muted-foreground/60 pointer-events-none absolute inset-0 flex items-center px-2 text-xs italic select-none sm:px-3"
            >
              {{
                rows.length > 1 && store.activeLine === i
                  ? t('editor.dropHintActive')
                  : t('editor.dropHint')
              }}
            </span>
          </div>

          <!-- delete line — hidden once only one line remains -->
          <Popover
            v-if="rows.length > 1"
            :open="deleteConfirmIndex === i"
            @update:open="deleteConfirmIndex = $event ? i : null"
          >
            <PopoverTrigger as-child>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 size-5 shrink-0 self-center rounded-md sm:size-7"
                :title="t('editor.deleteLine')"
              >
                <Trash2 class="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" class="w-64 p-3">
              <p class="text-foreground text-xs">
                {{ t('editor.deleteLineConfirm') }}
              </p>
              <p class="text-muted-foreground mt-1 text-xs">
                {{ t('editor.deleteLineDesc') }}
              </p>
              <div class="mt-3 flex justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  class="h-7 text-xs"
                  @click="deleteConfirmIndex = null"
                >
                  {{ t('app.cancel') }}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  class="h-7 text-xs"
                  @click="confirmDeleteLine(i)"
                >
                  {{ t('inspector.delete') }}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </VueDraggable>

      <!-- add a line (hidden at MAX_LINES, with a short note instead) -->
      <Button
        v-if="store.canAddLine"
        type="button"
        variant="outline"
        class="text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/40 mt-2 w-full cursor-pointer gap-1.5 border-dashed text-xs select-none"
        @click="store.addLine()"
      >
        <Plus class="size-3.5" />
        {{ t('editor.addLine') }}
      </Button>
      <p
        v-else
        class="text-muted-foreground/50 mt-2 text-center text-xs select-none"
      >
        {{ t('editor.maxLines', { n: store.MAX_LINES }) }}
      </p>
    </div>

    <!-- Hover action toolbar, teleported to <body> so no scroll container can clip
         it. Anchored (fixed) above the hovered chip; stays open while hovered. -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-150 ease-out"
        leave-active-class="transition-opacity duration-100 ease-in"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="hoveredId && !isDragging && hoverRect"
          class="ccse-line-action fixed z-50 flex cursor-default items-center gap-0.5 px-1 pb-1.5"
          :style="{
            left: `${hoverRect.left}px`,
            top: `${hoverRect.top}px`,
            transform: 'translate(-50%, -100%)'
          }"
          @mouseenter="onToolbarEnter"
          @mouseleave="onToolbarLeave"
          @pointerdown.stop
        >
          <Button
            variant="outline"
            size="icon"
            class="bg-popover dark:bg-popover text-muted-foreground hover:bg-muted-foreground hover:border-muted-foreground hover:text-background dark:hover:bg-muted-foreground size-4 shrink-0 cursor-pointer rounded shadow"
            :title="t('editor.sepLeft')"
            @pointerdown.stop
            @click.stop="store.insertSeparator(hoveredId, 'left')"
          >
            <BetweenVerticalStart class="size-2.5 shrink-0" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="bg-popover dark:bg-popover text-muted-foreground hover:bg-primary hover:border-primary hover:text-primary-foreground dark:hover:bg-primary size-4 shrink-0 cursor-pointer rounded shadow"
            :title="t('inspector.clone')"
            @pointerdown.stop
            @click.stop="store.cloneWidget(hoveredId)"
          >
            <Copy class="size-2.5 shrink-0" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="bg-popover dark:bg-popover text-muted-foreground hover:bg-destructive hover:border-destructive hover:text-destructive-foreground dark:hover:bg-destructive size-4 shrink-0 cursor-pointer rounded shadow"
            :title="t('editor.remove')"
            @pointerdown.stop
            @click.stop="onDeleteHovered"
          >
            <X class="size-2.5 shrink-0" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="bg-popover dark:bg-popover text-muted-foreground hover:bg-muted-foreground hover:border-muted-foreground hover:text-background dark:hover:bg-muted-foreground size-4 shrink-0 cursor-pointer rounded shadow"
            :title="t('editor.sepRight')"
            @pointerdown.stop
            @click.stop="store.insertSeparator(hoveredId, 'right')"
          >
            <BetweenVerticalEnd class="size-2.5 shrink-0" />
          </Button>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>
