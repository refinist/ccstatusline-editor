<script setup lang="ts">
import {
  Braces,
  CircleHelp,
  Ellipsis,
  LayoutTemplate,
  Menu,
  Redo2,
  Repeat,
  RotateCcw,
  Settings2,
  TerminalSquare,
  Trash2,
  Undo2
} from '@lucide/vue';
import { useMediaQuery } from '@vueuse/core';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import Drawer from '@/components/Drawer.vue';
import EditorWorkspace from '@/components/EditorWorkspace.vue';
import GithubButton from '@/components/GithubButton.vue';
import GlobalSettings from '@/components/GlobalSettings.vue';
import JsonPanel from '@/components/JsonPanel.vue';
import LocaleSwitcher from '@/components/LocaleSwitcher.vue';
import PlaygroundPanel from '@/components/PlaygroundPanel.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { appVersion } from '@/lib/appVersion';
import { resolveSharedConfig } from '@/lib/shareConfig';
import { useConfigStore } from '@/stores/config';
import { usePendingTemplateStore } from '@/stores/pendingTemplate';

const store = useConfigStore();
const pendingTemplate = usePendingTemplateStore();
const { t } = useI18n();
const router = useRouter();

// The right panel is the per-widget Inspector only. Document-level settings, the
// JSON export and the live-test panel each live behind a header button that opens
// its own right-side drawer (so they never compete with the Inspector for space).
const showGlobal = ref(false);
const showJson = ref(false);
const showPlayground = ref(false);

// Confirmation for the global-settings drawer's title-bar "restore defaults"
// icon — a small popover instead of a full-screen dialog, since it's a single,
// low-stakes (undoable) reset.
const showRestoreConfirm = ref(false);
function confirmRestoreDefaults() {
  store.resetGlobalSettings();
  showRestoreConfirm.value = false;
}

// Both the brand-side nav dropdown and the "more" dropdown have sm:hidden
// triggers, so past sm an open menu would float over the full toolbar with no
// way to reopen (or sensibly interact with) it — its content lives in a portal
// that outlives the trigger being hidden. Close them when the viewport grows
// past the breakpoint. (The palette/inspector drawers get the same treatment
// inside EditorWorkspace.)
const showNavMenu = ref(false);
const showMoreMenu = ref(false);
const smUp = useMediaQuery('(min-width: 640px)');
watch(smUp, up => {
  if (up) {
    showNavMenu.value = false;
    showMoreMenu.value = false;
  }
});

// Version number next to the title (mirrors ccstatusline's title "| v…"
// structure); links to the upstream repo the version is tracking.
const CCSTATUSLINE_REPO_URL = 'https://github.com/sirmalloc/ccstatusline';

