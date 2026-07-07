<script setup lang="ts">
import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Check,
  Clock,
  Copy,
  Download,
  FileUp,
  GripVertical,
  LayoutTemplate,
  Pencil,
  Plus,
  Repeat,
  Save,
  Settings2,
  Shuffle,
  SlidersHorizontal,
  TerminalSquare,
  Trash2
} from '@lucide/vue';
import { useClipboard } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { computed, onUnmounted, ref, watch, type Component } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import Drawer from '@/components/Drawer.vue';
import EditorWorkspace from '@/components/EditorWorkspace.vue';
import GlobalSettings from '@/components/GlobalSettings.vue';
import TerminalPreview from '@/components/TerminalPreview.vue';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText
} from '@/components/ui/input-group';
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
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperTitle
} from '@/components/ui/stepper';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { guardNumberInput, scrubNumberInput } from '@/lib/numberInput';
import {
  buildRotateFileCommand,
  buildRotateOnCommand,
  buildRotationBundle,
  commandTooLong,
  isRotationBundle,
  makeBundleFilename,
  MAX_CUSTOM_EVERY,
  MAX_POOL_THEMES,
  MAX_THEME_NAME,
  ROTATE_OFF_COMMAND,
  type CustomPeriodUnit,
  type RotationBundle,
  type RotationPeriodPreset,
  type RotationStrategy,
  type RotationTheme
} from '@/lib/rotationBundle';
import { isCcStatusConfig } from '@/lib/shareConfig';
import { buildWeeklyThemes, toEpochOrder } from '@/lib/weeklyPreset';
import { useConfigStore } from '@/stores/config';
import { useRotationStore } from '@/stores/rotation';
import { TEMPLATES } from '@/templates';
import type { CcStatusConfig } from '@/widgets';

const { t } = useI18n();
const { copy } = useClipboard();
const rot = useRotationStore();
const {
  themes,
  period,
  customEvery,
  customUnit,
  periodValue,
  strategy,
  isFull,
  canRotate,
  isWeeklyPreset
} = storeToRefs(rot);
const configStore = useConfigStore();

// 'custom' and 'weeklyPreset' are UI-only segments; the store folds them into
// the bundle-shaped periodValue. The ordinary cadences form the dropdown's top
// group; 'weeklyPreset' — the "fixed look per weekday" plan, a daily cycle under
// the hood — sits alone below a divider as the last item, since it's a distinct
// mode rather than another cadence.
type PeriodChoice = RotationPeriodPreset | 'custom' | 'weeklyPreset';
const ORDINARY_PERIODS: PeriodChoice[] = ['hour', 'day', 'week', 'custom'];
const CUSTOM_UNITS: CustomPeriodUnit[] = ['minute', 'hour', 'day'];
const STRATEGIES: RotationStrategy[] = ['cycle', 'random'];

// Per-option icons for the period / strategy selects, shown in each dropdown
// item (and carried onto the trigger too, since they sit inside SelectItemText).
const PERIOD_ICONS: Record<PeriodChoice, Component> = {
  hour: Clock,
  day: CalendarDays,
  week: CalendarRange,
  weeklyPreset: CalendarCheck,
  custom: SlidersHorizontal
};
const STRATEGY_ICONS: Record<RotationStrategy, Component> = {
  cycle: Repeat,
  random: Shuffle
};

// v-model bridge for drag-reorder: VueDraggable writes the reordered array back.
const draggableThemes = computed({
  get: () => themes.value,
  set: (next: RotationTheme[]) => rot.setThemes(next)
});

// force-fallback drags are plain mouse/touch moves, so a long-press or drag on
// the grip lets the browser keep extending a native text selection across the
// cards. Suppress selection globally from grip-press until release; the cards'
// text stays copyable the rest of the time.
function releaseNoSelect() {
  document.body.classList.remove('ccse-drag-noselect');
  window.removeEventListener('pointerup', releaseNoSelect);
  window.removeEventListener('pointercancel', releaseNoSelect);
}
function onGripPointerDown() {
  document.body.classList.add('ccse-drag-noselect');
  window.getSelection()?.removeAllRanges();
  window.addEventListener('pointerup', releaseNoSelect);
  window.addEventListener('pointercancel', releaseNoSelect);
}
onUnmounted(releaseNoSelect);

// ── theme editing panel (the slide-over editor) ─────────────────────────────
// Clicking Edit on a card doesn't navigate anywhere: the editor panel slides
// in full-width from the left, pushing the whole page out to the right, loaded
// with that theme; the panel header's back button reverses it. While the panel
// is open every editor change streams straight back into the pool theme
// (updateEditing no-ops when no session is live), so the preview on the card
// is already up to date the moment the panel closes.
watch(
  () => configStore.config,
  config => rot.updateEditing(config),
  { deep: true }
);

// The panel header keeps showing the theme name during the close animation
// (editingTheme is already null by then).
const shownName = ref('');
watch(
  () => rot.editingTheme,
  theme => {
    if (theme) shownName.value = theme.name;
  }
);

// The center "editing <name>" badge springs — scales up then wobbles back to
// rest — only once the editor has finished sliding in, so the bounce is its own
// beat instead of a scale lost inside the 500ms track slide. The badge is
// visible the whole time (it pulses from its resting size, doesn't appear); this
// flag just gates when the one-shot plays: flipped on at onTrackSettled, off
// again once the pane has slid back off-screen so the next open replays it.
const badgePop = ref(false);

// The panel's own global-settings drawer (document-level options — powerline,
// separators — are part of a theme's config too).
const showThemeGlobal = ref(false);

