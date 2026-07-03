<script setup lang="ts">
import {
  ArrowLeft,
  Camera,
  Check,
  ExternalLink,
  Import,
  Lightbulb,
  Send,
  Share2,
  Terminal
} from '@lucide/vue';
import { useClipboard } from '@vueuse/core';
import { nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import TerminalPreview from '@/components/TerminalPreview.vue';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { buildApplyCommand } from '@/lib/applyCommand';
import {
  copyPngToClipboard,
  downloadBlob,
  exportElementPngBlob,
  exportFilename
} from '@/lib/exportImage';
import { buildTemplateShareUrl } from '@/lib/shareConfig';
import { usePendingTemplateStore } from '@/stores/pendingTemplate';
import { TEMPLATES, type Template } from '@/templates';

const { t } = useI18n();
const router = useRouter();
const { copy } = useClipboard();
const pendingTemplate = usePendingTemplateStore();

// Where the trailing "submit yours" card sends people — a tracking issue that
// collects community-submitted configs for inclusion in this list.
const SUBMIT_ISSUE_URL =
  'https://github.com/refinist/ccstatusline-editor/issues/1';

// Keyed `${template.id}:share|cmd` so each card's two buttons swap their own
// icon to a checkmark briefly, independent of every other button on the page.
const copiedKey = ref<string | null>(null);
async function doCopy(text: string, key: string, message: string) {
  await copy(text);
  copiedKey.value = key;
  toast.success(message);
  setTimeout(() => {
    if (copiedKey.value === key) copiedKey.value = null;
  }, 1500);
}
// Template share links are `?tpl=<id>` resolved from the bundled template data —
// no backend involved, so they never expire and cost zero KV quota.
function onShare(tpl: Template) {
  doCopy(
    buildTemplateShareUrl(tpl.id),
    `${tpl.id}:share`,
    t('templates.shareCopied')
  );
}
function onCopyCommand(tpl: Template) {
  doCopy(
    buildApplyCommand(tpl.config),
    `${tpl.id}:cmd`,
    t('templates.commandCopied')
  );
}

// "Save image": the same fixed-width PNG export (download + clipboard copy) the
// editor's preview row offers, fed by an offscreen TerminalPreview of this
// card's config. See LineEditor.vue's onShowcase for why this is deliberately
// NOT an async function (Safari's clipboard user-gesture window).
const exportPreviewRef = ref<HTMLElement | null>(null);
const showcasing = ref<Template | null>(null);
function onShowcase(tpl: Template) {
  if (showcasing.value) return;
  showcasing.value = tpl;
  const blobPromise = (async () => {
    await nextTick();
    const el = exportPreviewRef.value;
    if (!el) throw new Error('export preview not mounted');
    return await exportElementPngBlob(el);
  })();
  const copiedPromise = copyPngToClipboard(blobPromise);
  const finish = async () => {
    try {
      const blob = await blobPromise;
      downloadBlob(blob, exportFilename());
      const copied = await copiedPromise;
      toast.success(t(copied ? 'showcase.doneCopied' : 'showcase.done'));
    } catch {
      toast.error(t('showcase.failed'));
    } finally {
      showcasing.value = null;
    }
  };
  finish();
}

// "Use this template": confirm (it overwrites the editor's current config and
// can't be undone — loadConfig() wipes the undo history) via a popover anchored
// to the button, same pattern as the "delete line" confirm in LineEditor.vue —
// then hand the config to the editor via a one-shot Pinia store and
// replace-navigate there (no back button back into this half-finished flow).
const applyTarget = ref<string | null>(null);
function confirmApply(tpl: Template) {
  pendingTemplate.set(tpl.config);
  applyTarget.value = null;
  router.replace('/');
}
</script>

<template>
  <div
    class="bg-background text-foreground mx-auto flex min-h-full w-full max-w-[1920px] flex-col"
  >
    <!-- sticky: the list is long, so pin the back link (and the more-templates
         link) to the top while scrolling -->
    <header
      class="border-border bg-card sticky top-0 z-40 flex h-11 shrink-0 items-center justify-between gap-2 border-b px-4"
    >
      <Button
        as-child
        variant="ghost"
        size="sm"
        class="text-muted-foreground h-8 shrink-0 text-sm"
      >
        <RouterLink to="/">
          <ArrowLeft class="size-3.5" />
          <span>{{ t('nav.editor') }}</span>
        </RouterLink>
      </Button>
      <Button
        as="a"
        :href="SUBMIT_ISSUE_URL"
        target="_blank"
        rel="noopener noreferrer"
        variant="ghost"
        size="sm"
        class="text-muted-foreground h-8 shrink-0 text-sm"
      >
        <ExternalLink class="size-3.5" />
        <span>{{ t('templates.moreTemplates') }}</span>
      </Button>
    </header>

    <main class="flex-1 p-4 lg:p-6">
      <div
        class="text-muted-foreground/70 mb-4 flex items-center gap-1.5 px-1 text-[11px]"
      >
        <Lightbulb class="ccse-bulb size-2.5 shrink-0 text-[#D97757]" />
        <p>{{ t('templates.subtitle') }}</p>
      </div>

      <!-- Masonry: CSS multi-column instead of a grid, so cards of very different
           heights (1-line vs 3-line configs) stack tightly instead of leaving gaps. -->
      <div class="columns-1 gap-5 md:columns-2">
        <div
          v-for="tpl in TEMPLATES"
          :key="tpl.id"
          class="border-border bg-card relative mb-5 flex break-inside-avoid flex-col gap-3 rounded-lg border p-4"
        >
          <div>
            <!-- flex-wrap: on narrow screens the three labelled buttons don't fit
                 next to the title, so the whole button group drops to a second
                 row (ml-auto keeps it right-aligned there) instead of the title
                 truncating away. -->
            <div
              class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
            >
              <div class="flex min-w-0 items-baseline gap-1.5">
                <h2
                  class="text-foreground min-w-0 truncate text-sm font-semibold"
                >
                  {{ t(`templates.items.${tpl.id}.name`) }}
                </h2>
                <a
                  :href="`https://github.com/${tpl.author}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-muted-foreground/70 hover:text-foreground shrink-0 text-xs hover:underline"
                  :title="t('templates.authorTitle', { author: tpl.author })"
                >
                  @{{ tpl.author }}
                </a>
              </div>

              <!-- Same style as the clone/delete buttons in the editor's Inspector panel: outline stroke, size-3.5 icons -->
              <div class="ml-auto flex shrink-0 items-center gap-1">
                <Popover
                  :open="applyTarget === tpl.id"
                  @update:open="applyTarget = $event ? tpl.id : null"
                >
                  <PopoverTrigger as-child>
                    <Button
                      variant="outline"
                      size="xs"
                      class="text-muted-foreground"
                      :title="t('templates.apply')"
                    >
                      <Import class="size-3.5" />
                      {{ t('templates.applyBtn') }}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" class="w-64 p-3">
                    <p class="text-foreground text-xs">
                      {{ t('templates.applyConfirmTitle') }}
                    </p>
                    <p class="text-muted-foreground mt-1 text-xs">
                      {{
                        t('templates.applyConfirmDesc', {
                          name: t(`templates.items.${tpl.id}.name`)
                        })
                      }}
                    </p>
                    <div class="mt-3 flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        class="h-7 text-xs"
                        @click="applyTarget = null"
                      >
                        {{ t('app.cancel') }}
                      </Button>
                      <Button
                        size="sm"
                        class="h-7 text-xs"
                        @click="confirmApply(tpl)"
                      >
                        {{ t('templates.apply') }}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="xs"
                  class="text-muted-foreground"
                  :title="t('showcase.hint')"
                  :disabled="showcasing !== null"
                  @click="onShowcase(tpl)"
                >
                  <Camera class="size-3.5" />
                  {{ t('showcase.label') }}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  class="text-muted-foreground"
                  :title="t('templates.copyCommand')"
                  @click="onCopyCommand(tpl)"
                >
                  <Check
                    v-if="copiedKey === `${tpl.id}:cmd`"
                    class="size-3.5"
                  />
                  <Terminal v-else class="size-3.5" />
                  {{ t('templates.copyCommand') }}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  class="text-muted-foreground"
                  :title="t('templates.share')"
                  @click="onShare(tpl)"
                >
                  <Check
                    v-if="copiedKey === `${tpl.id}:share`"
                    class="size-3.5"
                  />
                  <Share2 v-else class="size-3.5" />
                  {{ t('templates.share') }}
                </Button>
              </div>
            </div>
            <p class="text-muted-foreground mt-1 text-xs leading-relaxed">
              {{ t(`templates.items.${tpl.id}.desc`) }}
            </p>
          </div>

          <TerminalPreview :config="tpl.config" />
        </div>

        <!-- Not a real template — always the last card, inviting people to submit
             their own config via the tracking issue instead of a live preview.
             The border itself isn't a link (nested interactive elements are an
             a11y anti-pattern) — the Button below is the one clickable target. -->
        <div
          class="border-border text-muted-foreground mb-5 flex min-h-[160px] break-inside-avoid flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-4 text-center"
        >
          <div>
            <p class="text-foreground text-sm font-semibold">
              {{ t('templates.submitCta.title') }}
            </p>
            <p class="mt-1 max-w-[220px] text-xs leading-relaxed">
              {{ t('templates.submitCta.desc') }}
            </p>
          </div>
          <Button
            as="a"
            :href="SUBMIT_ISSUE_URL"
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            size="xs"
            class="text-muted-foreground"
          >
            <Send class="size-3.5" />
            {{ t('templates.submitCta.button') }}
          </Button>
        </div>
      </div>
    </main>

    <!-- Offscreen showcase capture target — same zero-clipped setup as the
         editor's (see LineEditor.vue for the layout/opacity caveats). Mounted
         only while a card's export is in flight. -->
    <div
      v-if="showcasing"
      aria-hidden="true"
      class="fixed top-0 left-0 size-0 overflow-hidden"
    >
      <div ref="exportPreviewRef" class="absolute">
        <TerminalPreview :config="showcasing.config" />
      </div>
    </div>

    <footer
      class="text-muted-foreground/60 shrink-0 px-4 py-1 text-center text-[11px]"
    >
      {{ t('global.copyright') }}
    </footer>
  </div>
</template>

<style scoped>
/* Same steady Claude-orange (#D97757) glow as the editor's tip bulb (EditorTips.vue)
   — layered drop-shadows (a tight bright core over a soft wide halo) read as
   brighter than a single blur without smearing the small icon. */
.ccse-bulb {
  filter: drop-shadow(0 0 1px rgba(255, 235, 220, 1))
    drop-shadow(0 0 3px rgba(230, 145, 110, 1))
    drop-shadow(0 0 6px rgba(217, 119, 87, 0.9))
    drop-shadow(0 0 12px rgba(217, 119, 87, 0.7));
}
</style>
