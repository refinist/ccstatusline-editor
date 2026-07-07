<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Input } from '@/components/ui/input';
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput
} from '@/components/ui/number-field';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { guardNumberInput, scrubNumberInput } from '@/lib/numberInput';
import {
  ansi256ToHex,
  GRADIENT_PRESET_NAMES,
  GRADIENT_PRESETS,
  NAMED_BG_COLORS,
  NAMED_FG_COLORS,
  nearest256Index,
  parseGradientStops,
  swatchCss
} from '@/preview/colors';

const props = defineProps<{
  modelValue?: string;
  kind: 'fg' | 'bg';
  colorLevel: number;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined];
}>();

const { t } = useI18n();

const open = ref(false);

const names = computed(() =>
  props.kind === 'fg' ? NAMED_FG_COLORS : NAMED_BG_COLORS
);
const hasHex = computed(() => props.colorLevel >= 3);
const has256 = computed(() => props.colorLevel >= 2);
const hasGradient = computed(
  () => props.kind === 'fg' && props.colorLevel >= 2
);

type Mode = 'named' | '256' | 'hex' | 'gradient';
const tab = ref<Mode>('named');

const num256 = ref<number | undefined>(undefined);
const hex = ref('');
const gradStart = ref('');
const gradEnd = ref('');

function modeOf(v?: string): Mode {
  if (v?.startsWith('gradient:')) return 'gradient';
  if (v?.startsWith('hex:')) return 'hex';
  if (v?.startsWith('ansi256:')) return '256';
  return 'named';
}

const triggerCss = computed(() => {
  const v = props.modelValue;
  if (!v) return undefined;
  if (v.startsWith('gradient:')) {
    const stops = parseGradientStops(v);
    return stops
      ? { backgroundImage: `linear-gradient(90deg, ${stops.join(',')})` }
      : undefined;
  }
  const css = swatchCss(v);
  return css ? { background: css } : undefined;
});

const triggerLabel = computed(() => {
  const v = props.modelValue;
  if (!v)
    return props.kind === 'fg' ? t('inspector.default') : t('inspector.none');
  if (v.startsWith('gradient:')) return v.slice(9);
  if (v.startsWith('hex:')) return `#${v.slice(4)}`;
  if (v.startsWith('ansi256:')) return v;
  return v.replace(/^bg/, '').replace(/^[A-Z]/, c => c.toLowerCase());
});

function prepareOpen() {
  const v = props.modelValue;
  tab.value = modeOf(v);
  num256.value = v?.startsWith('ansi256:') ? Number(v.slice(8)) : undefined;
  hex.value = v?.startsWith('hex:') ? v.slice(4) : '';
  const stops = v?.startsWith('gradient:')
    ? GRADIENT_PRESETS[v.slice(9).toLowerCase()]
      ? []
      : (parseGradientStops(v) ?? [])
    : [];
  gradStart.value = stops[0] ? stops[0].replace('#', '') : '';
  gradEnd.value = stops[1] ? stops[1].replace('#', '') : '';
}

function setOpen(value: boolean) {
  if (value) prepareOpen();
  open.value = value;
}

function pick(v: string | undefined) {
  emit('update:modelValue', v);
}
function clear() {
  pick(undefined);
  open.value = false;
}

function apply256(n: number | undefined) {
  num256.value = n;
  if (n !== undefined) pick(`ansi256:${n}`);
}
function applyHex() {
  if (/^[0-9a-fA-F]{6}$/.test(hex.value))
    pick(`hex:${hex.value.toLowerCase()}`);
}
function applyCustomGradient() {
  if (
    /^[0-9a-fA-F]{6}$/.test(gradStart.value) &&
    /^[0-9a-fA-F]{6}$/.test(gradEnd.value)
  )
    pick(
      `gradient:${gradStart.value.toLowerCase()}-${gradEnd.value.toLowerCase()}`
    );
}

