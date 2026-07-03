<script setup lang="ts">
import { Check, Copy, MousePointerClick, RotateCcw, Trash2 } from '@lucide/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ColorField from '@/components/inspector/ColorField.vue';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet
} from '@/components/ui/field';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useConfigStore } from '@/stores/config';
import {
  optionsFor,
  supportsColors,
  supportsRawValue,
  type WidgetOption
} from '@/widgets/options';
import type { Widget } from '@/widgets';

const store = useConfigStore();
const { t } = useI18n();
const emptyIconGradientId = `ccse-inspector-empty-icon-gradient-${Math.random().toString(36).slice(2)}`;
// Mirrors the CSS `@media (prefers-reduced-motion: reduce)` guards used elsewhere —
// SMIL <animate> isn't covered by those, so it's gated here instead.
const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const w = computed<Widget | null>(() => store.selectedWidget);
const sel = computed(() => store.selection);

// Copy the selected widget's uuid to the clipboard, echoing a brief ✓. Keyed by
// the copied id (not a bare boolean) so switching widgets clears the tick on its own.
const copiedId = ref<string | null>(null);
let copyTimer: ReturnType<typeof setTimeout> | undefined;
async function copyId() {
  if (!w.value) return;
  try {
    await navigator.clipboard.writeText(w.value.id);
    copiedId.value = w.value.id;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copiedId.value = null;
    }, 1500);
  } catch {
    /* clipboard unavailable (non-secure context) — fail silently */
  }
}

const isSeparator = computed(() => w.value?.type === 'separator');
const isFlexSep = computed(() => w.value?.type === 'flex-separator');
// Colorable (= ccstatusline's ColorMenu filter): drives the whole Style group —
// foreground/background/bold/dim are only reachable for colorable widgets.
const canColor = computed(() => !!w.value && supportsColors(w.value));
const canRaw = computed(() => !!w.value && supportsRawValue(w.value.type));

// Per-widget specific options, filtered by their showIf predicate.
const specificOptions = computed<WidgetOption[]>(() => {
  if (!w.value) return [];
  return optionsFor(w.value.type).filter(o => !o.showIf || o.showIf(w.value!));
});

// Is there a widget after this one on the same line? (merge targets the next widget)
const hasNext = computed(() => {
  if (!sel.value) return false;
  const line = store.config.lines[sel.value.lineIndex]!;
  return line.findIndex(x => x.id === w.value!.id) < line.length - 1;
});
// merge is unavailable for separators / flex-separators (matches ItemsEditor.canMerge).
const mergeable = computed(
  () => hasNext.value && !isSeparator.value && !isFlexSep.value
);

function patch(p: Partial<Widget>) {
  if (w.value) store.updateWidget(w.value.id, p);
}

// ── generic option read/write ──────────────────────────────────────────────
function getVal(o: WidgetOption): string {
  const item = w.value!;
  if (o.field) {
    const v = item[o.field];
    return v === undefined || v === null ? '' : String(v);
  }
  if (o.metaKey) {
    const primary = item.metadata?.[o.metaKey];
    if (primary !== undefined) return primary;
    // Legacy fallback only when the new key is strictly absent (matches
    // ccstatusline's own read order — see WidgetOption.legacyMetaKey).
    if (
      o.legacyMetaKey &&
      item.metadata?.[o.legacyMetaKey] === 'true' &&
      o.legacyValue !== undefined
    )
      return o.legacyValue;
  }
  return '';
}
function isOn(o: WidgetOption): boolean {
  if (o.field) return !!w.value![o.field];
  const meta = w.value!.metadata;
  const primary = meta?.[o.metaKey!];
  if (primary !== undefined) return primary === 'true';
  return o.legacyMetaKey ? meta?.[o.legacyMetaKey] === 'true' : false;
}

