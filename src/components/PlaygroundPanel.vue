<script setup lang="ts">
import { Check, Copy, Info } from '@lucide/vue';
import { useClipboard } from '@vueuse/core';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperTitle
} from '@/components/ui/stepper';
import { buildApplyCommand } from '@/lib/applyCommand';
import { useConfigStore } from '@/stores/config';

const store = useConfigStore();
const { t } = useI18n();

const CCSTATUSLINE_README_URL =
  'https://github.com/sirmalloc/ccstatusline#readme';

const applyCmd = computed(() => buildApplyCommand(store.config));
// Undo: the CLI finds the newest timestamped backup and rolls back to it (saving
// the current file first, so the rollback is itself undoable).
const revertCmd = 'npx -y @refinist/ccsa@latest restore';

const { copy } = useClipboard();
const copiedKey = ref<string | null>(null);
async function doCopy(text: string, key: string) {
  await copy(text);
  copiedKey.value = key;
  setTimeout(() => (copiedKey.value = null), 1500);
}

const preCls =
  'rounded-md border border-border bg-muted/40 p-2 text-[11px] font-mono text-foreground/90 whitespace-pre-wrap break-all max-h-36 overflow-auto';
</script>

<template>
  <div class="-m-4 flex min-h-0 flex-1 flex-col">
    <ScrollArea class="min-h-0 flex-1">
      <div class="space-y-4 px-4 py-4">
        <Stepper orientation="vertical" class="w-full">
          <!-- Step 1 — prerequisite -->
          <StepperItem :step="1" class="relative w-full items-start pb-5">
            <div
              class="bg-border absolute top-7 bottom-0 left-3 w-px -translate-x-1/2"
            />
            <StepperIndicator>1</StepperIndicator>
            <div class="ml-3 min-w-0 flex-1 space-y-2">
              <StepperTitle>{{ t('playground.step1Title') }}</StepperTitle>
              <StepperDescription>
                <i18n-t keypath="playground.step1Desc" tag="span">
                  <template #link>
                    <a
                      :href="CCSTATUSLINE_README_URL"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="hover:text-primary underline underline-offset-4"
                    >
                      {{ t('playground.step1LinkText') }}
                    </a>
                  </template>
                </i18n-t>
              </StepperDescription>
            </div>
          </StepperItem>

          <!-- Step 2 — copy the command -->
          <StepperItem :step="2" class="relative w-full items-start">
            <StepperIndicator>2</StepperIndicator>
            <div class="ml-3 min-w-0 flex-1 space-y-2">
              <StepperTitle>{{ t('playground.step2Title') }}</StepperTitle>
              <div class="relative">
                <pre :class="[preCls, 'pr-8']">{{ applyCmd }}</pre>
                <Button
                  size="icon"
                  variant="ghost"
                  class="text-muted-foreground hover:text-foreground absolute top-1.5 right-1.5 size-6"
                  :title="
                    copiedKey === 'apply'
                      ? t('playground.copied')
                      : t('playground.copy')
                  "
                  @click="doCopy(applyCmd, 'apply')"
                >
                  <Check v-if="copiedKey === 'apply'" class="size-3.5" />
                  <Copy v-else class="size-3.5" />
                </Button>
              </div>
            </div>
          </StepperItem>
        </Stepper>

        <!-- tip: no restart needed. ml-11 = the stepper's indent (size-6 badge +
             the StepperItem's gap-2 + the content's ml-3 = 44px), so this sits
             flush-left with step 2's command box above, not hanging past it. -->
        <div
          class="border-border bg-muted/30 text-muted-foreground ml-11 flex gap-2 rounded-md border px-3 py-2 text-xs leading-relaxed"
        >
          <Info class="mt-0.5 size-3.5 shrink-0" />
          <span>{{ t('playground.tip') }}</span>
        </div>

        <!-- revert -->
        <div class="space-y-2">
          <p class="text-muted-foreground text-xs">
            {{ t('playground.revertNote') }}
          </p>
          <div class="relative">
            <pre :class="[preCls, 'pr-8']">{{ revertCmd }}</pre>
            <Button
              size="icon"
              variant="ghost"
              class="text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 size-6 -translate-y-1/2"
              :title="
                copiedKey === 'revert'
                  ? t('playground.copied')
                  : t('playground.copy')
              "
              @click="doCopy(revertCmd, 'revert')"
            >
              <Check v-if="copiedKey === 'revert'" class="size-3.5" />
              <Copy v-else class="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  </div>
</template>
