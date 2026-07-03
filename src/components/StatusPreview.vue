<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import TerminalFrame from '@/components/TerminalFrame.vue';
import { useConfigStore } from '@/stores/config';

const store = useConfigStore();
const { t } = useI18n();

// ── Simulated terminal (preview-only, ephemeral) ────────────────────────────
// ccstatusline lays each line out inside the terminal width, adjusted by flexMode:
//   full               → the whole width
//   full-minus-40      → width − 40 (reserve for Claude's auto-compact notice)
//   full-until-compact → full until context usage ≥ compactThreshold%, then minus-40
// flex-separator widgets expand to fill the leftover usable width. We simulate the
// two inputs the real terminal has (its column width + the session's context %) so
// every flexMode / threshold effect is actually visible here. TerminalFrame (shared
// with the read-only template cards) does the actual DOM overflow measurement.
const RESERVE = 40;
// Floor for the usable area so `calc(100% - 40ch)` can't collapse it to ~0 on a
// narrow (mobile) preview — below this the row overflows and the existing
// horizontal scroll (`.ccse-noscrollbar`) kicks in, instead of the reserved
// placeholder silently swallowing the whole line.
const MIN_USABLE = 24;
// Simulated terminal width in pixels; null = fill available width (default, responsive).
// Dragging the right-edge handle sets a fixed pixel value.
const termWidth = ref<number | null>(null);
const simCtxPct = ref(40); // simulated context usage % (drives full-until-compact)

const flexMode = computed(() => store.config.flexMode || 'full-minus-40');
const isUntilCompact = computed(() => flexMode.value === 'full-until-compact');
const compacted = computed(
  () => isUntilCompact.value && simCtxPct.value >= store.config.compactThreshold
);
// Whether to reserve 40 columns on the right for Claude's auto-compact notice
// (always for full-minus-40; only after the threshold is crossed for until-compact).
const reserved = computed(
  () => flexMode.value === 'full-minus-40' || compacted.value
);
// Usable-area width: full width minus 40 columns when reserved
// (a pure CSS calc, independent of the terminal's pixel width).
const usableWidth = computed(() =>
  reserved.value ? `calc(100% - ${RESERVE}ch)` : '100%'
);

// ── Drag the terminal's right edge: the whole terminal card resizes with it
//    (pixel width; stays put on release, defaults to full width) ──────────
const termRef = ref<HTMLElement>();
const resizing = ref(false);
// Double-click the edge: smoothly snaps to 100% width like double-clicking a
// Chrome window border, then hands control back to auto-fit (null) when done.
const snapping = ref(false);
function maximizeWidth() {
  const el = termRef.value;
  if (!el?.parentElement) return;
  const maxW = el.parentElement.clientWidth;
  const startW = el.offsetWidth;
  if (termWidth.value === null || startW >= maxW - 0.5) return; // already at max width; skip the animation
  termWidth.value = startW; // pin the current pixel width first, as the transition's starting point
  snapping.value = true;
  requestAnimationFrame(() => {
    termWidth.value = maxW;
  });
  const onEnd = (ev: TransitionEvent) => {
    if (ev.propertyName !== 'width' || ev.target !== el) return;
    el.removeEventListener('transitionend', onEnd);
    snapping.value = false;
    termWidth.value = null; // hand back to auto-fit so it keeps filling on window/sidebar resize
  };
  el.addEventListener('transitionend', onEnd);
}
function startResize(e: PointerEvent) {
  e.preventDefault();
  const el = termRef.value;
  if (!el?.parentElement) return;
  const startX = e.clientX;
  const startW = el.offsetWidth;
  const maxW = el.parentElement.clientWidth;
  resizing.value = true;
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'col-resize';
  const onMove = (ev: PointerEvent) => {
    termWidth.value = Math.min(
      maxW,
      Math.max(200, startW + ev.clientX - startX)
    );
  };
  const onUp = () => {
    resizing.value = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

// Camera-flash overlay, fired by the "Save image" button (via template ref):
// the exported PNG is rendered from a separate offscreen instance, so this
// visible card flashing is the only feedback that a "photo" was just taken.
// v-if + animationend keeps the overlay out of the DOM except mid-flash.
const flashing = ref(false);
function flash() {
  flashing.value = false; // restart cleanly if a previous flash is mid-animation
  requestAnimationFrame(() => (flashing.value = true));
}
defineExpose({ flash });
</script>

<template>
  <!-- Terminal-style preview surface — background is pinned to fixed hexes (not the
       theme's muted-gray token) so it reads as a real terminal in both modes. -->
  <div
    ref="termRef"
    class="group border-border relative max-w-full shrink-0 overflow-hidden rounded-lg border bg-(--ccse-terminal-bg)"
    :class="snapping ? 'ccse-term-snap' : ''"
    :style="termWidth != null ? { width: `${termWidth}px` } : undefined"
  >
    <div class="border-border flex items-center gap-2.5 border-b px-3.5 py-2.5">
      <span class="flex gap-2">
        <span class="size-3 rounded-full bg-[#ff5f57]" />
        <span class="size-3 rounded-full bg-[#febc2e]" />
        <span class="size-3 rounded-full bg-[#28c840]" />
      </span>
    </div>

    <TerminalFrame
      :config="store.config"
      show-input
      overflow-mode
      :reserved="reserved"
      :usable-width="usableWidth"
      :reserve-width="RESERVE"
      :min-usable="MIN_USABLE"
      :empty-text="t('editor.previewEmpty')"
      :reserved-hint="t('preview.reservedHint')"
    />

    <!-- Terminal width is now adjusted by dragging the preview's right edge; this only
         keeps the context-usage % that flex mode actually depends on. -->
    <div
      v-if="isUntilCompact"
      class="border-border flex flex-col gap-1.5 border-t px-3.5 py-2"
    >
      <label
        class="text-muted-foreground flex items-center gap-2.5 text-[11px]"
      >
        <span class="w-12 shrink-0">{{ t('preview.context') }}</span>
        <input
          v-model.number="simCtxPct"
          type="range"
          min="0"
          max="100"
          step="1"
          class="ccse-range flex-1"
        />
        <span class="w-16 shrink-0 text-right font-mono tabular-nums">
          {{ simCtxPct }}%
        </span>
      </label>
      <p class="text-muted-foreground/70 text-[10px] leading-tight">
        {{ t('preview.thresholdNote', { n: store.config.compactThreshold }) }} ·
        {{ compacted ? t('preview.stateCompacted') : t('preview.stateFull') }}
      </p>
    </div>

    <!-- Drag handle: pinned to the terminal card's far right edge, fades in on hover, drag freely to resize. -->
    <div
      class="ccse-resize-handle"
      :class="
        resizing
          ? 'ccse-resize-handle--active opacity-100'
          : 'opacity-0 group-hover:opacity-100'
      "
      @pointerdown="startResize"
      @dblclick="maximizeWidth"
    />

    <!-- Camera-flash overlay for "Save image" — sits above everything in the
         card (the resize handle is z-5) and never intercepts clicks. -->
    <div
      v-if="flashing"
      class="ccse-term-flash pointer-events-none absolute inset-0 z-10"
      aria-hidden="true"
      @animationend="flashing = false"
    />
  </div>
</template>
