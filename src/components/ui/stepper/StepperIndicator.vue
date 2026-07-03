<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { StepperIndicator, type StepperIndicatorProps } from 'reka-ui';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'vue';

const props = defineProps<
  StepperIndicatorProps & { class?: HTMLAttributes['class'] }
>();
const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <StepperIndicator
    data-slot="stepper-indicator"
    v-bind="delegatedProps"
    :class="
      cn(
        'bg-muted text-muted-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-transparent text-xs font-medium transition-colors',
        'group-data-[state=active]/step:bg-primary group-data-[state=active]/step:text-primary-foreground',
        'group-data-[state=completed]/step:bg-primary group-data-[state=completed]/step:text-primary-foreground',
        props.class
      )
    "
  >
    <slot />
  </StepperIndicator>
</template>
