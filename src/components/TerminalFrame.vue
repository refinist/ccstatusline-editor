<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import PowerlineGlyph from '@/components/PowerlineGlyph.vue';
import { renderPowerlineLines, type PowerlineItem } from '@/preview/powerline';
import {
  renderWidget,
  separatorToken,
  type RenderGlobals
} from '@/preview/renderers';
import { WIDGET_BY_TYPE, type CcStatusConfig, type Widget } from '@/widgets';

// Shared terminal-body renderer for both the live editor preview (StatusPreview)
// and the read-only template cards (TerminalPreview) — one source of truth for
// the config → widget-rendering pipeline and for the spacing between lines, so
// the two surfaces can't drift out of visual sync the way they used to.
const props = withDefaults(
  defineProps<{
    config: CcStatusConfig;
    /** Empty command-prompt box with a blinking cursor above the status lines (editor only). */
    showInput?: boolean;
    inputTag?: string;
    /** Usable-width / reserved-column / overflow-ellipsis simulation of ccstatusline's
     *  flexMode layout — editor only; template cards don't measure DOM for this. */
    overflowMode?: boolean;
    reserved?: boolean;
    usableWidth?: string;
    reserveWidth?: number;
    minUsable?: number;
    emptyText: string;
    reservedHint?: string;
  }>(),
  {
    showInput: false,
    inputTag: 'CCStatusline Editor',
    overflowMode: false,
    reserved: false,
    usableWidth: '100%',
    reserveWidth: 40,
    minUsable: 24,
    reservedHint: ''
  }
);

const lines = computed(() => props.config.lines.filter(l => l.length > 0));

const globals = computed<RenderGlobals>(() => ({
  globalBold: props.config.globalBold || undefined,
  overrideFg: props.config.overrideForegroundColor,
  overrideBg: props.config.overrideBackgroundColor,
  colorLevel: props.config.colorLevel,
  minimalist: props.config.minimalistMode || undefined
}));

const defaultSep = computed(() =>
  props.config.powerline.enabled ? '' : (props.config.defaultSeparator ?? '')
);
const defaultPadding = computed(() => props.config.defaultPadding ?? '');
const hasLeftPadding = computed(
  () => props.config.defaultPaddingSide !== 'right'
);
const hasRightPadding = computed(
  () => props.config.defaultPaddingSide !== 'left'
);
const inheritSepColors = computed(
  () => !props.config.powerline.enabled && !!props.config.inheritSeparatorColors
);
function sepToken(from?: Widget): {
  cls?: string;
  style?: Record<string, string>;
} {
  return separatorToken(
    inheritSepColors.value ? from : undefined,
    globals.value
  );
}
const isStruct = (ty: string) => ty === 'separator' || ty === 'flex-separator';

// Powerline mode swaps the whole line pipeline: widgets become colored segments
// joined by arrow glyphs (see preview/powerline.ts); null when powerline is off.
const plLines = computed<PowerlineItem[][] | null>(() =>
  props.config.powerline.enabled
    ? renderPowerlineLines(
        lines.value,
        props.config.powerline,
        defaultPadding.value,
        globals.value,
        props.config.defaultPaddingSide
      )
    : null
);

// Flatten a line into render items, interleaving the default separator and tagging
// flex-separators so the template can render them as growing spacers. Manually-placed
// "separator" widgets that don't set their own color/background get the same
// inheritSeparatorColors treatment, resolved here into an effective widget so
// renderWidget's normal color/bold/dim pipeline just picks it up.
function renderLine(line: Widget[]) {
  const items: {
    kind: 'widget' | 'sep' | 'flex';
    w?: Widget;
    from?: Widget;
    omitLead?: boolean;
    omitTrail?: boolean;
    key: string;
  }[] = [];
  line.forEach((w, i) => {
    const prev = line[i - 1];
    if (
      defaultSep.value &&
      i > 0 &&
      prev &&
      !isStruct(prev.type) &&
      !isStruct(w.type) &&
      !prev.merge
    ) {
      items.push({ kind: 'sep', from: prev, key: `${w.id}-sep` });
    }
    if (w.type === 'flex-separator') {
      items.push({ kind: 'flex', key: w.id });
    } else if (
      w.type === 'separator' &&
      inheritSepColors.value &&
      !w.color &&
      !w.backgroundColor &&
      prev &&
      !isStruct(prev.type)
    ) {
      const prevColor = prev.color ?? WIDGET_BY_TYPE.get(prev.type)?.color;
      items.push({
        kind: 'widget',
        w: {
          ...w,
          color: prevColor,
          backgroundColor: prev.backgroundColor,
          bold: prev.bold,
          dim: prev.dim
        },
        key: w.id
      });
    } else {
      const next = line[i + 1];
      items.push({
        kind: 'widget',
        w,
        key: w.id,
        omitLead: !!prev && !isStruct(prev.type) && prev.merge === 'no-padding',
        omitTrail: w.merge === 'no-padding' && !!next && !isStruct(next.type)
      });
    }
  });
  return items;
}