// ── Native color pickers, kept two-way with the manual text/number inputs ──
// A neutral gray for the picker when the field is empty/invalid, so the native
// dialog doesn't open on misleading black.
const FALLBACK = '#888888';
const isHex6 = (s: string) => /^[0-9a-fA-F]{6}$/.test(s);
const pickerHex = (s: string) => (isHex6(s) ? `#${s}` : FALLBACK);
const picker256 = computed(() =>
  num256.value !== undefined ? ansi256ToHex(num256.value) : FALLBACK
);
const inputHex = (e: Event) => (e.target as HTMLInputElement).value.slice(1);

function onHexPick(e: Event) {
  hex.value = inputHex(e);
  applyHex();
}
// Any picked color snaps to the nearest xterm-256 index — the picker is a
// convenience on top of the 0-255 space, not a way out of it.
function on256Pick(e: Event) {
  apply256(nearest256Index(inputHex(e)));
}
function onGradPick(which: 'start' | 'end', e: Event) {
  (which === 'start' ? gradStart : gradEnd).value = inputHex(e);
  applyCustomGradient();
}

watch(
  () => props.colorLevel,
  () => {
    // If the active tab became unavailable after a level downgrade, fall back.
    if (tab.value === 'hex' && !hasHex.value) tab.value = 'named';
    if (tab.value === '256' && !has256.value) tab.value = 'named';
    if (tab.value === 'gradient' && !hasGradient.value) tab.value = 'named';
  }
);

function setTab(v: unknown) {
  if (v == null) return; // re-clicking the active item emits undefined — ignore to keep single-select
  tab.value = v as Mode;
}
</script>