// Closing slides everything back, then centers + ring-flashes the card that
// was under edit, so the eye lands right where the edits went.
const returnedIndex = ref<number | null>(null);
let returnedTimer: ReturnType<typeof setTimeout> | undefined;
function closeEditor() {
  const index = rot.editingIndex;
  // Only end the session here — restoring the standalone editor's config waits
  // for the track to settle (onTrackSettled). Restoring now would swap the
  // editor pane's content mid-slide, so the surface pushing back out wouldn't
  // be the theme you just edited. (The session is already stopped by restore
  // time, so the deep watcher can't sync the restored config into the pool.)
  rot.stopEdit();
  showThemeGlobal.value = false;
  if (index === null) return;
  returnedIndex.value = index;
  clearTimeout(returnedTimer);
  returnedTimer = setTimeout(() => (returnedIndex.value = null), 2000);
  // Scroll the pool list only — NOT scrollIntoView: the card still sits in the
  // off-screen half of the track at this point, and scrollIntoView would also
  // scroll every ancestor towards it, including the overflow-hidden clip
  // wrapper (hidden boxes are still programmatically scrollable). That leaves
  // a stray horizontal scrollLeft that stacks with the track's translate and
  // blanks the whole view. Centering the card by hand on its own vertical
  // scroller (the rotation pane, see data-rot-scroller) touches nothing else.
  const card = document.querySelector<HTMLElement>(
    `[data-rot-card="${index}"]`
  );
  const scroller = card?.closest<HTMLElement>('[data-rot-scroller]');
  if (!card || !scroller) return;
  const cardRect = card.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  scroller.scrollTo({
    top:
      scroller.scrollTop +
      (cardRect.top - scrollerRect.top) -
      (scroller.clientHeight - cardRect.height) / 2,
    behavior: reduceMotion ? 'auto' : 'smooth'
  });
}
// The track's own transitionend (transform only, .self keeps children's
// transitions out). Restore after sliding back to the rotation view; a re-open
// racing in mid-close keeps the snapshot (editingTheme is set again by then).
function onTrackSettled() {
  if (rot.editingTheme) {
    // Opened: the editor pane has landed — now play the badge zoom, clear of
    // the slide it would otherwise be masked by.
    badgePop.value = true;
  } else {
    // Closed: pane is back off-screen — restore the standalone editor and re-arm
    // the badge (hidden) for the next open.
    restoreEditorConfig();
    badgePop.value = false;
  }
}

// Leaving the page ends the session too (it can't dangle while the pool gets
// reordered or pruned elsewhere) and gives the standalone editor its work back
// even when the unmount lands mid-slide, before transitionend can fire.
onUnmounted(() => {
  clearTimeout(returnedTimer);
  rot.stopEdit();
  restoreEditorConfig();
});

// Pool slots are labelled by their 1-based position — the order cycle walks in.
function slotLabel(i: number): string {
  return `#${i + 1}`;
}

// Shared add path: store rejects when the pool is at its cap (the buttons are
// disabled then, but a race with another tab/route stays handled) — toast either way.
function tryAdd(name: string, config: CcStatusConfig): boolean {
  if (!rot.addTheme(name, config)) {
    toast.error(t('rotation.poolFull', { n: MAX_POOL_THEMES }));
    return false;
  }
  toast.success(t('rotation.added', { name }));
  return true;
}

// ── add: current editor config ──────────────────────────────────────────────
function addCurrent() {
  tryAdd(rot.uniqueName(t('rotation.defaultName')), configStore.config);
}

// ── add: from a bundled template ────────────────────────────────────────────
function addTemplate(id: string, config: CcStatusConfig) {
  tryAdd(rot.uniqueName(t(`templates.items.${id}.name`)), config);
}

// ── weekly plan: per-day quick-fill ──────────────────────────────────────────
// The bottom add-box is hidden in weekly mode, so each day card carries its own
// "set this day's look" actions — from the editor, a JSON import, or a template.
// They replace the day's config in place (name + weekday stay put), never add a
// card, since the seven-day set is fixed.
function fillDayFromEditor(i: number) {
  rot.setThemeConfig(i, configStore.config);
  toast.success(t('rotation.dayFilled', { day: t(`rotation.weeklyDay${i}`) }));
}
function fillDayFromTemplate(i: number, config: CcStatusConfig) {
  rot.setThemeConfig(i, config);
  toast.success(t('rotation.dayFilled', { day: t(`rotation.weeklyDay${i}`) }));
}

// Header-button drawers, mirroring EditorPage's Global/JSON/Playground pattern:
// every operation that used to sit at the bottom of the page lives in one now.
const showImport = ref(false);
const showApply = ref(false);

// Which weekday card a JSON import targets, or null for the ordinary "add a new
// theme" flow. Set when a day card opens the import drawer; reset whenever the
// drawer closes so the next plain open (from the add-box) adds instead of fills.
const importTargetDay = ref<number | null>(null);
const importTitle = computed(() =>
  importTargetDay.value === null
    ? t('rotation.addImport')
    : t('rotation.dayImportTitle', {
        day: t(`rotation.weeklyDay${importTargetDay.value}`)
      })
);
function openImportForDay(i: number) {
  importTargetDay.value = i;
  raw.value = '';
  parsed.value = null;
  importError.value = '';
  showImport.value = true;
}
watch(showImport, open => {
  if (!open) importTargetDay.value = null;
});

// ── add: import JSON (drawer panel, same validate pattern as JsonPanel) ─────
const raw = ref('');
const importError = ref('');
const parsed = ref<CcStatusConfig | null>(null);
const fileInput = ref<InstanceType<typeof HTMLInputElement> | null>(null);

function validate(text: string) {
  parsed.value = null;
  if (text.trim() === '') {
    raw.value = text;
    importError.value = '';
    return;
  }
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    raw.value = text;
    importError.value = t('json.importInvalidJson', {
      message: (e as Error).message
    });
    return;
  }
  if (!isCcStatusConfig(obj)) {
    raw.value = text;
    importError.value = t('json.importInvalidShape');
    return;
  }
  importError.value = '';
  parsed.value = obj;
  raw.value = JSON.stringify(obj, null, 2);
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) validate(await file.text());
}

function doImport() {
  if (!parsed.value) return;
  const target = importTargetDay.value;
  if (target !== null) {
    // Weekly-plan per-day import: fill this day rather than adding a card.
    rot.setThemeConfig(target, parsed.value);
    toast.success(
      t('rotation.dayFilled', { day: t(`rotation.weeklyDay${target}`) })
    );
  } else if (!tryAdd(rot.uniqueName(t('rotation.defaultName')), parsed.value)) {
    return;
  }
  raw.value = '';
  parsed.value = null;
  // Close on add, like the palette drawer: the pool sits behind this modal
  // drawer, so collapsing it right away shows the freshly added card.
  showImport.value = false;
}