// ── Overflow detection: only wired up when overflowMode is on (editor preview). ──
const usableRefs = ref<(HTMLElement | null)[]>([]);
const setUsableRef = (i: number) => (el: unknown) => {
  usableRefs.value[i] = (el as HTMLElement) ?? null;
};
const overflowing = ref<boolean[]>([]);
const bypassRef = ref<HTMLElement | null>(null);
const bypassOverflowing = ref(false);
function checkOverflow() {
  if (!props.overflowMode) return;
  overflowing.value = lines.value.map((_, i) => {
    const el = usableRefs.value[i];
    // Monospace font: scrollWidth carries sub-pixel error — +0.5 tolerance avoids false positives.
    return !!el && el.scrollWidth > el.clientWidth + 0.5;
  });
  const bypassEl = bypassRef.value;
  bypassOverflowing.value =
    !!bypassEl && bypassEl.scrollWidth > bypassEl.clientWidth + 0.5;
}
watch(
  [() => props.config, () => props.usableWidth, () => props.reserved],
  checkOverflow,
  { deep: true, flush: 'post' }
);

// Width changes don't only come from dragging the terminal's right edge — the
// browser window narrowing, a sidebar expanding/collapsing, or anything else that
// compresses the reserved area must also re-trigger the ellipsis check. So the
// ResizeObserver is attached to the frame itself rather than watching a single
// "drag width" ref (which would miss those other triggers).
const frameRootRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  checkOverflow();
  document.fonts?.ready?.then(checkOverflow);
  if (
    props.overflowMode &&
    frameRootRef.value &&
    typeof ResizeObserver !== 'undefined'
  ) {
    resizeObserver = new ResizeObserver(() => checkOverflow());
    resizeObserver.observe(frameRootRef.value);
  }
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <!-- Content fills the full terminal width; the width itself is controlled by the
       outer card. Padding matches the editor's terminal preview, so template cards
       don't need a separate set. -->
  <div
    ref="frameRootRef"
    class="ccse-noscrollbar overflow-x-auto px-1 pt-4 pb-2 font-mono text-[12px]"
  >
    <div class="ccse-terminal-frame relative w-full">
      <!-- Empty terminal command prompt (no text), simulating the line you'd type
           above the status line — styled after Claude Code's input box: cyan
           top/bottom rules with a mode tag riding the top-right corner. -->
      <div
        v-if="showInput"
        class="ccse-terminal-input relative mb-2 w-full py-2.5"
      >
        <span class="ccse-terminal-input-tag" aria-hidden="true">
          {{ inputTag }}
        </span>
        <div class="relative min-h-[1.2em] leading-snug">
          <span class="ccse-terminal-prompt-mark select-none">❯</span>
          <span class="ccse-terminal-cursor" aria-hidden="true" />
        </div>
      </div>

      <template v-if="lines.length">
        <div
          v-for="(line, i) in lines"
          :key="i"
          class="ccse-terminal-output-line relative flex w-full leading-snug"
          :class="
            overflowMode
              ? ''
              : [
                  'flex-nowrap whitespace-pre',
                  plLines ? 'items-stretch' : 'items-center'
                ]
          "
        >
          <!-- Editor preview: usable area (content, truncated) + the reserved region,
             each line spans the full simulated terminal width. -->
          <div
            v-if="overflowMode"
            :ref="setUsableRef(i)"
            class="relative flex shrink-0 flex-nowrap overflow-hidden whitespace-pre"
            :class="plLines ? 'items-stretch' : 'items-center'"
            :style="{ width: usableWidth, minWidth: `${minUsable}ch` }"
          >
            <template v-if="plLines">
              <template v-for="it in plLines[i]" :key="it.key">
                <span v-if="it.kind === 'flex'" class="min-w-0 flex-1" />
                <PowerlineGlyph
                  v-else-if="it.kind === 'glyph'"
                  :glyph="it.glyph"
                  :fill="it.fill"
                  :base="it.base"
                />
                <span
                  v-else
                  class="inline-flex shrink-0 items-center whitespace-pre"
                  :style="it.bg ? { backgroundColor: it.bg } : undefined"
                >
                  <span
                    v-for="(tok, k) in it.tokens"
                    :key="k"
                    :class="tok.cls"
                    :style="tok.style"
                  >
                    {{ tok.text }}
                  </span>
                </span>
              </template>
            </template>
            <template v-else>
              <template v-for="it in renderLine(line)" :key="it.key">
                <span v-if="it.kind === 'flex'" class="min-w-0 flex-1" />
                <span
                  v-else-if="it.kind === 'sep'"
                  class="shrink-0 whitespace-pre"
                  :class="sepToken(it.from).cls"
                  :style="sepToken(it.from).style"
                >
                  {{ defaultSep }}
                </span>
                <span
                  v-else
                  class="inline-flex shrink-0 items-center whitespace-pre"
                >
                  <span
                    v-if="
                      defaultPadding &&
                      hasLeftPadding &&
                      !it.omitLead &&
                      it.w!.type !== 'separator'
                    "
                    class="whitespace-pre"
                  >
                    {{ defaultPadding }}
                  </span>
                  <span
                    v-for="(tok, k) in renderWidget(it.w!, 'preview', globals)"
                    :key="k"
                    :class="tok.cls"
                    :style="tok.style"
                  >
                    {{ tok.text }}
                  </span>
                  <span
                    v-if="
                      defaultPadding &&
                      hasRightPadding &&
                      !it.omitTrail &&
                      it.w!.type !== 'separator'
                    "
                    class="whitespace-pre"
                  >
                    {{ defaultPadding }}
                  </span>
                </span>
              </template>
            </template>
            <span
              v-if="overflowing[i]"
              class="ccse-ellipsis"
              aria-hidden="true"
            >
              …
            </span>
          </div>
          <div
            v-if="overflowMode && reserved"
            class="ccse-reserved shrink-0 self-stretch"
            :style="{ width: `${reserveWidth}ch` }"
            :title="reservedHint"
          />

          <!-- Template card: no simulated width/overflow, just the rendered line. -->
          <template v-if="!overflowMode">
            <template v-if="plLines">
              <template v-for="it in plLines[i]" :key="it.key">
                <span v-if="it.kind === 'flex'" class="inline-block w-6" />
                <PowerlineGlyph
                  v-else-if="it.kind === 'glyph'"
                  :glyph="it.glyph"
                  :fill="it.fill"
                  :base="it.base"
                />
                <span
                  v-else
                  class="inline-flex items-center whitespace-pre"
                  :style="it.bg ? { backgroundColor: it.bg } : undefined"
                >
                  <span
                    v-for="(tok, k) in it.tokens"
                    :key="k"
                    :class="tok.cls"
                    :style="tok.style"
                  >
                    {{ tok.text }}
                  </span>
                </span>
              </template>
            </template>
            <template v-else>
              <template v-for="it in renderLine(line)" :key="it.key">
                <span v-if="it.kind === 'flex'" class="inline-block w-6" />
                <span
                  v-else-if="it.kind === 'sep'"
                  class="whitespace-pre"
                  :class="sepToken(it.from).cls"
                  :style="sepToken(it.from).style"
                >
                  {{ defaultSep }}
                </span>
                <span v-else class="inline-flex items-center whitespace-pre">
                  <span
                    v-if="
                      defaultPadding &&
                      hasLeftPadding &&
                      !it.omitLead &&
                      it.w!.type !== 'separator'
                    "
                    class="whitespace-pre"
                  >
                    {{ defaultPadding }}
                  </span>
                  <span
                    v-for="(tok, k) in renderWidget(it.w!, 'preview', globals)"
                    :key="k"
                    :class="tok.cls"
                    :style="tok.style"
                  >
                    {{ tok.text }}
                  </span>
                  <span
                    v-if="
                      defaultPadding &&
                      hasRightPadding &&
                      !it.omitTrail &&
                      it.w!.type !== 'separator'
                    "
                    class="whitespace-pre"
                  >
                    {{ defaultPadding }}
                  </span>
                </span>
              </template>
            </template>
          </template>
        </div>
      </template>
      <div
        v-else
        class="ccse-terminal-output-line text-muted-foreground/60 text-xs italic select-none"
      >
        {{ emptyText }}
      </div>

      <!-- Same permissions-mode hint line in both surfaces, so template cards mirror
         what the status line looks like in a real Claude Code session. -->
      <div
        class="ccse-terminal-output-line relative flex w-full"
        :class="overflowMode ? '' : 'flex-nowrap items-center whitespace-pre'"
      >
        <div
          v-if="overflowMode"
          ref="bypassRef"
          class="relative flex w-full shrink-0 flex-nowrap items-center overflow-hidden whitespace-pre"
        >
          <span class="shrink-0 font-semibold text-[#ff5f87]">
            {{ '⏵⏵ bypass permissions on ' }}
          </span>
          <span class="text-muted-foreground shrink-0">
            {{ '(shift+tab to cycle)' }}
          </span>
          <span
            v-if="bypassOverflowing"
            class="ccse-ellipsis"
            aria-hidden="true"
          >
            …
          </span>
        </div>
        <template v-else>
          <span class="shrink-0 font-semibold text-[#ff5f87]">
            {{ '⏵⏵ bypass permissions on ' }}
          </span>
          <span class="text-muted-foreground shrink-0">
            {{ '(shift+tab to cycle)' }}
          </span>
        </template>
      </div>
    </div>
  </div>
</template>
