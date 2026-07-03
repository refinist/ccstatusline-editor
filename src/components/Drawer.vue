<script setup lang="ts">
import { X } from '@lucide/vue';
import { computed } from 'vue';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle
} from '@/components/ui/sheet';

// Right-side slide-over drawer. Hosts a self-contained panel in its body; the
// drawer owns the title bar + close affordance, slide animation, and
// ESC / outside-click close (handled by reka-ui's Dialog, via Sheet).
const open = defineModel<boolean>('open', { default: false });

// widthClass controls the drawer's width: defaults to 1.5x the left panel's width
// (220px); pass a wider width class explicitly for panels that need more room.
// bodyClass controls the content container: it has padding + vertical scroll by
// default; if a panel manages its own layout/scrolling (e.g. Inspector's own
// ScrollArea), pass 'overflow-hidden' to drop the outer padding and scroll.
// masked controls overlay visibility: the global-settings drawer needs the canvas
// to stay visible while configuring, so it passes false to keep the overlay transparent.
const props = withDefaults(
  defineProps<{
    title?: string;
    widthClass?: string;
    bodyClass?: string;
    modal?: boolean;
    masked?: boolean;
  }>(),
  {
    widthClass: 'w-[330px]',
    bodyClass: 'overflow-y-auto p-4',
    // reka-ui's own DialogRoot default is true; `modal:false` doesn't just hide the
    // overlay's tint, it unmounts the overlay entirely and lets clicks/focus pass
    // through to whatever is behind the drawer (see the transparent-overlay branch below,
    // which keeps the overlay mounted — blocking background interaction — while invisible).
    modal: true,
    masked: true
  }
);

const overlayClass = computed(() =>
  props.masked ? 'bg-black/40 backdrop-blur-[1px]' : 'bg-transparent'
);
</script>

<template>
  <Sheet v-model:open="open" :modal="modal">
    <!-- right offset hugs the 1920px-capped app's right edge on ultra-wide screens
         (matches App.vue's centered shell); it collapses to 0 below 1920px. -->
    <SheetContent
      side="right"
      hide-close
      :overlay-class="overlayClass"
      :class="`right-[max(0px,calc((100vw_-_1920px)/2))] ${widthClass} border-border bg-card max-w-[92vw] gap-0 border-l p-0 shadow-2xl sm:max-w-[92vw]`"
    >
      <div
        class="border-border flex h-11 shrink-0 items-center justify-between gap-2 border-b px-4"
      >
        <SheetTitle class="text-foreground truncate text-sm font-medium">
          {{ title }}
        </SheetTitle>
        <div class="flex shrink-0 items-center gap-1">
          <slot name="actions" />
          <SheetClose
            class="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-7 items-center justify-center rounded-md"
            aria-label="Close"
          >
            <X class="size-4" />
          </SheetClose>
        </div>
      </div>
      <div class="flex min-h-0 flex-1 flex-col" :class="bodyClass">
        <slot />
      </div>
    </SheetContent>
  </Sheet>
</template>
