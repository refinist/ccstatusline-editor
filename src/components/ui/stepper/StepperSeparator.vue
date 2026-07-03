<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { StepperSeparator, type StepperSeparatorProps } from 'reka-ui';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'vue';

const props = defineProps<
  StepperSeparatorProps & { class?: HTMLAttributes['class'] }
>();
const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <StepperSeparator
    data-slot="stepper-separator"
    v-bind="delegatedProps"
    :class="
      cn('bg-muted group-data-[state=completed]/step:bg-primary', props.class)
    "
  >
    <slot />
  </StepperSeparator>
</template>