// ── import a full bundle (file only — replaces the whole pool) ───────────────
// The exported bundle's mirror image: pick a bundle file, validate it against the
// same ccsa contract, then overwrite period/strategy/themes wholesale. File-only
// on purpose — bundles run large, so there's no paste box like the single-theme
// import above.
const bundleFileInput = ref<InstanceType<typeof HTMLInputElement> | null>(null);
const pendingBundle = ref<RotationBundle | null>(null);
const confirmReplaceOpen = ref(false);

async function onBundleFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  let obj: unknown;
  try {
    obj = JSON.parse(await file.text());
  } catch (err) {
    toast.error(
      t('json.importInvalidJson', { message: (err as Error).message })
    );
    return;
  }
  if (!isRotationBundle(obj)) {
    toast.error(t('rotation.bundleInvalid'));
    return;
  }
  pendingBundle.value = obj;
  // Replacing a non-empty pool is destructive — confirm first, like the editor's
  // JSON import. An empty pool has nothing to lose, so load it straight away.
  if (themes.value.length === 0) applyBundle();
  else confirmReplaceOpen.value = true;
}

function applyBundle() {
  const bundle = pendingBundle.value;
  if (!bundle) return;
  pendingBundle.value = null;
  const { loaded, dropped } = rot.loadBundle(bundle);
  toast.success(
    dropped > 0
      ? t('rotation.bundleImportedTruncated', {
          n: loaded,
          dropped,
          max: MAX_POOL_THEMES
        })
      : t('rotation.bundleImported', { n: loaded })
  );
}

// ── built-in weekly plan (a period mode, not a pool add) ─────────────────────
// "weeklyPreset" is mutually exclusive with the ordinary periods: it owns the
// pool (seven editor-default day cards, Sun→Sat, for styling one by one), locks
// the strategy to cycle, and hides the add/remove/reorder affordances. Both
// crossings of that boundary are destructive, so both confirm first — and
// cancelling leaves `period` untouched, so the controlled Select snaps back:
//   • entering  — fills the pool with the seven day cards (confirm only when
//     there's an existing pool to overwrite; an empty pool loads straight away);
//   • leaving   — clears those day cards (always confirmed, the pool is never
//     empty here) before switching to the picked period.
// Re-picking the current period is a no-op, so re-selecting "一周固定搭配" while
// already in it never re-opens the confirm.
const confirmWeeklyOpen = ref(false);
const confirmLeaveWeeklyOpen = ref(false);
const pendingPeriod = ref<PeriodChoice | null>(null);

function onPeriodChange(value: unknown) {
  if (typeof value !== 'string') return;
  const next = value as PeriodChoice;
  if (next === period.value) return;

  if (next === 'weeklyPreset') {
    if (themes.value.length === 0) applyWeeklyPlan();
    else confirmWeeklyOpen.value = true;
    return;
  }

  // Leaving the weekly plan for an ordinary period wipes its day cards — confirm,
  // then clear. Ordinary → ordinary keeps the user's own pool untouched.
  if (isWeeklyPreset.value) {
    pendingPeriod.value = next;
    confirmLeaveWeeklyOpen.value = true;
    return;
  }

  period.value = next;
}

function applyWeeklyPlan() {
  rot.setWeeklyPreset(buildWeeklyThemes(w => t(`rotation.weeklyDay${w}`)));
  toast.success(t('rotation.weeklyLoaded'));
}

function leaveWeeklyPlan() {
  const next = pendingPeriod.value;
  pendingPeriod.value = null;
  if (!next) return;
  rot.clear();
  period.value = next;
}

// ── per-card actions ────────────────────────────────────────────────────────
// Inline rename with a local buffer while the input is focused, so the field can
// be temporarily empty mid-edit; commit on blur (empty commits are dropped by
// the store — the CLI rejects nameless themes).
const editing = ref<{ index: number; value: string } | null>(null);
function nameShown(i: number): string {
  return editing.value?.index === i
    ? editing.value.value
    : (themes.value[i]?.name ?? '');
}
function commitName(i: number) {
  if (editing.value?.index === i) {
    // Duplicates get a toast (empty commits stay silent — the field just
    // snaps back to the old name, which is self-explanatory).
    if (rot.renameTheme(i, editing.value.value) === 'duplicate') {
      toast.error(
        t('rotation.nameDuplicate', { name: editing.value.value.trim() })
      );
    }
  }
  editing.value = null;
}

// One shared popover-confirm slot per destructive action, keyed by card index —
// the TemplatesPage applyTarget pattern.
const removeTarget = ref<number | null>(null);
function confirmRemove(i: number) {
  removeTarget.value = null;
  rot.removeTheme(i);
}
// Opening needs no confirmation: the panel behaves like a brand-new editor.
// The standalone editor's work is snapshotted here on open and restored on
// close, so a rotation editing session never touches it. (Its undo history
// doesn't survive the round trip — loadConfig resets history by design.)
let savedEditorConfig: CcStatusConfig | null = null;
function restoreEditorConfig() {
  if (!savedEditorConfig) return;
  configStore.loadConfig(savedEditorConfig);
  savedEditorConfig = null;
}
function startEdit(i: number) {
  const theme = themes.value[i];
  if (!theme) return;
  // Don't re-snapshot when a session opens before the previous close finished
  // restoring (rapid close → edit): the store would still hold the old theme,
  // and snapshotting that would lose the standalone editor's work for good.
  savedEditorConfig ??= JSON.parse(
    JSON.stringify(configStore.config)
  ) as CcStatusConfig;
  // JSON round-trip, not structuredClone: theme.config is a Vue reactive proxy
  // (structuredClone throws DataCloneError on those), and loadConfig keeps the
  // reference — the editor needs its own copy (the sync back into the pool
  // deep-clones again on every update).
  configStore.loadConfig(
    JSON.parse(JSON.stringify(theme.config)) as CcStatusConfig
  );
  rot.beginEdit(i);
}
const clearOpen = ref(false);
function confirmClear() {
  clearOpen.value = false;
  rot.clear();
}

