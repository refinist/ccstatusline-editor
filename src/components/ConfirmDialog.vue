<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

const open = defineModel<boolean>('open', { default: false });

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
  }>(),
  { variant: 'destructive' }
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent class="max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle class="text-base">{{ title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="description">
          {{ description }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel as-child>
          <Button
            variant="outline"
            size="sm"
            class="cursor-pointer"
            @click="emit('cancel')"
          >
            {{ cancelText }}
          </Button>
        </AlertDialogCancel>
        <AlertDialogAction as-child>
          <Button
            :variant="variant"
            size="sm"
            class="cursor-pointer"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </Button>
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
