<script setup lang="ts">
import { SelectLabel, type SelectLabelProps } from 'reka-ui';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'vue';

const props = defineProps<
  SelectLabelProps & { class?: HTMLAttributes['class'] }
>();
</script>

<template>
  <SelectLabel
    data-slot="select-label"
    :class="cn('text-muted-foreground px-2 py-1.5 text-xs', props.class)"
  >
    <slot />
  </SelectLabel>
</template>
