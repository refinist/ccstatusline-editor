<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import {
  AccordionItem,
  useForwardProps,
  type AccordionItemProps
} from 'reka-ui';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'vue';

const props = defineProps<
  AccordionItemProps & { class?: HTMLAttributes['class'] }
>();

const delegatedProps = reactiveOmit(props, 'class');

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <AccordionItem
    v-slot="slotProps"
    data-slot="accordion-item"
    v-bind="forwardedProps"
    :class="cn('border-b last:border-b-0', props.class)"
  >
    <slot v-bind="slotProps" />
  </AccordionItem>
</template>
