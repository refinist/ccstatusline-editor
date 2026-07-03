<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import {
  TabsRoot,
  useForwardPropsEmits,
  type TabsRootEmits,
  type TabsRootProps
} from 'reka-ui';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'vue';

const props = defineProps<
  TabsRootProps & { class?: HTMLAttributes['class'] }
>();
const emits = defineEmits<TabsRootEmits>();

const delegatedProps = reactiveOmit(props, 'class');
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <TabsRoot
    v-slot="slotProps"
    data-slot="tabs"
    v-bind="forwarded"
    :class="cn('flex flex-col gap-2', props.class)"
  >
    <slot v-bind="slotProps" />
  </TabsRoot>
</template>
