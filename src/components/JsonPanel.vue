<script setup lang="ts">
import { Check, Copy, Download, FileUp, Upload } from '@lucide/vue';
import { useClipboard } from '@vueuse/core';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { isCcStatusConfig } from '@/lib/shareConfig';
import { useConfigStore } from '@/stores/config';
import type { CcStatusConfig } from '@/widgets';

const store = useConfigStore();
const { t } = useI18n();
const { copy, copied } = useClipboard({ copiedDuring: 1500 });

function download() {
  const blob = new Blob([store.json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ccstatusline-settings.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ── import ──────────────────────────────────────────────────────────────────
// Fully controlled textarea: `raw` only ever changes via validate(), so a bad
// paste keeps the user's exact input on screen (easier to see/fix the typo)
// while a good one snaps to pretty-printed JSON as visible confirmation of
// what's about to be imported.
const raw = ref('');
const error = ref('');
const parsed = ref<CcStatusConfig | null>(null);
const fileInput = ref<InstanceType<typeof HTMLInputElement> | null>(null);

function validate(text: string) {
  parsed.value = null;
  if (text.trim() === '') {
    raw.value = text;
    error.value = '';
    return;
  }
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    raw.value = text;
    error.value = t('json.importInvalidJson', {
      message: (e as Error).message
    });
    return;
  }
  if (!isCcStatusConfig(obj)) {
    raw.value = text;
    error.value = t('json.importInvalidShape');
    return;
  }
  error.value = '';
  parsed.value = obj;
  raw.value = JSON.stringify(obj, null, 2);
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ''; // allow re-picking the same file (e.g. after fixing it externally)
  if (file) validate(await file.text());
}

const confirmOpen = ref(false);
function doImport() {
  if (!parsed.value) return;
  store.loadConfig(parsed.value);
  raw.value = '';
  parsed.value = null;
  toast.success(t('json.imported'));
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <Tabs default-value="export" class="min-h-0 flex-1 gap-2">
      <TabsList class="self-start">
        <TabsTrigger value="export" class="text-xs">
          {{ t('json.tabExport') }}
        </TabsTrigger>
        <TabsTrigger value="import" class="text-xs">
          {{ t('json.tabImport') }}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="export" class="flex min-h-0 flex-col">
        <div class="mb-2 flex items-center justify-end">
          <div class="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              class="h-7 text-xs"
              @click="copy(store.json)"
            >
              <Check v-if="copied" class="size-3" />
              <Copy v-else class="size-3" />
              {{ copied ? t('json.copied') : t('json.copy') }}
            </Button>
            <Button
              size="sm"
              variant="outline"
              class="h-7 text-xs"
              @click="download"
            >
              <Download class="size-3" />
              {{ t('json.download') }}
            </Button>
          </div>
        </div>
        <div
          class="border-border bg-muted/30 min-h-0 flex-1 overflow-auto rounded-md border"
        >
          <pre
            class="text-foreground/90 p-3 font-mono text-[10px] leading-relaxed whitespace-pre"
            >{{ store.json }}</pre>
        </div>
      </TabsContent>

      <TabsContent value="import" class="flex min-h-0 flex-col gap-2">
        <div class="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            class="h-7 text-xs"
            @click="fileInput?.click()"
          >
            <FileUp class="size-3" />
            {{ t('json.importFile') }}
          </Button>
          <input
            ref="fileInput"
            type="file"
            accept=".json,application/json"
            class="hidden"
            @change="onFile"
          />
          <Button
            size="sm"
            class="h-7 text-xs"
            :disabled="!parsed"
            @click="confirmOpen = true"
          >
            <Upload class="size-3" />
            {{ t('json.importApply') }}
          </Button>
        </div>
        <Textarea
          :model-value="raw"
          spellcheck="false"
          :placeholder="t('json.importPlaceholder')"
          class="min-h-0 flex-1 resize-none font-mono text-[10px] leading-relaxed md:text-[10px]"
          @update:model-value="validate(String($event))"
        />
        <p v-if="error" class="text-destructive text-[11px] leading-relaxed">
          {{ error }}
        </p>
      </TabsContent>
    </Tabs>

    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="t('json.importConfirmTitle')"
      :description="t('json.importConfirmDesc')"
      :confirm-text="t('json.importApply')"
      :cancel-text="t('app.cancel')"
      variant="destructive"
      @confirm="doImport"
    />
  </div>
</template>
