<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { StepperItem, type StepperItemProps } from 'reka-ui';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'vue';

const props = defineProps<
  StepperItemProps & { class?: HTMLAttributes['class'] }
>();
const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <StepperItem
    data-slot="stepper-item"
    v-bind="delegatedProps"
    :class="
      cn(
        'group/step flex items-center gap-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        props.class
      )
    "
  >
    <slot />
  </StepperItem>
</template>
