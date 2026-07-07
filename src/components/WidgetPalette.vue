<script setup lang="ts">
import { CircleAlert, Search, X } from '@lucide/vue';
import { useMediaQuery } from '@vueuse/core';
import { computed, ref } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import InfoTip from '@/components/InfoTip.vue';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useDragCursorCenter } from '@/composables/useDragCursorCenter';
import { renderWidget, type Token } from '@/preview/renderers';
import { useConfigStore } from '@/stores/config';
import { CATEGORIES, WIDGETS, type WidgetMeta } from '@/widgets';

// Emitted after a widget is added (double-click / double-tap), so the mobile
// drawer hosting the palette can close itself and reveal the result.
const emit = defineEmits<{ added: [] }>();

const store = useConfigStore();
const { t } = useI18n();
const { onItemPointerDown, onDragStart, onDragEnd, isDragging } =
  useDragCursorCenter();

// Below the sm breakpoint the palette lives in a modal drawer, where cross-boundary
// drag-and-drop can't reach the editor anyway — but sortablejs would still grab the
// touch events (forceFallback preventDefaults them), swallowing the double-tap that
// is the ONLY way to add a widget there. So drag is enabled only from sm up
// (640px, Tailwind's default), leaving touch double-tap free to fire dblclick.
const canDrag = useMediaQuery('(min-width: 640px)');

// iOS Safari never synthesizes a dblclick event from a double-tap (and Android is
// inconsistent), so below sm the double-tap is detected by hand from click events:
// two taps on the SAME widget within the window count as one "double-tap add".
// Native dblclick stays the desktop path (gated on canDrag so browsers that DO
// fire both — e.g. Chrome on Android — can't add the widget twice). The add is
// confirmed with a toast: the editor sits behind the modal drawer, so there is no
// other visible feedback.
const DOUBLE_TAP_MS = 400;
let lastTapType = '';
let lastTapAt = 0;

function addWidget(w: WidgetMeta) {
  store.addWidget(store.activeLine ?? 0, w);
  emit('added');
}

function onItemDblclick(w: WidgetMeta) {
  if (canDrag.value) addWidget(w);
}

function onItemClick(w: WidgetMeta) {
  if (canDrag.value) return;
  const now = performance.now();
  if (lastTapType === w.type && now - lastTapAt < DOUBLE_TAP_MS) {
    lastTapType = '';
    lastTapAt = 0;
    addWidget(w);
    toast.success(t('palette.added'));
  } else {
    lastTapType = w.type;
    lastTapAt = now;
  }
}

const query = ref('');
const activeCat = ref<string>('All');

const tabs = ['All', ...CATEGORIES];

const countByCat = computed<Record<string, number>>(() => {
  const m: Record<string, number> = { All: WIDGETS.length };
  for (const c of CATEGORIES)
    m[c] = WIDGETS.filter(w => w.category === c).length;
  return m;
});

// Colored ANSI preview tokens per widget type (built once — defaults are static).
const previews: Record<string, Token[]> = Object.fromEntries(
  WIDGETS.map(w => [
    w.type,
    renderWidget({ id: 'preview', type: w.type, ...(w.defaults || {}) })
  ])
);

// Search text combines localized name + description + raw type, so it matches in any locale.
function searchText(w: WidgetMeta): string {
  return `${t(`widgets.${w.type}`)} ${t(`widgetDesc.${w.type}`)} ${w.type}`.toLowerCase();
}

const q = computed(() => query.value.trim().toLowerCase());

// A query searches across ALL categories (mirrors ccstatusline); otherwise honor the active category.
const matched = computed<WidgetMeta[]>(() => {
  if (q.value) return WIDGETS.filter(w => searchText(w).includes(q.value));
  if (activeCat.value !== 'All')
    return WIDGETS.filter(w => w.category === activeCat.value);
  return WIDGETS;
});

// Group results by category (in canonical order); drop empty groups.
const sections = computed(() =>
  CATEGORIES.map(cat => ({
    cat,
    items: matched.value.filter(w => w.category === cat)
  })).filter(s => s.items.length > 0)
);

