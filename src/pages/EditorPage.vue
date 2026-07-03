<script setup lang="ts">
import {
  Blocks,
  Braces,
  CircleHelp,
  Ellipsis,
  LayoutTemplate,
  Redo2,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  TerminalSquare,
  Trash2,
  Undo2
} from '@lucide/vue';
import { useEventListener, useMediaQuery } from '@vueuse/core';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import Drawer from '@/components/Drawer.vue';
import GithubButton from '@/components/GithubButton.vue';
import GlobalSettings from '@/components/GlobalSettings.vue';
import Inspector from '@/components/Inspector.vue';
import JsonPanel from '@/components/JsonPanel.vue';
import LineEditor from '@/components/LineEditor.vue';
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
import WidgetPalette from '@/components/WidgetPalette.vue';
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
// window — the column comes back and the drawer would duplicate it, so close
// it. The other drawers (global settings / JSON / playground) are drawers at
// every width and are left alone.
// The header "more" dropdown has the same problem: its trigger is sm:hidden,
// so past sm the open menu would float over the full toolbar with no way to
// reopen (or sensibly interact with) it.
const showMoreMenu = ref(false);
const smUp = useMediaQuery('(min-width: 640px)');
const lgUp = useMediaQuery('(min-width: 1024px)');
watch(smUp, up => {
  if (up) {
    showPalette.value = false;
    showMoreMenu.value = false;
  }
});
watch(lgUp, up => {
  if (up) showInspector.value = false;
});

// Version number next to the title (static display, mirrors ccstatusline's
// title "| v…" structure).
const version = '2.2.22';

const showClearConfirm = ref(false);

// Disable "clear" when there are no widgets.
const hasWidgets = computed(() => store.config.lines.some(l => l.length > 0));

function onReset() {
  showClearConfirm.value = true;
}

function confirmClear() {
  store.reset();
}

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
      class="border-border bg-card flex h-11 shrink-0 items-center justify-between gap-2 border-b px-4"
    >
      <div class="flex min-w-0 items-center">
        <img
          src="/logo.png"
          alt=""
          class="mr-2 hidden size-5 shrink-0 sm:block"
        />
        <h1 class="flex min-w-0 items-center text-base tracking-wide">
          <span class="ccse-gradient-flow truncate font-semibold">
            {{ t('app.title') }}
          </span>
          <span
            class="text-muted-foreground hidden text-sm font-medium lg:inline"
          >
            <span class="mx-2.5">|</span>
            v{{ version }}
          </span>
        </h1>
        <!-- Page-level nav hugs the brand area, separate from the toolbar buttons on the right -->
        <span
          class="text-muted-foreground/50 mx-2.5 hidden text-sm select-none lg:inline"
        >
          ·
        </span>
        <RouterLink
          to="/templates"
          class="ml-2.5 flex shrink-0 items-center gap-1.5 text-sm font-medium text-[#D97757] transition-opacity hover:opacity-80 lg:ml-0"
        >
          <LayoutTemplate class="size-3.5" />
          <span class="hidden lg:inline">{{ t('nav.templates') }}</span>
        </RouterLink>
        <RouterLink
          to="/help"
          class="ml-2.5 hidden shrink-0 items-center gap-1.5 text-sm font-medium text-[#D97757] transition-opacity hover:opacity-80 sm:flex"
        >
          <CircleHelp class="size-3.5" />
          <span class="hidden lg:inline">{{ t('nav.help') }}</span>
        </RouterLink>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <!-- High-frequency edit actions: icon-only (self-explanatory) + title tooltip -->
        <Button
          variant="ghost"
          size="sm"
          class="text-muted-foreground h-8 w-8 px-0"
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
          class="text-muted-foreground h-8 w-8 px-0"
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
        <div class="bg-border mx-1 h-4 w-px" />

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
            @click="showPlayground = true"
          >
            <TerminalSquare class="ccse-rainbow-icon size-3.5" />
            <span class="ccse-rainbow-flow hidden font-semibold lg:inline">
              {{ t('playground.tab') }}
            </span>
          </Button>
          <div class="bg-border mx-1 h-4 w-px" />
          <GithubButton />
          <ThemeToggle />
          <LocaleSwitcher />
        </div>

        <DropdownMenu v-model:open="showMoreMenu">
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="sm"
              class="text-muted-foreground h-8 w-8 px-0 sm:hidden"
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
            <DropdownMenuItem @click="showPlayground = true">
              <TerminalSquare class="ccse-rainbow-icon size-3.5" />
              <span class="ccse-rainbow-flow font-semibold">
                {{ t('playground.tab') }}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem @click="router.push('/help')">
              <CircleHelp class="size-3.5" />
              {{ t('nav.help') }}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div class="flex items-center gap-1 px-1 py-1">
              <ThemeToggle />
              <LocaleSwitcher />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    <!-- Responsive layout, three tiers:
         · <sm  (phone portrait): palette collapses into a left-edge floating drawer;
           editor fills the screen; <main> scrolls as a whole.
         · sm–lg (phone landscape / tablet): palette becomes a fixed left column, sitting
           side-by-side with the editor; the Inspector still rides its right-edge drawer.
         · lg+  (desktop): the Inspector becomes a third fixed column (<aside> below).
         So the palette column appears at `sm`; the Inspector column appears at `lg`. -->
    <main
      class="flex flex-1 flex-col overflow-y-auto sm:flex-row sm:overflow-hidden"
    >
      <aside
        class="border-border bg-card hidden min-h-0 shrink-0 sm:flex sm:w-[220px] sm:flex-col sm:border-r"
      >
        <WidgetPalette />
      </aside>
      <!-- The column's bottom padding is stripped (pb-0); the copyright row's own
           py-1 supplies the 4px gap, matching the template page's footer line
           height. Padding is squeezed to p-1 on mobile: this content is
           width-sensitive (the terminal preview / line editor rely heavily on
           character alignment), so every pixel saved here genuinely fits more
           characters. Restored to p-4 from sm, once this middle column is no
           longer the only full-width area and there's no need to pinch it. -->
      <div
        class="flex w-full min-w-0 shrink-0 grow flex-col p-1 pb-0 sm:flex-1 sm:overflow-hidden sm:p-4 sm:pb-0 lg:p-6 lg:pb-0"
      >
        <LineEditor />
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
      </div>
      <aside
        class="border-border bg-card hidden shrink-0 lg:block lg:w-[330px] lg:overflow-hidden lg:border-l"
      >
        <Inspector />
      </aside>
    </main>

    <!-- Bottom-right floating stack: both panels that collapse into a drawer on
         narrow screens share one corner instead of each hugging its own viewport
         edge — palette on top (its own column takes over at sm), inspector below
         (its column takes over at lg), so at most one of the two is ever missing. -->
    <div class="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3">
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
            <div class="flex justify-end gap-2">
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
