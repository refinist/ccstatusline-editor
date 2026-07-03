<script setup lang="ts">
import {
  DialogRoot,
  useForwardPropsEmits,
  type DialogRootEmits,
  type DialogRootProps
} from 'reka-ui';

const props = defineProps<DialogRootProps>();
const emits = defineEmits<DialogRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <DialogRoot v-slot="slotProps" data-slot="sheet" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </DialogRoot>
</template>
