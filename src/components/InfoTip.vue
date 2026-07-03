<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'vue';

// Hint bubble that adapts to the input device. Pointers that can hover get a
// real hover Tooltip; touch gets a tap-to-open / tap-outside-to-close Popover
// restyled to look exactly like the tooltip — reka-ui tooltips only ever open
// from hover or keyboard focus, so on touch they would never show (the
// standard Radix-family answer is a Popover-based "toggletip").
// The switch keys off hover capability rather than viewport width: a touch
// tablet wide enough for the desktop layout still cannot hover.
//
// Default slot = the trigger element (forwarded as-child); #content = bubble.
// Both modes cap the bubble at min(24rem, 80vw) so it can never overflow a
// phone screen; pass contentClass to tighten it further (e.g. 'max-w-60').

withDefaults(
  defineProps<{
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    contentClass?: HTMLAttributes['class'];
  }>(),
  { side: 'top', align: 'center', contentClass: undefined }
);

const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
</script>

<template>
  <TooltipProvider v-if="canHover" :delay-duration="150">
    <Tooltip>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipContent
        :side="side"
        :align="align"
        :class="cn('max-w-[min(24rem,80vw)]', contentClass)"
      >
        <slot name="content" />
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
  <Popover v-else>
    <PopoverTrigger as-child>
      <slot />
    </PopoverTrigger>
    <!-- z-[60] keeps the bubble above drawers (SheetContent sits at z-50). -->
    <PopoverContent
      :side="side"
      :align="align"
      :class="
        cn(
          'bg-foreground text-background z-[60] w-fit max-w-[min(24rem,80vw)] rounded-md border-none px-3 py-1.5 text-xs shadow-none',
          contentClass
        )
      "
    >
      <slot name="content" />
    </PopoverContent>
  </Popover>
</template>
