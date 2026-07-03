<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import TerminalFrame from '@/components/TerminalFrame.vue';
import type { CcStatusConfig } from '@/widgets';

// Static counterpart to StatusPreview: same mac-window terminal look and the same
// TerminalFrame body, driven by an arbitrary config prop instead of the live store —
// no drag-resize / overflow-ellipsis / context slider, since template cards are
// read-only and don't need those.
defineProps<{ config: CcStatusConfig }>();

const { t } = useI18n();
</script>

<template>
  <div
    class="border-border overflow-hidden rounded-lg border bg-(--ccse-terminal-bg)"
  >
    <div class="border-border flex items-center gap-2.5 border-b px-3.5 py-2.5">
      <span class="flex gap-2">
        <span class="size-3 rounded-full bg-[#ff5f57]" />
        <span class="size-3 rounded-full bg-[#febc2e]" />
        <span class="size-3 rounded-full bg-[#28c840]" />
      </span>
    </div>

    <TerminalFrame
      :config="config"
      show-input
      :empty-text="t('editor.previewEmpty')"
    />
  </div>
</template>
