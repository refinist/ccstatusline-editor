<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { StepperDescription, type StepperDescriptionProps } from 'reka-ui';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'vue';

const props = defineProps<
  StepperDescriptionProps & { class?: HTMLAttributes['class'] }
>();
const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <StepperDescription
    data-slot="stepper-description"
    v-bind="delegatedProps"
    :class="cn('text-muted-foreground text-xs', props.class)"
  >
    <slot />
  </StepperDescription>
</template>