function setText(o: WidgetOption, value: string) {
  const v = value.trim() === '' ? undefined : value;
  if (o.field) patch({ [o.field]: v } as Partial<Widget>);
  else writeMeta(o, v);
}
function getNumVal(o: WidgetOption): number | undefined {
  const item = w.value!;
  if (o.field) {
    const v = item[o.field];
    return typeof v === 'number' ? v : undefined;
  }
  if (o.metaKey) {
    const v = item.metadata?.[o.metaKey];
    return v === undefined ? undefined : Number(v);
  }
  return undefined;
}
function setNumber(o: WidgetOption, value: number | undefined) {
  let v = value;
  if (v !== undefined && o.clamp) {
    if (o.min !== undefined && v < o.min) v = o.min;
    if (o.max !== undefined && v > o.max) v = o.max;
  }
  // ccstatusline's own guard is "> 0, else clear" (not clamp-to-1) — so an
  // invalid/non-positive entry deletes the key rather than pinning to a floor.
  if (v !== undefined && o.positiveOnly && v <= 0) v = undefined;
  if (o.field) patch({ [o.field]: v } as Partial<Widget>);
  else writeMeta(o, v === undefined ? undefined : String(v));
}
function setToggle(o: WidgetOption, on: boolean) {
  if (o.field) {
    patch({ [o.field]: on ? true : undefined } as Partial<Widget>);
    return;
  }
  // ccstatusline's generic toggle writes literal 'false' on off; deleteOnOff
  // opts a widget out for the minority with bespoke delete-on-off logic (see
  // WidgetOption.deleteOnOff). legacyMetaKey is migrated away from on every
  // write, on or off, matching ccstatusline's own always-strip behavior.
  const offValue = o.deleteOnOff ? undefined : 'false';
  const clears = [
    ...(on ? (o.clearsMeta ?? []) : []),
    ...(o.legacyMetaKey ? [o.legacyMetaKey] : [])
  ];
  writeMeta(o, on ? 'true' : offValue, clears.length ? clears : undefined);
}
function setEnum(o: WidgetOption, value: string) {
  const isDefault = value === '' || value === o.defaultValue;
  if (o.field) {
    patch({
      [o.field]: isDefault && o.field === 'character' ? undefined : value
    } as Partial<Widget>);
    return;
  }
  // Normally clearsMeta fires on a non-default pick; clearsMetaExceptValue swaps
  // that for "fires whenever the target isn't this one value" (see its doc).
  const shouldClear =
    o.clearsMetaExceptValue !== undefined
      ? value !== o.clearsMetaExceptValue
      : !isDefault;
  const clears = [
    ...(shouldClear ? (o.clearsMeta ?? []) : []),
    ...(o.legacyMetaKey ? [o.legacyMetaKey] : [])
  ];
  writeMeta(
    o,
    isDefault ? undefined : value,
    clears.length ? clears : undefined
  );
}

// Write a single metadata key (+ optional sibling clears) in one history step.
function writeMeta(
  o: WidgetOption,
  value: string | undefined,
  clears?: string[]
) {
  const item = w.value!;
  const meta = { ...(item.metadata || {}) };
  if (value === undefined || value === '') delete meta[o.metaKey!];
  else meta[o.metaKey!] = value;
  if (clears) for (const k of clears) delete meta[k];
  patch({ metadata: Object.keys(meta).length ? meta : undefined });
}

// Enum-type options all share control:'enum', with the option count deciding
// presentation: ≤ENUM_INLINE_MAX renders as a button group (ToggleGroup),
// more falls back to a dropdown (Select). The rule lives here once so we don't
// have to pick a control per option.
const ENUM_INLINE_MAX = 4;
// reka-ui's Select/ToggleGroup won't accept an empty-string value, so this
// sentinel stands in for "default / empty".
const SEL_NONE = '__none__';
function selValue(o: WidgetOption): string {
  return getVal(o) || o.defaultValue || '' || SEL_NONE;
}
function onEnum(o: WidgetOption, v: unknown) {
  if (v == null) return; // ToggleGroup returns undefined when the active item is clicked again — ignore it to keep single-select
  setEnum(o, v === SEL_NONE ? '' : String(v));
}

