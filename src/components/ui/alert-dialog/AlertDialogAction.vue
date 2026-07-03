<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { AlertDialogAction, type AlertDialogActionProps } from 'reka-ui';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'vue';

const props = defineProps<
  AlertDialogActionProps & { class?: HTMLAttributes['class'] }
>();

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <AlertDialogAction
    v-bind="delegatedProps"
    :class="cn(buttonVariants(), props.class)"
  >
    <slot />
  </AlertDialogAction>
</template>