<template>
  <Popover :open="open" @update:open="setOpen">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="border-border bg-secondary/40 hover:bg-secondary inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md border pr-2 pl-1.5 text-xs transition-colors"
      >
        <span
          class="border-border/70 size-4 shrink-0 rounded-sm border bg-[repeating-conic-gradient(#444_0_25%,transparent_0_50%)] bg-[length:8px_8px]"
          :style="triggerCss"
        />
        <span
          class="text-foreground/80 max-w-[88px] truncate font-mono text-xs"
        >
          {{ triggerLabel }}
        </span>
      </button>
    </PopoverTrigger>

    <PopoverContent
      align="start"
      class="z-[60] w-64 space-y-2 rounded-lg p-2.5 shadow-xl"
    >
      <!-- mode tabs -->
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        :model-value="tab"
        class="w-full"
        @update:model-value="setTab"
      >
        <ToggleGroupItem value="named" class="h-7 flex-1 px-2 text-xs">
          {{ t('inspector.mode.named') }}
        </ToggleGroupItem>
        <ToggleGroupItem
          v-if="has256"
          value="256"
          class="h-7 flex-1 px-2 text-xs"
        >
          {{ t('inspector.mode.256') }}
        </ToggleGroupItem>
        <ToggleGroupItem
          v-if="hasHex"
          value="hex"
          class="h-7 flex-1 px-2 text-xs"
        >
          {{ t('inspector.mode.hex') }}
        </ToggleGroupItem>
        <ToggleGroupItem
          v-if="hasGradient"
          value="gradient"
          class="h-7 flex-1 px-2 text-xs"
        >
          {{ t('inspector.mode.gradient') }}
        </ToggleGroupItem>
      </ToggleGroup>
      <p
        v-if="!hasHex"
        class="text-muted-foreground/70 text-[11px] leading-snug"
      >
        {{ t('inspector.depthHint') }}
      </p>

      <!-- none / default -->
      <button
        type="button"
        class="border-border text-muted-foreground hover:text-foreground hover:border-primary/50 h-7 w-full rounded-md border border-dashed text-xs"
        @click="clear"
      >
        {{ kind === 'fg' ? t('inspector.default') : t('inspector.none') }}
      </button>

      <!-- named grid -->
      <div v-if="tab === 'named'" class="grid grid-cols-8 gap-1">
        <button
          v-for="c in names"
          :key="c"
          type="button"
          :title="c"
          :class="[
            'size-6 rounded border transition-transform hover:scale-110',
            modelValue === c
              ? 'border-primary ring-primary ring-1'
              : 'border-border/60'
          ]"
          :style="{ background: swatchCss(c) }"
          @click="pick(c)"
        />
      </div>

      <!-- ansi256 -->
      <div v-else-if="tab === '256'" class="space-y-1.5">
        <div class="flex items-center gap-2">
          <NumberField
            :model-value="num256"
            :min="0"
            :max="255"
            class="w-24"
            @update:model-value="apply256"
          >
            <NumberFieldContent>
              <NumberFieldDecrement class="p-1.5" />
              <NumberFieldInput
                class="h-7 text-xs"
                placeholder="0–255"
                maxlength="3"
                @beforeinput="guardNumberInput($event, 255)"
                @input="scrubNumberInput($event, 255)"
              />
              <NumberFieldIncrement class="p-1.5" />
            </NumberFieldContent>
          </NumberField>
          <input
            type="color"
            class="ccse-color-input size-7"
            :title="t('inspector.snap256Hint')"
            :value="picker256"
            @input="on256Pick"
          />
          <span class="text-muted-foreground text-[11px]">ansi256</span>
        </div>
      </div>

      <!-- hex -->
      <div v-else-if="tab === 'hex'" class="space-y-1.5">
        <div class="flex items-center gap-2">
          <span class="text-muted-foreground font-mono text-xs">#</span>
          <Input
            :model-value="hex"
            type="text"
            maxlength="6"
            placeholder="RRGGBB"
            class="h-7 w-24 font-mono text-xs"
            @update:model-value="
              hex = String($event);
              applyHex();
            "
          />
          <input
            type="color"
            class="ccse-color-input size-7"
            :value="pickerHex(hex)"
            @input="onHexPick"
          />
        </div>
      </div>

      <!-- gradient -->
      <div v-else-if="tab === 'gradient'" class="space-y-2">
        <div class="grid max-h-40 grid-cols-1 gap-1 overflow-auto pr-1">
          <button
            v-for="g in GRADIENT_PRESET_NAMES"
            :key="g"
            type="button"
            :class="[
              'flex h-7 items-center rounded-md border px-2 font-mono text-xs text-white/90 transition-transform hover:scale-[1.02]',
              modelValue === `gradient:${g}`
                ? 'border-primary ring-primary ring-1'
                : 'border-border/40'
            ]"
            :style="{
              backgroundImage: `linear-gradient(90deg, ${GRADIENT_PRESETS[g]!.join(',')})`
            }"
            @click="pick(`gradient:${g}`)"
          >
            {{ g }}
          </button>
        </div>
        <div class="border-border/60 space-y-1.5 border-t pt-1">
          <span class="text-muted-foreground text-[11px]">
            {{ t('inspector.custom') }}
          </span>
          <div class="flex items-center gap-1.5">
            <input
              type="color"
              class="ccse-color-input size-6"
              :value="pickerHex(gradStart)"
              @input="onGradPick('start', $event)"
            />
            <Input
              :model-value="gradStart"
              placeholder="RRGGBB"
              maxlength="6"
              class="h-6 w-16 px-1.5 font-mono text-[11px]"
              @update:model-value="
                gradStart = String($event);
                applyCustomGradient();
              "
            />
            <span class="text-muted-foreground">→</span>
            <input
              type="color"
              class="ccse-color-input size-6"
              :value="pickerHex(gradEnd)"
              @input="onGradPick('end', $event)"
            />
            <Input
              :model-value="gradEnd"
              placeholder="RRGGBB"
              maxlength="6"
              class="h-6 w-16 px-1.5 font-mono text-[11px]"
              @update:model-value="
                gradEnd = String($event);
                applyCustomGradient();
              "
            />
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>

<style scoped>
/* Native <input type="color"> styled down to a plain rounded swatch, so it
   reads as "the preview chip, but clickable" next to its manual text input. */
.ccse-color-input {
  flex-shrink: 0;
  cursor: pointer;
  padding: 0;
  background: transparent;
  border: 1px solid color-mix(in oklab, var(--border) 60%, transparent);
  border-radius: calc(var(--radius) - 4px);
}
.ccse-color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}
.ccse-color-input::-webkit-color-swatch {
  border: none;
  border-radius: calc(var(--radius) - 5px);
}
.ccse-color-input::-moz-color-swatch {
  border: none;
  border-radius: calc(var(--radius) - 5px);
}
</style>