// ── Title easter egg ─────────────────────────────────────────────────────────
// Hovering the brand name makes its letters do one happy pogo: each character
// jumps with its own random delay / height / tilt while keeping the exact
// gradient color it's showing — each char gets its own copy of the gradient,
// pixel-aligned to where the (paused, see .ccse-title-bouncing) flow sits, so
// the color band rides along through the hop. Guarded so a bounce always
// finishes before the next hover re-arms.
// 0.6s pogo + up to 0.18s of per-char delay, rounded up a touch.
const TITLE_POGO_MS = 850;
const titleChars = computed(() => [...t('app.title')]);
const titleEl = ref<HTMLElement | null>(null);
const titleBouncing = ref(false);
const titleSeeds = ref<Record<string, string>[]>([]);
let titleTimer: ReturnType<typeof setTimeout> | undefined;
// The logo's follow-up act: right as the letters land, the brand icon does a
// jelly squash-and-stretch (see .ccse-logo-pop). Timer runs a touch past the
// 0.95s animation so the class comes off after it finishes.
const LOGO_POP_MS = 1000;
const logoPopping = ref(false);
let logoTimer: ReturnType<typeof setTimeout> | undefined;
function bounceTitle() {
  if (titleBouncing.value) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Sample where the flowing gradient sits right now (it freezes there for the
  // whole bounce): background-size is 200% of the span, and the 0% → -200%
  // background-position sweep works out to the image sliding right by one full
  // bgWidth per cycle. Each char then anchors its own gradient copy so that
  // char-local px 0 lines up with the parent image at its offsetLeft.
  const el = titleEl.value;
  let bgWidth = 0;
  let flowOffset = 0;
  let charLefts: number[] = [];
  if (el) {
    const rect = el.getBoundingClientRect();
    bgWidth = rect.width * 2;
    const flow = el
      .getAnimations()
      .find(
        (a): a is CSSAnimation =>
          a instanceof CSSAnimation && a.animationName === 'ccse-gradient-flow'
      );
    const duration = Number(flow?.effect?.getComputedTiming().duration);
    const elapsed = Number(flow?.currentTime ?? 0);
    if (duration > 0) flowOffset = ((elapsed % duration) / duration) * bgWidth;
    charLefts = Array.from(
      el.children,
      c => c.getBoundingClientRect().left - rect.left
    );
  }
  titleSeeds.value = titleChars.value.map((_, i) => ({
    '--jd': `${(Math.random() * 0.18).toFixed(3)}s`,
    '--jh': `-${(0.35 + Math.random() * 0.35).toFixed(3)}em`,
    '--jr': `${(Math.random() * 28 - 14).toFixed(1)}deg`,
    '--js': (1.05 + Math.random() * 0.4).toFixed(3),
    '--jbs': `${bgWidth.toFixed(1)}px`,
    '--jbp': `${(flowOffset - (charLefts[i] ?? 0)).toFixed(1)}px`
  }));
  titleBouncing.value = true;
  clearTimeout(titleTimer);
  titleTimer = setTimeout(() => {
    titleBouncing.value = false;
    logoPopping.value = true;
    clearTimeout(logoTimer);
    logoTimer = setTimeout(() => (logoPopping.value = false), LOGO_POP_MS);
  }, TITLE_POGO_MS);
}
// Greeting hop: one automatic pogo per page load, shortly after mount so the
// first paint settles before the letters move. After it lands, the title sits
// still until hovered (bounceTitle's own guard already dedupes overlaps).
onMounted(() => {
  setTimeout(bounceTitle, 450);
});

const showClearConfirm = ref(false);

// Disable "clear" when there are no widgets.
const hasWidgets = computed(() => store.config.lines.some(l => l.length > 0));

function onReset() {
  showClearConfirm.value = true;
}

function confirmClear() {
  store.reset();
}

// Two paths for loading a config, checked in order once on entering the editor:
//   1. Template page "use this template" — the config is relayed once through
//      pendingTemplate (take() clears it too, so a later remount can't reapply it).
//   2. Share link `?tpl=<templateId>` / `?s=<shortId>` — the latter must be
//      resolved via /api/share's Function+KV, with no `?json=` fallback;
//      undefined = the param wasn't present (do nothing), null = it was present
//      but failed to resolve (show an error). Either kind of share link, once
//      handled (success or failure), has its query params cleared, so refreshing
//      or copying the address bar doesn't make the user think it's still a
//      "share link" — it's already local, editable state by then.
onMounted(async () => {
  const fromTemplate = pendingTemplate.take();
  if (fromTemplate) {
    store.loadConfig(fromTemplate);
    toast.success(t('templates.imported'));
    return;
  }
  const shared = await resolveSharedConfig();
  if (shared === undefined) return;
  router.replace({ path: '/' });
  if (shared === null) {
    toast.error(t('templates.importFailed'));
    return;
  }
  store.loadConfig(shared);
  toast.success(t('templates.imported'));
});
</script>

<template>
  <!-- Root shell: capped at 1920px and centered, so ultra-wide screens get side
       gutters (painted by <body>'s matching bg-background) instead of stretched UI. -->
  <div
    class="bg-background text-foreground mx-auto flex h-full w-full max-w-[1920px] flex-col"
  >
    <header
      class="border-border bg-card flex h-11 shrink-0 items-center justify-between gap-2 border-b px-2.5 sm:px-4"
    >
      <div class="flex min-w-0 items-center">
        <img
          src="/logo.png"
          alt=""
          class="mr-2 hidden size-5 shrink-0 sm:block"
          :class="logoPopping ? 'ccse-logo-pop' : ''"
        />
        <h1 class="flex min-w-0 items-center text-base tracking-wide">
          <!-- Per-char spans exist for the hover pogo (see bounceTitle); the
               chars are joined tight (no whitespace between spans) so the
               title reads identically when idle. -->
          <span
            ref="titleEl"
            class="ccse-gradient-flow truncate font-semibold"
            :class="titleBouncing ? 'ccse-title-bouncing' : ''"
            @mouseenter="bounceTitle"
          >
            <span
              v-for="(ch, i) in titleChars"
              :key="`${i}-${ch}`"
              class="ccse-title-ch"
              :class="titleBouncing ? 'ccse-title-ch--pogo' : ''"
              :style="titleBouncing ? titleSeeds[i] : undefined"
            >
              {{ ch }}
            </span>
          </span>
          <span
            class="text-muted-foreground hidden text-sm font-medium lg:inline"
          >
            <!-- Same divider as the header toolbar (bg-border h-4 w-px) instead
                 of a literal "|" glyph — matches its height and color. inline-block
                 + align-middle since this sits in an inline text run, not a flex row. -->
            <span
              class="bg-border mx-2.5 inline-block h-4 w-px align-middle"
              aria-hidden="true"
            />
            <!-- Deliberately unstyled link (inherits the muted text look):
                 only the pointer cursor hints it jumps to upstream ccstatusline. -->
            <a
              :href="CCSTATUSLINE_REPO_URL"
              target="_blank"
              rel="noopener noreferrer"
            >
              v{{ appVersion }}
            </a>
          </span>
        </h1>
        <!-- Page-level nav hugs the brand area, separate from the toolbar
             buttons on the right; a muted · splits the two sibling links -->
        <RouterLink
          to="/templates"
          class="ml-2.5 hidden shrink-0 items-center gap-1.5 text-sm font-medium text-[#D97757] transition-opacity hover:opacity-80 sm:flex lg:ml-5"
        >
          <LayoutTemplate class="size-3.5" />
          <span class="hidden lg:inline">{{ t('nav.templates') }}</span>
        </RouterLink>
        <span
          class="text-muted-foreground/50 mx-2.5 hidden text-sm select-none sm:inline"
        >
          ·
        </span>
        <RouterLink
          to="/rotation"
          class="relative hidden shrink-0 items-center gap-1.5 text-sm font-medium text-[#D97757] transition-opacity hover:opacity-80 sm:flex"
        >
          <Repeat class="size-3.5" />
          <span class="hidden lg:inline">{{ t('nav.rotation') }}</span>
          <!-- Superscript "New" tag riding the link's top-right corner. Custom
               animated badge (.ccse-new-badge): flowing gradient + breathing
               halo + a periodic sheen sweep, so it actually catches the eye. -->
          <!-- <span
            class="ccse-new-badge absolute -top-2 right-3 hidden h-3.5 items-center rounded px-1 text-[8px] leading-none font-bold tracking-wider text-white uppercase lg:inline-flex"
          >
            {{ t('nav.new') }}
          </span> -->
        </RouterLink>
        <!-- <sm: the two nav links collapse into a single dropdown so the
             brand row stays uncluttered on phones -->
        <DropdownMenu v-model:open="showNavMenu">
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="sm"
              class="ml-1 h-8 w-7 px-0 text-[#D97757] hover:text-[#D97757] sm:hidden"
              :title="t('nav.menu')"
            >
              <Menu class="size-4" />
              <span class="sr-only">{{ t('nav.menu') }}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="min-w-[160px]">
            <DropdownMenuItem @click="router.push('/templates')">
              <LayoutTemplate class="size-3.5" />
              {{ t('nav.templates') }}
            </DropdownMenuItem>
            <DropdownMenuItem @click="router.push('/rotation')">
              <Repeat class="size-3.5" />
              {{ t('nav.rotation') }}
              <!-- <span
                class="ccse-new-badge ml-auto inline-flex h-4 items-center rounded px-1.5 text-[9px] leading-none font-bold tracking-wider text-white uppercase"
              >
                {{ t('nav.new') }}
              </span> -->
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <!-- Mobile squeezes every fixed-width element (w-7/gap-0.5) so the
           truncating title keeps as much room as possible; ≥sm restores the
           roomier spacing. -->
      <div class="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <!-- High-frequency edit actions: icon-only (self-explanatory) + title tooltip -->
        <Button
          variant="ghost"
          size="sm"
          class="text-muted-foreground h-8 w-7 px-0 sm:w-8"
          :title="t('app.undo')"
          :disabled="!store.canUndo"
          @click="store.undo()"
        >
          <Undo2 class="size-3.5" />
          <span class="sr-only">{{ t('app.undo') }}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          class="text-muted-foreground h-8 w-7 px-0 sm:w-8"
          :title="t('app.redo')"
          :disabled="!store.canRedo"
          @click="store.redo()"
        >
          <Redo2 class="size-3.5" />
          <span class="sr-only">{{ t('app.redo') }}</span>
        </Button>
        <!-- Below sm, Clear moves into the "more" menu and GitHub takes its
             header slot (leaving the menu's footer row in exchange). -->
        <Button
          variant="ghost"
          size="sm"
          class="text-muted-foreground hover:text-destructive hidden h-8 w-8 px-0 sm:inline-flex"
          :title="t('app.clear')"
          :disabled="!hasWidgets"
          @click="onReset"
        >
          <Trash2 class="size-3.5" />
          <span class="sr-only">{{ t('app.clear') }}</span>
        </Button>
        <GithubButton class="sm:hidden" />
        <div class="bg-border mx-0.5 h-4 w-px sm:mx-1" />

        <!-- ≥sm: full toolbar. Below sm, these secondary actions would crowd
             out the title, so they collapse into the "more" menu below, shown
             only on narrow screens. -->
        <div class="hidden items-center gap-1 sm:flex">
          <Button
            variant="ghost"
            size="sm"
            class="text-muted-foreground h-8 text-sm"
            @click="showGlobal = true"
          >
            <Settings2 class="size-3.5" />
            <span class="hidden lg:inline">{{ t('global.tab') }}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="text-muted-foreground h-8 text-sm"
            @click="showJson = true"
          >
            <Braces class="size-3.5" />
            <span class="hidden lg:inline">{{ t('json.tab') }}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="text-muted-foreground h-8 text-sm"
            :disabled="!hasWidgets"
            @click="showPlayground = true"
          >
            <TerminalSquare
              class="size-3.5"
              :class="hasWidgets ? 'ccse-rainbow-icon' : ''"
            />
            <span
              class="hidden font-semibold lg:inline"
              :class="hasWidgets ? 'ccse-rainbow-flow' : ''"
            >
              {{ t('playground.tab') }}
            </span>
          </Button>
          <div class="bg-border mx-1 h-4 w-px" />
          <!-- Help is a meta entry, so it lives with GitHub/theme/locale
               instead of the content nav next to the brand (same slot it
               already occupies in the <sm "more" menu's footer row). -->
          <Button
            variant="ghost"
            size="sm"
            class="text-muted-foreground h-8 w-8 px-0"
            :title="t('nav.help')"
            @click="router.push('/help')"
          >
            <CircleHelp class="size-3.5" />
            <span class="sr-only">{{ t('nav.help') }}</span>
          </Button>
          <GithubButton />
          <ThemeToggle />
          <LocaleSwitcher />
        </div>

        <DropdownMenu v-model:open="showMoreMenu">
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="sm"
              class="text-muted-foreground h-8 w-7 px-0 sm:hidden"
              :title="t('app.more')"
            >
              <Ellipsis class="size-3.5" />
              <span class="sr-only">{{ t('app.more') }}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="min-w-[180px]">
            <DropdownMenuItem :disabled="!hasWidgets" @click="onReset">
              <Trash2 class="size-3.5" />
              {{ t('app.clear') }}
            </DropdownMenuItem>
            <DropdownMenuItem @click="showGlobal = true">
              <Settings2 class="size-3.5" />
              {{ t('global.tab') }}
            </DropdownMenuItem>
            <DropdownMenuItem @click="showJson = true">
              <Braces class="size-3.5" />
              {{ t('json.tab') }}
            </DropdownMenuItem>
            <DropdownMenuItem
              :disabled="!hasWidgets"
              @click="showPlayground = true"
            >
              <TerminalSquare
                class="size-3.5"
                :class="hasWidgets ? 'ccse-rainbow-icon' : ''"
              />
              <span
                class="font-semibold"
                :class="hasWidgets ? 'ccse-rainbow-flow' : ''"
              >
                {{ t('playground.tab') }}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div class="flex items-center gap-1 px-1 py-1">
              <Button
                variant="ghost"
                size="icon-sm"
                class="text-muted-foreground shadow-none"
                :title="t('nav.help')"
                @click="router.push('/help')"
              >
                <CircleHelp class="size-4" />
                <span class="sr-only">{{ t('nav.help') }}</span>
              </Button>
              <ThemeToggle />
              <LocaleSwitcher />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

    <!-- The actual editor (palette / line editor / inspector + their
         narrow-screen drawers) lives in EditorWorkspace, shared with the
         rotation page's slide-over editing panel. -->
    <EditorWorkspace>
      <template #footer>
        <!-- Copyright only spans the middle column (not the full page), so the
             side panels can reach all the way to the bottom of the screen.
             mt-auto pins it to the bottom on mobile, where LineEditor doesn't
             stretch (its flex-1 only kicks in at sm) and would otherwise leave
             the copyright floating mid-screen right after the content. -->
        <div
          class="text-muted-foreground/60 mt-auto shrink-0 py-1 text-center text-[11px]"
        >
          {{ t('global.copyright') }}
        </div>
      </template>
    </EditorWorkspace>

    <!-- Header-button drawers: each opens an independent right-side slide-over. -->
    <Drawer
      v-model:open="showGlobal"
      :title="t('global.title')"
      :masked="false"
    >
      <template #actions>
        <Popover v-model:open="showRestoreConfirm">
          <PopoverTrigger as-child>
            <button
              type="button"
              class="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-7 items-center justify-center rounded-md"
              :title="t('global.restoreDefaults')"
              :aria-label="t('global.restoreDefaults')"
            >
              <RotateCcw class="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" class="z-[60] w-60 space-y-2.5 p-3">
            <p class="text-muted-foreground text-xs leading-relaxed">
              {{ t('global.guard.restoreDefaults') }}
            </p>
            <div class="flex justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                class="h-7 text-xs"
                @click="showRestoreConfirm = false"
              >
                {{ t('app.cancel') }}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                class="h-7 text-xs"
                @click="confirmRestoreDefaults"
              >
                {{ t('global.guard.confirm') }}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </template>
      <GlobalSettings />
    </Drawer>
    <Drawer v-model:open="showJson" :title="t('json.title')">
      <JsonPanel />
    </Drawer>
    <Drawer v-model:open="showPlayground" :title="t('playground.tab')">
      <PlaygroundPanel />
    </Drawer>

    <ConfirmDialog
      v-model:open="showClearConfirm"
      :title="t('app.clearConfirm')"
      :description="t('app.clearDesc')"
      :confirm-text="t('app.clear')"
      :cancel-text="t('app.cancel')"
      variant="destructive"
      @confirm="confirmClear"
    />
  </div>
</template>