// dim / merge are mixed-type values on Widget (boolean | string literal); map them to/from ToggleGroup's string value.
const DIM_OPTS = [
  { id: 'off', key: 'inspector.off' },
  { id: 'whole', key: 'inspector.dimWhole' },
  { id: 'parens', key: 'inspector.dimParens' }
];
const MERGE_OPTS = [
  { id: 'off', key: 'inspector.off' },
  { id: 'merge', key: 'inspector.merge' },
  { id: 'nopad', key: 'inspector.mergeNoPad' }
];
const dimModel = computed(() =>
  w.value?.dim === true ? 'whole' : w.value?.dim === 'parens' ? 'parens' : 'off'
);
const mergeModel = computed(() =>
  w.value?.merge === true
    ? 'merge'
    : w.value?.merge === 'no-padding'
      ? 'nopad'
      : 'off'
);
function setDim(v: unknown) {
  if (v)
    patch({
      dim: v === 'whole' ? true : v === 'parens' ? 'parens' : undefined
    });
}
function setMerge(v: unknown) {
  if (v)
    patch({
      merge: v === 'merge' ? true : v === 'nopad' ? 'no-padding' : undefined
    });
}

// Confirmation for the header's "restore defaults" icon — a small popover
// (not a full-screen dialog), matching the global-settings one.
const showResetConfirm = ref(false);
function resetDefaults() {
  if (w.value) store.resetWidgetToDefaults(w.value.id);
  showResetConfirm.value = false;
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <!-- empty state -->
    <div
      v-if="!w"
      class="text-muted-foreground flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center"
    >
      <!-- defs live inside the icon's own (rendered) <svg> via its default slot, not a
           separate zero-size host — a zero-area SVG's SMIL timeline doesn't reliably
           tick in some engines, which silently freezes the <animate> below. -->
      <MousePointerClick
        class="size-7 opacity-70"
        :color="`url(#${emptyIconGradientId})`"
      >
        <defs>
          <!-- userSpaceOnUse + spanning the full 24x24 viewBox: the default
               objectBoundingBox would let each stroke (the cursor arrow, the
               four separate short lines) pick its own color from its own tiny
               bounding box, so the color would jump between strokes instead of
               flowing smoothly; a shared coordinate system lets the whole icon
               use one continuous gradient. spreadMethod="repeat" is the key
               bit: SVG gradients default to pad (clamping to the edge color
               once out of range), unlike CSS background-position which tiles
               infinitely via background-repeat — without it, once x1/x2 slide
               out of the icon's window, the whole shape would flash to a single
               solid color before snapping back to the start. Double width
               (x1→x2 spans 48, i.e. 2×24) with matching start/end colors, plus
               the <animate> below shifting x1/x2 together by -48, reproduces
               the same seamless loop as the title's CSS background-position
               gradient flow. -->
          <linearGradient
            :id="emptyIconGradientId"
            gradientUnits="userSpaceOnUse"
            spreadMethod="repeat"
            x1="0"
            y1="0"
            x2="48"
            y2="0"
          >
            <stop offset="0%" stop-color="#3f51b1" />
            <stop offset="11.111%" stop-color="#5a55ae" />
            <stop offset="22.222%" stop-color="#7b5fac" />
            <stop offset="33.333%" stop-color="#8f6aae" />
            <stop offset="44.444%" stop-color="#a86aa4" />
            <stop offset="55.556%" stop-color="#cc6b8e" />
            <stop offset="66.667%" stop-color="#f18271" />
            <stop offset="77.778%" stop-color="#f3a469" />
            <stop offset="88.889%" stop-color="#f7c978" />
            <stop offset="100%" stop-color="#3f51b1" />
            <template v-if="!reduceMotion">
              <animate
                attributeName="x1"
                values="0;-48"
                dur="4s"
                calcMode="linear"
                repeatCount="indefinite"
              />
              <animate
                attributeName="x2"
                values="48;0"
                dur="4s"
                calcMode="linear"
                repeatCount="indefinite"
              />
            </template>
          </linearGradient>
        </defs>
      </MousePointerClick>
      <p class="ccse-gradient-flow text-xs leading-relaxed">
        {{ t('inspector.empty') }}
      </p>
    </div>

    <template v-else>
      <!-- header -->
      <div class="border-border/50 shrink-0 border-b px-4 pt-4 pb-3">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-foreground truncate text-sm font-medium">
              {{ t(`widgets.${w.type}`) }}
            </div>
          </div>
          <Popover v-model:open="showResetConfirm">
            <PopoverTrigger as-child>
              <button
                type="button"
                class="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-md"
                :title="t('inspector.resetDefaults')"
                :aria-label="t('inspector.resetDefaults')"
              >
                <RotateCcw class="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" class="z-[60] w-60 space-y-2.5 p-3">
              <p class="text-muted-foreground text-xs leading-relaxed">
                {{ t('inspector.resetDefaultsConfirm') }}
              </p>
              <div class="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  class="h-7 text-xs"
                  @click="showResetConfirm = false"
                >
                  {{ t('app.cancel') }}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  class="h-7 text-xs"
                  @click="resetDefaults"
                >
                  {{ t('global.guard.confirm') }}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <!-- unique id — click to copy -->
        <button
          type="button"
          class="text-muted-foreground/60 hover:text-muted-foreground mt-1.5 flex max-w-full items-center gap-1.5 text-[11px] transition-colors"
          :title="t('inspector.copyId')"
          @click="copyId"
        >
          <span class="shrink-0">{{ t('inspector.id') }}:</span>
          <code class="truncate font-mono">{{ w.id }}</code>
          <template v-if="copiedId === w.id">
            <Check class="text-foreground size-3 shrink-0" />
            <span class="text-foreground shrink-0">
              {{ t('inspector.copied') }}
            </span>
          </template>
          <Copy v-else class="size-3 shrink-0 opacity-70" />
        </button>
      </div>

      <ScrollArea class="min-h-0 flex-1">
        <FieldGroup class="px-4 pt-4 pb-4">
          <!-- ── Style (only for colorable widgets — mirrors ColorMenu's filter) ── -->
          <FieldSet v-if="canColor">
            <FieldLegend variant="label">
              {{ t('inspector.groupStyle') }}
            </FieldLegend>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldLabel>{{ t('inspector.foreground') }}</FieldLabel>
                <ColorField
                  kind="fg"
                  :model-value="w.color"
                  :color-level="store.config.colorLevel"
                  @update:model-value="patch({ color: $event })"
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel>{{ t('inspector.background') }}</FieldLabel>
                <ColorField
                  kind="bg"
                  :model-value="w.backgroundColor"
                  :color-level="store.config.colorLevel"
                  @update:model-value="patch({ backgroundColor: $event })"
                />
              </Field>

              <Field orientation="horizontal">
                <FieldLabel>{{ t('inspector.bold') }}</FieldLabel>
                <Toggle
                  variant="outline"
                  size="sm"
                  class="h-7 px-3 text-xs font-semibold"
                  :model-value="!!w.bold"
                  @update:model-value="
                    patch({ bold: $event ? true : undefined })
                  "
                >
                  B
                </Toggle>
              </Field>

              <Field orientation="horizontal">
                <FieldLabel>{{ t('inspector.dim') }}</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  :model-value="dimModel"
                  @update:model-value="setDim($event)"
                >
                  <ToggleGroupItem
                    v-for="d in DIM_OPTS"
                    :key="d.id"
                    :value="d.id"
                    class="h-7 px-2 text-xs"
                  >
                    {{ t(d.key) }}
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSeparator v-if="canColor && canRaw" />

          <!-- ── Value ── -->
          <FieldSet v-if="canRaw">
            <FieldLegend variant="label">
              {{ t('inspector.groupValue') }}
            </FieldLegend>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldLabel for="insp-raw">
                  {{ t('inspector.rawValue') }}
                </FieldLabel>
                <Switch
                  id="insp-raw"
                  :model-value="!!w.rawValue"
                  @update:model-value="
                    patch({ rawValue: $event ? true : undefined })
                  "
                />
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSeparator
            v-if="(canColor || canRaw) && specificOptions.length"
          />

          <!-- ── Specific ── -->
          <FieldSet v-if="specificOptions.length">
            <FieldLegend variant="label">
              {{ t('inspector.groupSpecific') }}
            </FieldLegend>
            <FieldGroup>
              <template v-for="o in specificOptions" :key="o.id">
                <!-- toggle -->
                <Field v-if="o.control === 'toggle'" orientation="horizontal">
                  <FieldLabel :for="`insp-${o.id}`">
                    {{ t(`wopt.${o.id}`) }}
                  </FieldLabel>
                  <Switch
                    :id="`insp-${o.id}`"
                    :model-value="isOn(o)"
                    @update:model-value="setToggle(o, $event)"
                  />
                </Field>

                <!-- enum: ≤ENUM_INLINE_MAX options render as a button group, more falls back to a dropdown (decided uniformly by option count) -->
                <Field
                  v-else-if="o.control === 'enum'"
                  orientation="horizontal"
                >
                  <FieldLabel :for="`insp-${o.id}`">
                    {{ t(`wopt.${o.id}`) }}
                  </FieldLabel>
                  <ToggleGroup
                    v-if="(o.options?.length ?? 0) <= ENUM_INLINE_MAX"
                    type="single"
                    variant="outline"
                    size="sm"
                    :model-value="selValue(o)"
                    @update:model-value="onEnum(o, $event)"
                  >
                    <ToggleGroupItem
                      v-for="opt in o.options"
                      :key="opt.value"
                      :value="opt.value || SEL_NONE"
                      class="h-7 px-2 text-xs"
                    >
                      {{ t(opt.labelKey) }}
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <Select
                    v-else
                    :model-value="selValue(o)"
                    @update:model-value="onEnum(o, $event)"
                  >
                    <SelectTrigger
                      :id="`insp-${o.id}`"
                      size="sm"
                      class="max-w-[150px] text-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="opt in o.options"
                        :key="opt.value"
                        :value="opt.value || SEL_NONE"
                        class="text-xs"
                      >
                        {{ t(opt.labelKey) }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <!-- text -->
                <Field v-else-if="o.control === 'text'">
                  <FieldLabel :for="`insp-${o.id}`">
                    {{ t(`wopt.${o.id}`) }}
                  </FieldLabel>
                  <Input
                    :id="`insp-${o.id}`"
                    type="text"
                    :model-value="getVal(o)"
                    :placeholder="o.placeholderKey ? t(o.placeholderKey) : ''"
                    class="h-7 font-mono text-xs"
                    @update:model-value="setText(o, String($event))"
                  />
                </Field>

                <!-- number -->
                <Field
                  v-else-if="o.control === 'number'"
                  orientation="horizontal"
                >
                  <FieldLabel :for="`insp-${o.id}`">
                    {{ t(`wopt.${o.id}`) }}
                  </FieldLabel>
                  <NumberField
                    :id="`insp-${o.id}`"
                    :min="o.min"
                    :max="o.max"
                    :model-value="getNumVal(o)"
                    class="w-28"
                    @update:model-value="setNumber(o, $event)"
                  >
                    <NumberFieldContent>
                      <NumberFieldDecrement class="p-1.5" />
                      <NumberFieldInput
                        class="h-7 text-xs"
                        :placeholder="
                          o.placeholderKey ? t(o.placeholderKey) : ''
                        "
                      />
                      <NumberFieldIncrement class="p-1.5" />
                    </NumberFieldContent>
                  </NumberField>
                </Field>
              </template>
            </FieldGroup>
          </FieldSet>

          <FieldSeparator v-if="canColor || canRaw || specificOptions.length" />

          <!-- ── Layout ── merge is the only control in this group; when not
               mergeable (separator / flex-separator / last widget on a line),
               the whole group hides along with its heading, so we don't end up
               with an empty "Layout" heading over just clone/delete buttons. -->
          <FieldSet v-if="mergeable">
            <FieldLegend variant="label">
              {{ t('inspector.groupLayout') }}
            </FieldLegend>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldLabel>{{ t('inspector.mergeNext') }}</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  :model-value="mergeModel"
                  @update:model-value="setMerge($event)"
                >
                  <ToggleGroupItem
                    v-for="m in MERGE_OPTS"
                    :key="m.id"
                    :value="m.id"
                    class="h-7 px-2 text-xs"
                  >
                    {{ t(m.key) }}
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>
            </FieldGroup>
          </FieldSet>

          <!-- ── Actions ── clone/delete don't belong to any settings group, always shown -->
          <div class="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              class="h-8 flex-1 gap-1.5 text-xs"
              @click="store.cloneWidget(w.id)"
            >
              <Copy class="size-3.5" />
              {{ t('inspector.clone') }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="text-muted-foreground hover:bg-destructive hover:border-destructive h-8 flex-1 gap-1.5 text-xs hover:text-white"
              @click="store.removeWidgetById(w.id)"
            >
              <Trash2 class="size-3.5" />
              {{ t('inspector.delete') }}
            </Button>
          </div>
        </FieldGroup>
      </ScrollArea>
    </template>
  </div>
</template>
