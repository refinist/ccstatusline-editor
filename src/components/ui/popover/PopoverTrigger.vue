<script setup lang="ts">
import {
  PopoverTrigger,
  useForwardProps,
  type PopoverTriggerProps
} from 'reka-ui';

const props = defineProps<PopoverTriggerProps>();

const forwarded = useForwardProps(props);
</script>

<template>
  <PopoverTrigger data-slot="popover-trigger" v-bind="forwarded">
    <slot />
  </PopoverTrigger>
</template>
