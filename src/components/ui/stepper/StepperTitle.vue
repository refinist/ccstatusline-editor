<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { StepperTitle, type StepperTitleProps } from 'reka-ui';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'vue';

const props = defineProps<
  StepperTitleProps & { class?: HTMLAttributes['class'] }
>();
const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <StepperTitle
    data-slot="stepper-title"
    v-bind="delegatedProps"
    :class="cn('text-foreground text-sm font-medium', props.class)"
  >
    <slot />
  </StepperTitle>
</template>