// ── export ──────────────────────────────────────────────────────────────────
const bundle = computed(() =>
  buildRotationBundle(
    periodValue.value,
    strategy.value,
    // Weekly-plan cards live in human Sun→Sat order; the CLI's daily cycle keys
    // off days-since-epoch (slot 0 = Thursday), so rotate them into that
    // epoch-aligned order on export — see toEpochOrder.
    isWeeklyPreset.value ? toEpochOrder(themes.value) : themes.value,
    // Stamp the plan marker so a re-import (here or from a live rotation.json)
    // restores weekly mode instead of a plain daily rotation.
    isWeeklyPreset.value ? 'weekly' : undefined
  )
);
const inlineCommand = computed(() => buildRotateOnCommand(bundle.value));
const inlineTooLong = computed(() => commandTooLong(inlineCommand.value));
// Pre-generate a name so the command box shows a concrete file before the first
// download; downloadBundle() re-rolls it each click so repeat downloads never
// collide and land as "ccsa-rotation (1).json".
const bundleFilename = ref(makeBundleFilename());
const fileCommand = computed(() =>
  buildRotateFileCommand(bundleFilename.value)
);

function downloadBundle() {
  const blob = new Blob([`${JSON.stringify(bundle.value, null, 2)}\n`], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = bundleFilename.value;
  a.click();
  URL.revokeObjectURL(url);
  // Copy the command for the file we just downloaded — it matches both step 2's
  // box and the file that actually landed, so the user can paste it right away.
  copy(fileCommand.value);
  toast.success(t('rotation.commandCopied'));
  // Re-roll the name AFTER downloading/copying, never before: we act on the
  // command the user just saw, and the fresh name only applies to the NEXT
  // download, keeping a repeat from colliding as "ccsa-rotation (1).json".
  bundleFilename.value = makeBundleFilename();
}

const copiedKey = ref<string | null>(null);
async function doCopy(text: string, key: string) {
  await copy(text);
  copiedKey.value = key;
  toast.success(t('rotation.commandCopied'));
  setTimeout(() => {
    if (copiedKey.value === key) copiedKey.value = null;
  }, 1500);
}

// Same wrap-and-scroll command box as PlaygroundPanel — drawers are narrow, so
// commands wrap instead of truncating.
const preCls =
  'rounded-md border border-border bg-muted/40 p-2 text-[11px] font-mono text-foreground/90 whitespace-pre-wrap break-all max-h-36 overflow-auto';
</script>

<template>
  <!-- Slide track: both views sit side by side on one 200%-wide surface —
       [ theme editor | rotation page ] — and switching only translates the
       track (rotation view = -50%, editing = 0), so the two pages push each
       other in and out as a single rigid unit. The wrapper clips whichever
       half is off screen. -->
  <div class="h-full w-full overflow-hidden">
    <div
      class="flex h-full w-[200%] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
      :class="rot.editingTheme ? '' : '-translate-x-1/2'"
      @transitionend.self="onTrackSettled"
    >
      <!-- Pane 1 — the theme editor: a slim header (back · live badge · theme
           name · global settings) over the shared editor workspace. It stays
           mounted so the close slide keeps showing exactly what was edited
           (the standalone editor's config comes back only once the track has
           settled — see onTrackSettled), and its hotkeys only bite while it's
           the visible pane. -->
      <div class="border-border h-full w-1/2 shrink-0 overflow-hidden border-r">
        <div
          class="bg-background text-foreground mx-auto flex h-full w-full max-w-[1920px] flex-col"
        >
          <header
            class="border-border bg-card relative flex h-11 shrink-0 items-center justify-between gap-2 border-b px-3"
          >
            <Button
              variant="ghost"
              size="sm"
              class="text-muted-foreground h-8 shrink-0 text-sm"
              @click="closeEditor"
            >
              <ArrowLeft class="size-3.5" />
              <span class="hidden sm:inline">
                {{ t('rotation.closeEditor') }}
              </span>
            </Button>
            <!-- Dead-centered in the header regardless of how wide the side
                 buttons are (absolute + translate); non-interactive, so it
                 must not swallow clicks around the center. Capped width keeps
                 long theme names off the side buttons. -->
            <div
              class="pointer-events-none absolute top-1/2 left-1/2 flex max-w-[55%] -translate-x-1/2 -translate-y-1/2 items-center"
            >
              <!-- Once the editor has slid in (badgePop flips at onTrackSettled)
                   the badge — already sitting at full size — springs: scales up
                   then wobbles back down to rest, the same jelly-bounce feel as
                   the logo pop. Rides on an inner wrapper, not the positioned
                   parent, so the scale doesn't clobber the centering translate. -->
              <div
                class="flex min-w-0 items-center gap-2"
                :class="badgePop ? 'ccse-live-pop' : ''"
              >
                <!-- Optical nudge up 1.5px: items-center lands the dot on the
                     line-box center, but PingFang's CJK glyphs ride high in the
                     box (empty descent space below), so a geometrically-centered
                     dot reads as sitting low against the text. -->
                <span
                  class="ccse-live-dot relative size-2 shrink-0 rounded-full bg-[#D97757]"
                />
                <span
                  class="hidden shrink-0 text-xs font-medium text-[#D97757] md:inline"
                >
                  {{ t('rotation.liveEditing') }}
                </span>
                <span
                  class="text-foreground min-w-0 truncate text-xs font-medium"
                >
                  {{ shownName }}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="text-muted-foreground h-8 shrink-0 text-sm"
              @click="showThemeGlobal = true"
            >
              <Settings2 class="size-3.5" />
              <span class="hidden lg:inline">{{ t('global.tab') }}</span>
            </Button>
          </header>
          <!-- No history in a theme session (see EditorWorkspace's history
               prop): changes live-sync to the pool, so there's no stack to
               step back through — the header carries no undo/redo either. -->
          <EditorWorkspace
            :history="false"
            :hotkeys="rot.editingTheme !== null"
          />
        </div>
      </div>

      <!-- Pane 2 — the rotation page proper. The pane itself is the scroll
           container (full viewport width, so the scrollbar hugs the screen
           edge like the templates page): the header pins via sticky and the
           footer trails the content. This also keeps it the drag auto-scroll
           target Sortable finds as the nearest scrollable ancestor, and the
           scroller closeEditor centers the edited card on (data-rot-scroller). -->
      <div
        data-rot-scroller
        class="h-full w-1/2 shrink-0 overflow-x-hidden overflow-y-auto"
      >
        <div
          class="bg-background text-foreground mx-auto flex min-h-full w-full max-w-[1920px] flex-col"
        >
          <header
            class="border-border bg-card sticky top-0 z-40 flex h-11 shrink-0 items-center justify-between gap-2 border-b px-4"
          >
            <Button
              as-child
              variant="ghost"
              size="sm"
              class="text-muted-foreground h-8 shrink-0 text-sm"
            >
              <RouterLink to="/">
                <ArrowLeft class="size-3.5" />
                <span>{{ t('nav.editor') }}</span>
              </RouterLink>
            </Button>
            <!-- Toolbar, mirroring EditorPage's header-button-per-drawer pattern.
           Adding themes lives in the always-visible card under the pool, and
           clear-pool sits in the settings bar next to what it clears — so the
           header carries only the apply drawer. -->
            <div class="flex shrink-0 items-center gap-1">
              <!-- A real hover tooltip, not a native title: it carries two lines
                   (what importing does + the live rotation.json path) and the
                   path needs monospace. ignoreNonKeyboardFocus fixes a hang: the
                   button click opens the OS file picker, and when that closes,
                   focus returns to the button by mouse — without this the tooltip
                   re-opens on that non-keyboard focus and sticks there with the
                   cursor already gone. Keyboard focus still shows it. -->
              <TooltipProvider :delay-duration="300">
                <Tooltip :ignore-non-keyboard-focus="true">
                  <TooltipTrigger as-child>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="text-muted-foreground h-8 text-sm"
                      @click="bundleFileInput?.click()"
                    >
                      <FileUp class="size-3.5" />
                      <span class="hidden sm:inline">
                        {{ t('rotation.importBundle') }}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" class="max-w-[min(24rem,80vw)]">
                    <p>{{ t('rotation.importBundleDesc') }}</p>
                    <p class="mt-1">
                      {{ t('rotation.importBundleLocalTip') }}
                      <code class="font-mono">
                        {{ '~/.config/ccsa/rotation.json' }}
                      </code>
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <input
                ref="bundleFileInput"
                type="file"
                accept=".json,application/json"
                class="hidden"
                @change="onBundleFile"
              />
              <Button
                variant="ghost"
                size="sm"
                class="text-muted-foreground h-8 text-sm"
                :disabled="!canRotate"
                :title="canRotate ? undefined : t('rotation.exportNeedTwo')"
                @click="showApply = true"
              >
                <TerminalSquare
                  class="size-3.5"
                  :class="canRotate ? 'ccse-rainbow-icon' : ''"
                />
                <span
                  class="font-semibold"
                  :class="canRotate ? 'ccse-rainbow-flow' : ''"
                >
                  {{ t('rotation.exportTitle') }}
                </span>
              </Button>
            </div>
          </header>

          <!-- pt-0: the sticky settings row below carries its own vertical
               padding instead, so its resting position equals its stuck
               position (top-11, flush under the header) — no jump on stick. -->
          <main class="flex-1 p-4 pt-0 lg:p-6 lg:pt-0">
            <!-- ── period / strategy ──
           A plain settings row (deliberately not a card, so the pool cards
           below stay the only card surfaces); period and strategy are Selects
           (like GlobalSettings), the custom interval expands inline when
           picked. Sticky right below the h-11 page header (hence top-11, plus
           an opaque background so cards scrolling past don't bleed through),
           z-index under the header's 40. Its own py-3 is the only vertical
           spacing (main is pt-0), identical at rest and stuck; no bottom
           margin, so cards slide flush under it with no see-through strip. -->
            <div
              class="bg-background sticky top-11 z-30 flex flex-wrap items-center gap-x-8 gap-y-3 px-1 py-3"
            >
              <div class="flex flex-wrap items-center gap-3">
                <label
                  class="text-muted-foreground shrink-0 text-xs"
                  for="rot-period"
                >
                  {{ t('rotation.period') }}
                </label>
                <!-- Controlled (not v-model): picking "weeklyPreset" routes
                     through onPeriodChange, which may pop a replace-confirm and
                     leave `period` unchanged on cancel — the one-way binding
                     then snaps the trigger back to the previous value. -->
                <Select
                  :model-value="period"
                  @update:model-value="onPeriodChange"
                >
                  <SelectTrigger
                    id="rot-period"
                    size="sm"
                    class="w-[150px] text-xs"
                  >
                    <span class="flex min-w-0 items-center gap-2">
                      <component :is="PERIOD_ICONS[period]" class="size-3.5" />
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="p in ORDINARY_PERIODS"
                      :key="p"
                      :value="p"
                      class="text-xs"
                    >
                      <component :is="PERIOD_ICONS[p]" class="size-3.5" />
                      {{ t(`rotation.period_${p}`) }}
                    </SelectItem>
                    <!-- Divider off the ordinary cadences: the weekly plan is a
                         separate mode (fixed 7-day set, cycle-locked), not another
                         rotation interval. -->
                    <SelectSeparator />
                    <SelectItem value="weeklyPreset" class="text-xs">
                      <component
                        :is="PERIOD_ICONS.weeklyPreset"
                        class="size-3.5"
                      />
                      {{ t('rotation.period_weeklyPreset') }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <!-- custom interval: 每 [n] [minutes|hours|days], inline -->
                <template v-if="period === 'custom'">
                  <span class="text-muted-foreground shrink-0 text-xs">
                    {{ t('rotation.customEvery') }}
                  </span>
                  <NumberField
                    :min="1"
                    :max="MAX_CUSTOM_EVERY"
                    :model-value="customEvery"
                    class="w-24"
                    :aria-label="t('rotation.customEvery')"
                    @update:model-value="customEvery = $event ?? 1"
                  >
                    <NumberFieldContent>
                      <NumberFieldDecrement class="p-1.5" />
                      <NumberFieldInput
                        class="h-7 text-xs"
                        @beforeinput="
                          guardNumberInput($event, MAX_CUSTOM_EVERY)
                        "
                        @input="scrubNumberInput($event, MAX_CUSTOM_EVERY)"
                      />
                      <NumberFieldIncrement class="p-1.5" />
                    </NumberFieldContent>
                  </NumberField>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    :model-value="customUnit"
                    @update:model-value="
                      typeof $event === 'string' &&
                      $event !== '' &&
                      (customUnit = $event as CustomPeriodUnit)
                    "
                  >
                    <ToggleGroupItem
                      v-for="u in CUSTOM_UNITS"
                      :key="u"
                      :value="u"
                      class="h-7 px-2.5 text-xs"
                    >
                      {{ t(`rotation.unit_${u}`) }}
                    </ToggleGroupItem>
                  </ToggleGroup>
                </template>
              </div>
              <!-- Strategy is meaningless under the weekly plan (its mode
                   force-sets cycle so each theme stays pinned to its weekday), so
                   the whole block is hidden rather than shown disabled. -->
              <div v-if="!isWeeklyPreset" class="flex items-center gap-3">
                <label
                  class="text-muted-foreground shrink-0 text-xs"
                  for="rot-strategy"
                >
                  {{ t('rotation.strategy') }}
                </label>
                <Select v-model="strategy">
                  <SelectTrigger
                    id="rot-strategy"
                    size="sm"
                    class="w-[130px] text-xs"
                  >
                    <span class="flex min-w-0 items-center gap-2">
                      <component
                        :is="STRATEGY_ICONS[strategy]"
                        class="size-3.5"
                      />
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="s in STRATEGIES"
                      :key="s"
                      :value="s"
                      class="text-xs"
                    >
                      <component :is="STRATEGY_ICONS[s]" class="size-3.5" />
                      {{ t(`rotation.strategy_${s}`) }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <!-- clear-pool lives here, right-aligned — next to the pool it
                   clears. Hidden under the weekly plan: its seven day cards are a
                   fixed set, so there's nothing to clear (switch the period away
                   to go back to a free pool). -->
              <Popover
                v-if="!isWeeklyPreset"
                :open="clearOpen"
                @update:open="clearOpen = $event && themes.length > 0"
              >
                <PopoverTrigger as-child>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-muted-foreground hover:text-destructive ml-auto h-8 w-8 shrink-0 px-0"
                    :title="t('rotation.clearPool')"
                    :disabled="themes.length === 0"
                  >
                    <Trash2 class="size-3.5" />
                    <span class="sr-only">{{ t('rotation.clearPool') }}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" class="w-64 p-3">
                  <p class="text-foreground text-xs">
                    {{ t('rotation.clearConfirmTitle') }}
                  </p>
                  <p class="text-muted-foreground mt-1 text-xs">
                    {{ t('rotation.clearConfirmDesc', { n: themes.length }) }}
                  </p>
                  <div class="mt-3 flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      class="h-7 text-xs"
                      @click="clearOpen = false"
                    >
                      {{ t('app.cancel') }}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      class="h-7 text-xs"
                      @click="confirmClear"
                    >
                      {{ t('rotation.clearPool') }}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <!-- ── theme pool ── -->
            <!-- Single column on purpose: vertical order IS the rotation order, so
           drag-sorting reads naturally top-to-bottom (a 2-col grid would zigzag).
           force-fallback is what makes drag auto-scroll actually work (same as
           LineEditor's widget zones): Sortable's AutoScroll is unreliable under
           native HTML5 drag events, so use its mouse-event fallback, plus a
           generous edge zone since these cards are tall. -->
            <!-- fallback-on-body: the fallback ghost is position:fixed, and
                 the slide track's permanent translate would hijack its
                 containing block (fixed inside a transformed ancestor anchors
                 to that ancestor), teleporting the ghost a viewport-width to
                 the left. On <body> it escapes the transform and tracks the
                 pointer correctly. -->
            <!-- Reordering is disabled under the weekly plan: each card's
                 position is its weekday (grip hidden below too), so a drag would
                 silently break the day alignment. -->
            <VueDraggable
              v-model="draggableThemes"
              handle=".rot-drag"
              :disabled="isWeeklyPreset"
              :animation="150"
              :force-fallback="true"
              :fallback-on-body="true"
              :scroll="true"
              :scroll-sensitivity="120"
              :scroll-speed="12"
              :bubble-scroll="true"
              class="flex flex-col gap-5 pt-1"
            >
              <div
                v-for="(theme, i) in themes"
                :key="i"
                :data-rot-card="i"
                class="border-border bg-card relative flex flex-col gap-3 rounded-lg border p-4 transition-shadow duration-700"
                :class="
                  returnedIndex === i
                    ? 'ring-2 ring-[#D97757]/60 duration-0'
                    : ''
                "
              >
                <div class="flex flex-wrap items-center gap-2">
                  <!-- Same drag handle as the editor's line grip: a ghost icon
                       button with hover feedback (bg + brighten) instead of a bare
                       icon. Keeps the rot-drag class (VueDraggable's handle) and
                       onGripPointerDown (kills native text-selection mid-drag);
                       touchstart.prevent mirrors the editor's iOS long-press guard.
                       size-7 lines up with the h-7 badge / name field beside it. -->
                  <Button
                    v-if="!isWeeklyPreset"
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="rot-drag text-muted-foreground/40 hover:text-muted-foreground size-7 shrink-0 cursor-grab rounded-md select-none active:cursor-grabbing"
                    @pointerdown="onGripPointerDown"
                    @touchstart.prevent
                  >
                    <GripVertical class="size-3.5" />
                  </Button>
                  <!-- Under the weekly plan the badge is the weekday itself (pool
                       is Sunday-first, so card i = weekday i) and stands in for
                       the name field, which is hidden below — the day is fixed, so
                       there's nothing to rename. -->
                  <span
                    class="text-muted-foreground bg-muted inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded px-1.5 font-mono text-[10px]"
                  >
                    {{
                      isWeeklyPreset
                        ? t(`rotation.weeklyDay${i}`)
                        : slotLabel(i)
                    }}
                  </span>
                  <!-- Name is only editable for a free pool; the weekly plan's
                       cards are named after their weekday (the badge above), so
                       the input would just be noise. -->
                  <InputGroup
                    v-if="!isWeeklyPreset"
                    class="h-7 max-w-[220px] flex-1"
                  >
                    <InputGroupInput
                      :model-value="nameShown(i)"
                      :maxlength="MAX_THEME_NAME"
                      class="text-xs md:text-xs"
                      :aria-label="t('rotation.nameLabel')"
                      @focus="editing = { index: i, value: theme.name }"
                      @update:model-value="
                        editing = { index: i, value: String($event) }
                      "
                      @blur="commitName(i)"
                      @keydown.enter="
                        ($event.target as HTMLInputElement).blur()
                      "
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText class="text-[10px] tabular-nums">
                        {{ nameShown(i).length }}/{{ MAX_THEME_NAME }}
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  <!-- w-full below sm: forces this group onto its own line
                       (flex-wrap on the row above), so the buttons get a full,
                       uncrowded row instead of squeezing next to the name
                       input on narrow phones. justify-end keeps them
                       right-aligned there, matching the ml-auto/sm:w-auto
                       inline placement at sm and up. -->
                  <!-- flex-wrap: the weekly plan adds three quick-fill buttons
                       after Edit, so the group can spill onto a second line on
                       narrower cards instead of overflowing. -->
                  <div
                    class="ml-auto flex w-full shrink-0 flex-wrap items-center justify-end gap-1.5 sm:w-auto"
                  >
                    <!-- No confirm needed: the panel is its own editor — the
                     standalone editor's config is snapshotted and restored
                     around the session (see startEdit). -->
                    <Button
                      variant="outline"
                      size="xs"
                      class="text-muted-foreground"
                      :title="t('rotation.editInEditor')"
                      @click="startEdit(i)"
                    >
                      <Pencil class="size-3.5" />
                      {{ t('rotation.editBtn') }}
                    </Button>
                    <!-- Weekly plan: quick-fill THIS day's config (the bottom
                         add-box is hidden in this mode). A divider sets these
                         apart from Edit. -->
                    <template v-if="isWeeklyPreset">
                      <!-- Same divider as the editor header (bg-border mx-1 h-4
                           w-px) — matching look and left/right spacing. -->
                      <div
                        class="bg-border mx-1 h-4 w-px shrink-0"
                        aria-hidden="true"
                      />
                      <Button
                        variant="outline"
                        size="xs"
                        class="text-muted-foreground"
                        :title="t('rotation.addCurrentHint')"
                        @click="fillDayFromEditor(i)"
                      >
                        <Save class="size-3.5" />
                        {{ t('rotation.addCurrent') }}
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        class="text-muted-foreground"
                        @click="openImportForDay(i)"
                      >
                        <FileUp class="size-3.5" />
                        {{ t('rotation.addImport') }}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                          <Button
                            variant="outline"
                            size="xs"
                            class="text-muted-foreground"
                          >
                            <LayoutTemplate class="size-3.5" />
                            {{ t('rotation.addTemplate') }}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" class="min-w-[200px]">
                          <DropdownMenuItem
                            v-for="tpl in TEMPLATES"
                            :key="tpl.id"
                            @click="fillDayFromTemplate(i, tpl.config)"
                          >
                            {{ t(`templates.items.${tpl.id}.name`) }}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </template>
                    <!-- No per-card remove under the weekly plan: the seven day
                         cards are a fixed set. -->
                    <Popover
                      v-if="!isWeeklyPreset"
                      :open="removeTarget === i"
                      @update:open="removeTarget = $event ? i : null"
                    >
                      <PopoverTrigger as-child>
                        <Button
                          variant="outline"
                          size="xs"
                          class="text-muted-foreground hover:text-destructive"
                          :title="t('rotation.remove')"
                        >
                          <Trash2 class="size-3.5" />
                          {{ t('rotation.remove') }}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" class="w-56 p-3">
                        <p class="text-foreground text-xs">
                          {{
                            t('rotation.removeConfirm', { name: theme.name })
                          }}
                        </p>
                        <div class="mt-3 flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            class="h-7 text-xs"
                            @click="removeTarget = null"
                          >
                            {{ t('app.cancel') }}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            class="h-7 text-xs"
                            @click="confirmRemove(i)"
                          >
                            {{ t('rotation.remove') }}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <TerminalPreview :config="theme.config" />
              </div>
            </VueDraggable>

            <!-- The one, always-visible place to grow the pool (empty state included) —
           consistent whether the pool holds 0 or 20 themes. Border/background
           mirror LineEditor's dashed "add line" button (outline variant
           tokens), so both "add" affordances read the same. Top margin only
           when cards precede it: on an empty pool the (empty) list's pt-1
           already supplies the same top offset the first card gets.
           Hidden under the weekly plan: the pool is a fixed seven-day set, so
           there's nothing to add — switch the period away for a free pool. -->
            <div
              v-if="!isWeeklyPreset"
              class="text-muted-foreground bg-background dark:bg-input/30 dark:border-input flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-4 text-center shadow-xs"
              :class="themes.length === 0 ? '' : 'mt-5'"
            >
              <p v-if="themes.length === 0" class="text-foreground text-sm">
                {{ t('rotation.emptyPool') }}
              </p>
              <p
                v-else-if="themes.length === 1"
                class="text-foreground text-sm"
              >
                {{ t('rotation.needOneMore') }}
              </p>
              <div class="flex flex-wrap items-center justify-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  class="text-muted-foreground"
                  :title="t('rotation.addCurrentHint')"
                  :disabled="isFull"
                  @click="addCurrent"
                >
                  <Save class="size-3.5" />
                  {{ t('rotation.addCurrent') }}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  class="text-muted-foreground"
                  :disabled="isFull"
                  @click="showImport = true"
                >
                  <FileUp class="size-3.5" />
                  {{ t('rotation.addImport') }}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button
                      variant="outline"
                      size="xs"
                      class="text-muted-foreground"
                      :disabled="isFull"
                    >
                      <LayoutTemplate class="size-3.5" />
                      {{ t('rotation.addTemplate') }}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" class="min-w-[200px]">
                    <DropdownMenuItem
                      v-for="tpl in TEMPLATES"
                      :key="tpl.id"
                      @click="addTemplate(tpl.id, tpl.config)"
                    >
                      {{ t(`templates.items.${tpl.id}.name`) }}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p v-if="isFull" class="text-xs">
                {{ t('rotation.poolFull', { n: MAX_POOL_THEMES }) }}
              </p>
            </div>
          </main>

          <!-- Header-button drawers, like EditorPage's Global/JSON/Playground.
               Title notes the target weekday when a day card opened it. -->
          <Drawer v-model:open="showImport" :title="importTitle">
            <div class="flex min-h-0 flex-1 flex-col gap-2">
              <div class="flex items-center justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  class="h-7 text-xs"
                  @click="fileInput?.click()"
                >
                  <FileUp class="size-3" />
                  {{ t('json.importFile') }}
                </Button>
                <input
                  ref="fileInput"
                  type="file"
                  accept=".json,application/json"
                  class="hidden"
                  @change="onFile"
                />
                <Button
                  size="sm"
                  class="h-7 text-xs"
                  :disabled="!parsed"
                  @click="doImport"
                >
                  <Plus class="size-3" />
                  {{
                    importTargetDay === null
                      ? t('rotation.importAdd')
                      : t('rotation.dayFillBtn')
                  }}
                </Button>
              </div>
              <Textarea
                :model-value="raw"
                spellcheck="false"
                :placeholder="t('json.importPlaceholder')"
                class="min-h-0 flex-1 resize-none font-mono text-[10px] leading-relaxed md:text-[10px]"
                @update:model-value="validate(String($event))"
              />
              <p
                v-if="importError"
                class="text-destructive text-[11px] leading-relaxed"
              >
                {{ importError }}
              </p>
            </div>
          </Drawer>

          <Drawer v-model:open="showApply" :title="t('rotation.exportTitle')">
            <div class="-m-4 flex min-h-0 flex-1 flex-col">
              <ScrollArea class="min-h-0 flex-1">
                <div class="space-y-4 px-4 py-4">
                  <Stepper orientation="vertical" class="w-full">
                    <!-- Step 1 — download the bundle -->
                    <StepperItem
                      :step="1"
                      class="relative w-full items-start pb-5"
                    >
                      <div
                        class="bg-border absolute top-7 bottom-0 left-3 w-px -translate-x-1/2"
                      />
                      <StepperIndicator>1</StepperIndicator>
                      <div class="ml-3 min-w-0 flex-1 space-y-2">
                        <StepperTitle>
                          {{ t('rotation.exportStep1') }}
                        </StepperTitle>
                        <div>
                          <Button
                            variant="outline"
                            size="xs"
                            class="text-muted-foreground"
                            @click="downloadBundle"
                          >
                            <Download class="size-3.5" />
                            {{
                              t('rotation.download', { file: bundleFilename })
                            }}
                          </Button>
                        </div>
                      </div>
                    </StepperItem>

                    <!-- Step 2 — run the command -->
                    <StepperItem :step="2" class="relative w-full items-start">
                      <StepperIndicator>2</StepperIndicator>
                      <div class="ml-3 min-w-0 flex-1 space-y-2">
                        <StepperTitle>
                          {{ t('rotation.exportStep2') }}
                        </StepperTitle>
                        <StepperDescription>
                          {{ t('rotation.exportStep2Desc') }}
                        </StepperDescription>
                        <!-- Read-only display: the download button already
                             copied this command, so there's no per-box copy
                             action and no text selection (select-none). -->
                        <pre :class="[preCls, 'cursor-default select-none']">{{
                          fileCommand
                        }}</pre>
                      </div>
                    </StepperItem>
                  </Stepper>

                  <!-- alt: single-line command, only when it fits. pl-11 lines
                       it up with step 2's content: size-6 indicator (24px) + the
                       StepperItem's gap-2 (8px) + the content's ml-3 (12px) =
                       44px = pl-11. -->
                  <div v-if="!inlineTooLong" class="space-y-2 pl-11">
                    <p class="text-muted-foreground text-xs">
                      {{ t('rotation.inlineAlt') }}
                    </p>
                    <div class="relative">
                      <pre :class="[preCls, 'pr-8']">{{ inlineCommand }}</pre>
                      <Button
                        size="icon"
                        variant="ghost"
                        class="text-muted-foreground hover:text-foreground absolute top-1.5 right-1.5 size-6"
                        :title="t('rotation.copyCommand')"
                        @click="doCopy(inlineCommand, 'inline')"
                      >
                        <Check v-if="copiedKey === 'inline'" class="size-3.5" />
                        <Copy v-else class="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <!-- undo — flush-left (no stepper indent) on purpose. -->
                  <div class="space-y-2">
                    <p class="text-muted-foreground text-xs">
                      {{ t('rotation.offNote') }}
                    </p>
                    <div class="relative">
                      <pre :class="[preCls, 'pr-8']">{{
                        ROTATE_OFF_COMMAND
                      }}</pre>
                      <Button
                        size="icon"
                        variant="ghost"
                        class="text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 size-6 -translate-y-1/2"
                        :title="t('rotation.copyCommand')"
                        @click="doCopy(ROTATE_OFF_COMMAND, 'off')"
                      >
                        <Check v-if="copiedKey === 'off'" class="size-3.5" />
                        <Copy v-else class="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </Drawer>

          <footer
            class="text-muted-foreground/60 shrink-0 px-4 py-1 text-center text-[11px]"
          >
            {{ t('global.copyright') }}
          </footer>
        </div>
      </div>
    </div>
  </div>

  <!-- The editor pane's global-settings drawer — document-level options
       (powerline, separators…) are part of a theme's config too. Teleported,
       so it lives outside the sliding track. -->
  <Drawer
    v-model:open="showThemeGlobal"
    :title="t('global.title')"
    :masked="false"
  >
    <GlobalSettings />
  </Drawer>

  <ConfirmDialog
    v-model:open="confirmReplaceOpen"
    :title="t('rotation.bundleReplaceTitle')"
    :description="t('rotation.bundleReplaceDesc')"
    :confirm-text="t('rotation.importBundle')"
    :cancel-text="t('app.cancel')"
    variant="destructive"
    @confirm="applyBundle"
  />

  <ConfirmDialog
    v-model:open="confirmWeeklyOpen"
    :title="t('rotation.weeklyReplaceTitle')"
    :description="t('rotation.weeklyReplaceDesc')"
    :confirm-text="t('rotation.period_weeklyPreset')"
    :cancel-text="t('app.cancel')"
    variant="destructive"
    @confirm="applyWeeklyPlan"
  />

  <ConfirmDialog
    v-model:open="confirmLeaveWeeklyOpen"
    :title="t('rotation.weeklyLeaveTitle')"
    :description="t('rotation.weeklyLeaveDesc')"
    :confirm-text="t('rotation.weeklyLeaveConfirm')"
    :cancel-text="t('app.cancel')"
    variant="destructive"
    @confirm="leaveWeeklyPlan"
  />
</template>
