<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { StepperRoot, type StepperRootProps } from 'reka-ui';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'vue';

const props = defineProps<
  StepperRootProps & { class?: HTMLAttributes['class'] }
>();
const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <StepperRoot
    data-slot="stepper"
    v-bind="delegatedProps"
    :class="
      cn(
        'flex gap-2 data-[orientation=horizontal]:items-center data-[orientation=vertical]:flex-col',
        props.class
      )
    "
  >
    <slot />
  </StepperRoot>
</template>