function selectTab(v: unknown) {
  if (!v) return; // ToggleGroup emits undefined when the active item is clicked again; ignore it to keep single-select behavior
  activeCat.value = String(v);
  if (q.value) query.value = '';
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="border-border shrink-0 border-b p-3">
      <InputGroup class="h-8">
        <InputGroupAddon>
          <Search class="size-3.5" />
        </InputGroupAddon>
        <!-- Pin one size at every width. The shadcn Input defaults to `text-base
             md:text-sm` (16px below md, 14px above), so overriding only the base
             size lets md:text-sm win past md and jump the text back up. Set BOTH
             breakpoints (text-xs md:text-xs) to hold a flat 12px everywhere. -->
        <InputGroupInput
          v-model="query"
          type="text"
          :placeholder="t('palette.search')"
          class="text-xs md:text-xs"
        />
        <InputGroupAddon v-if="query" align="inline-end">
          <InputGroupButton
            size="icon-xs"
            class="text-muted-foreground hover:text-foreground"
            @click="query = ''"
          >
            <X class="size-3" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>

    <div class="border-border shrink-0 border-b px-1 py-2">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        :spacing="1"
        :model-value="q ? undefined : activeCat"
        class="w-full flex-wrap"
        @update:model-value="selectTab"
      >
        <ToggleGroupItem
          v-for="c in tabs"
          :key="c"
          :value="c"
          class="h-auto rounded-full px-2 py-0.5 text-xs"
        >
          {{ t(`categories.${c}`) }}
          <span class="opacity-50">{{ countByCat[c] }}</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>

    <ScrollArea class="min-h-0 flex-1">
      <div
        v-if="sections.length === 0"
        class="text-muted-foreground p-8 text-center text-xs"
      >
        {{ t('palette.empty') }}
      </div>

      <!-- Sticky category headers: every header shares top:0, so as the next one
             scrolls to the top it replaces the previous, always showing only the current category. -->
      <div class="px-2 pb-3">
        <template v-for="s in sections" :key="s.cat">
          <div
            class="bg-card sticky top-0 z-10 flex items-center gap-2 px-1 py-2"
          >
            <span
              class="text-muted-foreground text-xs font-semibold tracking-wider"
            >
              {{ t(`categories.${s.cat}`) }}
            </span>
            <span class="text-muted-foreground/50 text-[11px]">
              {{ s.items.length }}
            </span>
            <div class="bg-border/60 h-px flex-1" />
          </div>

          <VueDraggable
            :model-value="s.items"
            :disabled="!canDrag"
            :group="{ name: 'widgets', pull: 'clone', put: false }"
            :sort="false"
            :clone="(w: WidgetMeta) => ({ ...w })"
            :force-fallback="true"
            :fallback-on-body="true"
            filter=".ccse-info-trigger"
            drag-class="ccse-dragging"
            ghost-class="ccse-ghost"
            chosen-class="ccse-noop"
            item-key="type"
            class="flex flex-col gap-1"
            @start="onDragStart"
            @end="onDragEnd"
          >
            <div
              v-for="w in s.items"
              :key="w.type"
              :class="[
                'ccse-palette-item group border-border bg-secondary/30 cursor-grab rounded-md border px-2.5 py-1.5 transition-colors select-none',
                isDragging ? '' : 'hover:bg-secondary hover:border-primary/40'
              ]"
              @pointerdown="onItemPointerDown"
              @click="onItemClick(w)"
              @dblclick="onItemDblclick(w)"
            >
              <div
                class="ccse-palette-label flex items-center justify-between gap-2"
              >
                <span class="text-foreground truncate text-[13px]">
                  {{ t(`widgets.${w.type}`) }}
                </span>
                <div class="flex shrink-0 items-center gap-1.5">
                  <InfoTip side="right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="ccse-info-trigger text-muted-foreground/50 hover:text-foreground size-5 shrink-0 cursor-pointer rounded-sm"
                      @pointerdown.stop
                      @click.stop
                      @dblclick.stop
                    >
                      <CircleAlert class="size-3.5" />
                    </Button>
                    <template #content>
                      {{ t(`widgetDesc.${w.type}`) }}
                    </template>
                  </InfoTip>
                </div>
              </div>
              <div
                class="ccse-palette-preview text-foreground truncate font-mono text-[12px] leading-6"
              >
                <span
                  v-for="(tok, k) in previews[w.type]"
                  :key="k"
                  :class="tok.cls"
                  :style="tok.style"
                >
                  {{ tok.text }}
                </span>
              </div>
            </div>
          </VueDraggable>
        </template>
      </div>
    </ScrollArea>
  </div>
</template>
