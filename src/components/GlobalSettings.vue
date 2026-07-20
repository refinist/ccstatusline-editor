<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import ColorField from '@/components/inspector/ColorField.vue';
import PowerlineGlyph from '@/components/PowerlineGlyph.vue';
import {
  Field,
  FieldContent,
  FieldDescription,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { guardNumberInput, scrubNumberInput } from '@/lib/numberInput';
import { POWERLINE_THEME_OPTIONS } from '@/preview/powerline';
import { useConfigStore } from '@/stores/config';

const store = useConfigStore();
const { t } = useI18n();

const cfg = computed(() => store.config);
const pl = computed(() => store.config.powerline);
const isPL = computed(() => store.config.powerline.enabled);

// ── option sets ─────────────────────────────────────────────────────────────
const FLEX_MODES = [
  { v: 'full', key: 'global.flex.full' },
  { v: 'full-minus-40', key: 'global.flex.minus40' },
  { v: 'full-until-compact', key: 'global.flex.untilCompact' }
];
const COLOR_LEVELS = [
  { v: 0, key: 'global.level.none' },
  { v: 1, key: 'global.level.basic' },
  { v: 2, key: 'global.level.c256' },
  { v: 3, key: 'global.level.true' }
];
const PADDING_SIDES = [
  { v: 'both', key: 'global.padding.both' },
  { v: 'left', key: 'global.padding.left' },
  { v: 'right', key: 'global.padding.right' }
];
// value = the theme key stored in JSON; label = the display name shown in ccstatusline's TUI.
const PL_THEMES = POWERLINE_THEME_OPTIONS;
// Powerline glyphs are private-use chars (need a patched font), so the buttons
// draw them via PowerlineGlyph instead of relying on the visitor's font.
const PL_SEPARATORS = [
  { glyph: '', key: 'global.pl.sepTriRight' },
  { glyph: '', key: 'global.pl.sepTriLeft' },
  { glyph: '', key: 'global.pl.sepRoundRight' },
  { glyph: '', key: 'global.pl.sepRoundLeft' }
];
const curSeparator = computed(() => cfg.value.powerline.separators[0] || '');

// Start/End cap presets match ccstatusline TUI's PowerlineSeparatorEditor
// (E0B2/E0B6/E0BA/E0BE for start caps; E0B0/E0B4/E0B8/E0BC for end caps).
// The first option, "none", stores an empty array and draws no cap (the
// upstream format allows caps to be empty).
const NO_CAP = 'none';
const PL_START_CAPS = [
  { glyph: NO_CAP, key: 'global.pl.capNone' },
  { glyph: '\uE0B2', key: 'global.pl.capTri' },
  { glyph: '\uE0B6', key: 'global.pl.capRound' },
  { glyph: '\uE0BA', key: 'global.pl.capLowerTri' },
  { glyph: '\uE0BE', key: 'global.pl.capDiag' }
];
const PL_END_CAPS = [
  { glyph: NO_CAP, key: 'global.pl.capNone' },
  { glyph: '\uE0B0', key: 'global.pl.capTri' },
  { glyph: '\uE0B4', key: 'global.pl.capRound' },
  { glyph: '\uE0B8', key: 'global.pl.capLowerTri' },
  { glyph: '\uE0BC', key: 'global.pl.capDiag' }
];
const curStartCap = computed(() => cfg.value.powerline.startCaps[0] ?? NO_CAP);
const curEndCap = computed(() => cfg.value.powerline.endCaps[0] ?? NO_CAP);

// ── confirm-dialog guard ─────────────────────────────────────────────────────
const confirmOpen = ref(false);
const confirmDesc = ref('');
let pendingApply: (() => void) | null = null;
function guarded(needsConfirm: boolean, desc: string, apply: () => void) {
  if (needsConfirm) {
    confirmDesc.value = desc;
    pendingApply = apply;
    confirmOpen.value = true;
  } else apply();
}
function onConfirm() {
  pendingApply?.();
  pendingApply = null;
}

// ── setters ──────────────────────────────────────────────────────────────────
const set = (patch: Partial<typeof cfg.value>) =>
  store.updateConfig(patch as any);
const setPL = (patch: Partial<typeof pl.value>) =>
  store.updatePowerline(patch as any);

function setDefaultSeparator(v: string) {
  const val = v.trim() === '' ? undefined : v;
  // Applies live as you type — no confirm dialog; ⌘/Ctrl+Z still undoes the strip.
  if (val && store.hasManualSeparators) store.stripManualSeparators();
  set({ defaultSeparator: val });
}
function togglePowerline(on: boolean) {
  if (on) {
    guarded(store.hasManualSeparators, t('global.guard.stripPL'), () => {
      if (store.hasManualSeparators) store.stripManualSeparators();
      // Mirrors ccstatusline's buildEnabledPowerlineSettings: enabling powerline
      // defaults the theme to nord-aurora (unless one is already picked) and
      // forces padding to a single space.
      const theme =
        !pl.value.theme || pl.value.theme === 'custom'
          ? 'nord-aurora'
          : pl.value.theme;
      setPL({ enabled: true, theme });
      set({ defaultPadding: ' ' });
    });
  } else {
    setPL({ enabled: false });
  }
}
function setSeparatorGlyph(glyph: string) {
  // Left-facing glyphs read better with the fg/bg swap (ccstatusline's invert).
  const leftFacing = glyph === '' || glyph === '';
  setPL({ separators: [glyph], separatorInvertBackground: [leftFacing] });
}
// Picking "none" (or deselecting) stores an empty array and draws no cap.
function setStartCap(glyph: string | null) {
  setPL({ startCaps: glyph && glyph !== NO_CAP ? [glyph] : [] });
}
function setEndCap(glyph: string | null) {
  setPL({ endCaps: glyph && glyph !== NO_CAP ? [glyph] : [] });
}
</script>

<template>
  <div class="-m-4 flex min-h-0 flex-1 flex-col">
    <ScrollArea class="min-h-0 flex-1">
      <FieldGroup class="px-4 pt-4 pb-4">
        <!-- ── Terminal ── -->
        <FieldSet>
          <FieldLegend variant="label">
            {{ t('global.groupTerminal') }}
          </FieldLegend>
          <FieldGroup class="gap-4">
            <Field orientation="horizontal">
              <FieldLabel for="gs-flex">{{ t('global.flexMode') }}</FieldLabel>
              <Select
                :model-value="cfg.flexMode ?? 'full-minus-40'"
                @update:model-value="set({ flexMode: $event as any })"
              >
                <SelectTrigger
                  id="gs-flex"
                  size="sm"
                  class="max-w-[150px] text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="m in FLEX_MODES"
                    :key="m.v"
                    :value="m.v"
                    class="text-xs"
                  >
                    {{ t(m.key) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field
              v-if="cfg.flexMode === 'full-until-compact'"
              orientation="horizontal"
            >
              <FieldLabel for="gs-compact">
                {{ t('global.compactThreshold') }}
              </FieldLabel>
              <NumberField
                id="gs-compact"
                :min="1"
                :max="99"
                :model-value="cfg.compactThreshold"
                class="w-28"
                @update:model-value="set({ compactThreshold: $event })"
              >
                <NumberFieldContent>
                  <NumberFieldDecrement class="p-1.5" />
                  <NumberFieldInput
                    class="h-7 text-xs"
                    @beforeinput="guardNumberInput($event, 99)"
                    @input="scrubNumberInput($event, 99)"
                  />
                  <NumberFieldIncrement class="p-1.5" />
                </NumberFieldContent>
              </NumberField>
            </Field>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel>{{ t('global.colorLevel') }}</FieldLabel>
                <FieldDescription
                  v-if="cfg.colorLevel < 2 && store.hasCustomColors"
                  class="text-warning"
                >
                  ⚠ {{ t('global.colorLevelWarn') }}
                </FieldDescription>
              </FieldContent>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                :model-value="String(cfg.colorLevel)"
                @update:model-value="
                  $event != null && store.setColorLevel(Number($event))
                "
              >
                <ToggleGroupItem
                  v-for="lv in COLOR_LEVELS"
                  :key="lv.v"
                  :value="String(lv.v)"
                  class="h-7 px-2 text-xs"
                >
                  {{ t(lv.key) }}
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <!-- ── Global Overrides ── -->
        <FieldSet>
          <FieldLegend variant="label">
            {{ t('global.groupOverrides') }}
          </FieldLegend>
          <FieldGroup class="gap-4">
            <Field orientation="horizontal">
              <FieldLabel for="gs-bold">
                {{ t('global.globalBold') }}
              </FieldLabel>
              <Switch
                id="gs-bold"
                :model-value="!!cfg.globalBold"
                @update:model-value="set({ globalBold: $event })"
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel for="gs-min">{{ t('global.minimalist') }}</FieldLabel>
              <Switch
                id="gs-min"
                :model-value="!!cfg.minimalistMode"
                @update:model-value="set({ minimalistMode: $event })"
              />
            </Field>

            <Field orientation="horizontal">
              <FieldLabel>{{ t('global.overrideFg') }}</FieldLabel>
              <ColorField
                kind="fg"
                :model-value="cfg.overrideForegroundColor"
                :color-level="cfg.colorLevel"
                @update:model-value="set({ overrideForegroundColor: $event })"
              />
            </Field>
            <Field
              orientation="horizontal"
              :class="isPL && 'pointer-events-none opacity-40'"
            >
              <FieldLabel>{{ t('global.overrideBg') }}</FieldLabel>
              <ColorField
                kind="bg"
                :model-value="cfg.overrideBackgroundColor"
                :color-level="cfg.colorLevel"
                @update:model-value="set({ overrideBackgroundColor: $event })"
              />
            </Field>

            <Field
              orientation="horizontal"
              :class="isPL && 'pointer-events-none opacity-40'"
            >
              <FieldLabel for="gs-sep">
                {{ t('global.defaultSeparator') }}
              </FieldLabel>
              <Input
                id="gs-sep"
                type="text"
                maxlength="8"
                autocomplete="off"
                :model-value="cfg.defaultSeparator ?? ''"
                :placeholder="t('global.ph.none')"
                class="h-7 w-28 font-mono text-xs"
                @update:model-value="setDefaultSeparator(String($event))"
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel for="gs-pad">
                {{ t('global.defaultPadding') }}
              </FieldLabel>
              <Input
                id="gs-pad"
                type="text"
                maxlength="8"
                autocomplete="off"
                :model-value="cfg.defaultPadding ?? ''"
                :placeholder="t('global.ph.none')"
                class="h-7 w-28 font-mono text-xs"
                @update:model-value="
                  set({ defaultPadding: String($event) || undefined })
                "
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel>{{ t('global.paddingSide') }}</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                :model-value="cfg.defaultPaddingSide"
                @update:model-value="
                  $event && set({ defaultPaddingSide: $event as any })
                "
              >
                <ToggleGroupItem
                  v-for="side in PADDING_SIDES"
                  :key="side.v"
                  :value="side.v"
                  class="h-7 px-2 text-xs"
                >
                  {{ t(side.key) }}
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <Field
              orientation="horizontal"
              :class="isPL && 'pointer-events-none opacity-40'"
            >
              <FieldLabel for="gs-inherit">
                {{ t('global.inheritSepColors') }}
              </FieldLabel>
              <Switch
                id="gs-inherit"
                :model-value="!!cfg.inheritSeparatorColors"
                @update:model-value="set({ inheritSeparatorColors: $event })"
              />
            </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <!-- ── Powerline ── -->
        <FieldSet>
          <FieldLegend variant="label" class="flex items-center gap-1.5">
            Powerline
            <span
              v-if="isPL"
              class="bg-primary/20 text-primary rounded px-1 text-[9px]"
            >
              {{ t('global.on') }}
            </span>
          </FieldLegend>

          <FieldGroup class="gap-4">
            <Field orientation="horizontal">
              <FieldLabel for="gs-pl-enable">
                {{ t('global.plEnable') }}
              </FieldLabel>
              <Switch
                id="gs-pl-enable"
                :model-value="isPL"
                @update:model-value="togglePowerline($event)"
              />
            </Field>

            <template v-if="isPL">
              <Field orientation="horizontal">
                <FieldLabel for="gs-pl-theme">
                  {{ t('global.plTheme') }}
                </FieldLabel>
                <Select
                  :model-value="pl.theme ?? 'custom'"
                  @update:model-value="setPL({ theme: $event as any })"
                >
                  <SelectTrigger
                    id="gs-pl-theme"
                    size="sm"
                    class="max-w-[150px] text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="th in PL_THEMES"
                      :key="th.value"
                      :value="th.value"
                      class="text-xs"
                    >
                      {{ th.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field orientation="horizontal">
                <FieldLabel>{{ t('global.plSeparator') }}</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  :model-value="curSeparator"
                  @update:model-value="
                    $event && setSeparatorGlyph(String($event))
                  "
                >
                  <ToggleGroupItem
                    v-for="s in PL_SEPARATORS"
                    :key="s.glyph"
                    :value="s.glyph"
                    :title="t(s.key)"
                    class="size-7"
                  >
                    <!-- Drawn as an SVG shape — the raw private-use char needs a patched font. -->
                    <span class="flex h-4 w-2">
                      <PowerlineGlyph :glyph="s.glyph" />
                    </span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>

              <!-- Start/End caps: decorative segment caps at the start/end of the line (clicking the selected item again clears it). -->
              <Field orientation="horizontal">
                <FieldLabel>{{ t('global.plStartCap') }}</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  :model-value="curStartCap"
                  @update:model-value="
                    setStartCap($event == null ? null : String($event))
                  "
                >
                  <ToggleGroupItem
                    v-for="s in PL_START_CAPS"
                    :key="s.glyph"
                    :value="s.glyph"
                    :title="t(s.key)"
                    class="size-7"
                  >
                    <span
                      v-if="s.glyph === NO_CAP"
                      class="text-[10px] leading-none"
                    >
                      {{ t('global.pl.capNone') }}
                    </span>
                    <span v-else class="flex h-4 w-2">
                      <PowerlineGlyph :glyph="s.glyph" />
                    </span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <Field orientation="horizontal">
                <FieldLabel>{{ t('global.plEndCap') }}</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  :model-value="curEndCap"
                  @update:model-value="
                    setEndCap($event == null ? null : String($event))
                  "
                >
                  <ToggleGroupItem
                    v-for="s in PL_END_CAPS"
                    :key="s.glyph"
                    :value="s.glyph"
                    :title="t(s.key)"
                    class="size-7"
                  >
                    <span
                      v-if="s.glyph === NO_CAP"
                      class="text-[10px] leading-none"
                    >
                      {{ t('global.pl.capNone') }}
                    </span>
                    <span v-else class="flex h-4 w-2">
                      <PowerlineGlyph :glyph="s.glyph" />
                    </span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>

              <Field orientation="horizontal">
                <FieldLabel for="gs-pl-align">
                  {{ t('global.plAutoAlign') }}
                </FieldLabel>
                <Switch
                  id="gs-pl-align"
                  :model-value="!!pl.autoAlign"
                  @update:model-value="setPL({ autoAlign: $event })"
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel for="gs-pl-continue">
                  {{ t('global.plContinue') }}
                </FieldLabel>
                <Switch
                  id="gs-pl-continue"
                  :model-value="!!pl.continueThemeAcrossLines"
                  @update:model-value="
                    setPL({ continueThemeAcrossLines: $event })
                  "
                />
              </Field>
            </template>
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <!-- ── Performance ── -->
        <FieldSet>
          <FieldLegend variant="label">{{ t('global.groupPerf') }}</FieldLegend>
          <FieldGroup class="gap-4">
            <Field orientation="horizontal">
              <FieldLabel for="gs-git">
                {{ t('global.gitCacheTtl') }}
              </FieldLabel>
              <NumberField
                id="gs-git"
                :min="0"
                :max="60"
                :model-value="cfg.gitCacheTtlSeconds"
                class="w-28"
                @update:model-value="set({ gitCacheTtlSeconds: $event })"
              >
                <NumberFieldContent>
                  <NumberFieldDecrement class="p-1.5" />
                  <NumberFieldInput
                    class="h-7 text-xs"
                    @beforeinput="guardNumberInput($event, 60)"
                    @input="scrubNumberInput($event, 60)"
                  />
                  <NumberFieldIncrement class="p-1.5" />
                </NumberFieldContent>
              </NumberField>
            </Field>
            <Field orientation="horizontal">
              <FieldLabel for="gs-refresh">
                {{ t('global.refreshInterval') }}
              </FieldLabel>
              <NumberField
                id="gs-refresh"
                :min="0"
                :model-value="cfg.refreshInterval ?? undefined"
                class="w-28"
                :format-options="{ useGrouping: false }"
                @update:model-value="set({ refreshInterval: $event })"
              >
                <NumberFieldContent>
                  <NumberFieldDecrement class="p-1.5" />
                  <NumberFieldInput
                    class="h-7 text-xs"
                    :placeholder="t('global.ph.default')"
                    @beforeinput="guardNumberInput($event)"
                    @input="scrubNumberInput($event)"
                  />
                  <NumberFieldIncrement class="p-1.5" />
                </NumberFieldContent>
              </NumberField>
            </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <!-- ── Editor preferences (this editor only — never exported) ── -->
        <FieldSet>
          <FieldLegend variant="label">
            {{ t('global.groupEditor') }}
          </FieldLegend>
          <FieldGroup class="gap-4">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel for="gs-auto-sep">
                  {{ t('global.autoSeparator') }}
                </FieldLabel>
                <FieldDescription>
                  {{ t('global.autoSeparatorDesc') }}
                </FieldDescription>
              </FieldContent>
              <Switch
                id="gs-auto-sep"
                :model-value="store.autoSeparator"
                @update:model-value="store.autoSeparator = $event"
              />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel for="gs-rm-sep">
                  {{ t('global.removeTrailingSep') }}
                </FieldLabel>
                <FieldDescription>
                  {{ t('global.removeTrailingSepDesc') }}
                </FieldDescription>
              </FieldContent>
              <Switch
                id="gs-rm-sep"
                :model-value="store.removeTrailingSeparator"
                @update:model-value="store.removeTrailingSeparator = $event"
              />
            </Field>
          </FieldGroup>
        </FieldSet>
      </FieldGroup>
    </ScrollArea>

    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="t('global.guard.stripPLTitle')"
      :description="confirmDesc"
      :confirm-text="t('global.guard.confirm')"
      :cancel-text="t('app.cancel')"
      variant="destructive"
      @confirm="onConfirm"
    />
  </div>
</template>
