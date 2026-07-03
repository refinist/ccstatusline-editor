<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { StepperTrigger, type StepperTriggerProps } from 'reka-ui';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'vue';

const props = defineProps<
  StepperTriggerProps & { class?: HTMLAttributes['class'] }
>();
const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <StepperTrigger
    data-slot="stepper-trigger"
    v-bind="delegatedProps"
    :class="
      cn(
        'focus-visible:ring-ring/50 inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-[3px] disabled:pointer-events-none',
        props.class
      )
    "
  >
    <slot />
  </StepperTrigger>
</template>
