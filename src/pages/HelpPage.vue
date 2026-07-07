<script setup lang="ts">
import {
  ArrowLeft,
  Check,
  CircleHelp,
  Copy,
  Info,
  ListOrdered,
  Repeat,
  Sparkles,
  TerminalSquare,
  TriangleAlert
} from '@lucide/vue';
import { useClipboard } from '@vueuse/core';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

const { t } = useI18n();

const CCSTATUSLINE_README_URL =
  'https://github.com/sirmalloc/ccstatusline#readme';

// Command snippets are deliberately not localized — they read the same in every
// language, and keeping them out of the locale files means the three files can't
// drift apart on the one thing that must stay byte-identical.
const FNM_SETTINGS_SNIPPET = `{
  "statusLine": {
    "type": "command",
    "command": "/opt/homebrew/bin/fnm exec --using=24.18.0 ccstatusline"
  }
}`;
const FNM_ALIAS_CMD = '/opt/homebrew/bin/fnm exec --using=default ccstatusline';
const NVM_CMD =
  '~/.nvm/versions/node/v24.18.0/bin/node ~/.nvm/versions/node/v24.18.0/bin/ccstatusline';

// Each entry pairs a literal command with its i18n description key under help.cli.
const CLI_COMMANDS = [
  { id: 'cmdApply', cmd: "npx -y @refinist/ccsa@latest apply '<json>'" },
  { id: 'cmdList', cmd: 'npx -y @refinist/ccsa@latest list' },
  { id: 'cmdRestore', cmd: 'npx -y @refinist/ccsa@latest restore' },
  { id: 'cmdExport', cmd: 'npx -y @refinist/ccsa@latest export' },
  { id: 'cmdClean', cmd: 'npx -y @refinist/ccsa@latest clean' }
] as const;

// The rotate on/off pair, shown in the rotation section under help.rotation.
// `<bundle.json>` is a placeholder — the rotation page hands out the real
// filename (and the -f command) from its "Use in Terminal" drawer.
const ROTATION_COMMANDS = [
  {
    id: 'cmdOn',
    cmd: 'npx -y @refinist/ccsa@latest rotate on -f <bundle.json>'
  },
  { id: 'cmdOff', cmd: 'npx -y @refinist/ccsa@latest rotate off' }
] as const;

const FEATURE_IDS = [
  'preview',
  'widgets',
  'templates',
  'share',
  'roundtrip'
] as const;
const SAFETY_IDS = ['backup', 'merge', 'atomic', 'symlink'] as const;
const ROTATION_MODE_IDS = ['schedule', 'strategy', 'weekly', 'edit'] as const;
const FAQ_IDS = ['nerdFont', 'colorLevel', 'separators', 'flexMode'] as const;

const { copy } = useClipboard();
const copiedKey = ref<string | null>(null);
async function doCopy(text: string, key: string) {
  await copy(text);
  copiedKey.value = key;
  setTimeout(() => {
    if (copiedKey.value === key) copiedKey.value = null;
  }, 1500);
}

// Same code-block styling as PlaygroundPanel.vue, minus its max-height (these
// snippets are short and clipping them would hide the point being made).
const preCls =
  'rounded-md border border-border bg-muted/40 p-2 text-xs font-mono text-foreground/90 whitespace-pre-wrap break-all';
</script>

<template>
  <div
    class="bg-background text-foreground mx-auto flex min-h-full w-full max-w-[1920px] flex-col"
  >
    <!-- sticky: the page is long, so pin the back link to the top while scrolling -->
    <header
      class="border-border bg-card sticky top-0 z-40 flex h-11 shrink-0 items-center gap-2 border-b px-4"
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
    </header>

    <main class="flex-1 p-4 lg:p-6">
      <div class="mx-auto w-full max-w-3xl space-y-10">
        <h1 class="text-foreground text-xl font-semibold">
          {{ t('help.title') }}
        </h1>

        <!-- What this project does -->
        <section class="space-y-3">
          <h2 class="flex items-center gap-2 text-base font-semibold">
            <Sparkles class="size-4 shrink-0 text-[#D97757]" />
            {{ t('help.intro.title') }}
          </h2>
          <p class="text-muted-foreground text-sm leading-relaxed">
            <i18n-t keypath="help.intro.desc" tag="span">
              <template #link>
                <a
                  :href="CCSTATUSLINE_README_URL"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="hover:text-primary underline underline-offset-4"
                >
                  ccstatusline
                </a>
              </template>
            </i18n-t>
          </p>
          <ul class="text-muted-foreground space-y-1.5 text-sm leading-relaxed">
            <li
              v-for="id in FEATURE_IDS"
              :key="id"
              class="flex items-start gap-2"
            >
              <Check class="mt-0.5 size-3.5 shrink-0 text-[#D97757]" />
              <span>{{ t(`help.intro.features.${id}`) }}</span>
            </li>
          </ul>
        </section>

        <!-- The workflow -->
        <section class="space-y-3">
          <h2 class="flex items-center gap-2 text-base font-semibold">
            <ListOrdered class="size-4 shrink-0 text-[#D97757]" />
            {{ t('help.workflow.title') }}
          </h2>
          <ol
            class="text-muted-foreground list-decimal space-y-1 pl-5 text-sm leading-relaxed"
          >
            <li>{{ t('help.workflow.step1') }}</li>
            <li>{{ t('help.workflow.step2') }}</li>
            <li>{{ t('help.workflow.step3') }}</li>
          </ol>
        </section>

        <!-- The ccsa CLI -->
        <section class="space-y-3">
          <h2 class="flex items-center gap-2 text-base font-semibold">
            <TerminalSquare class="size-4 shrink-0 text-[#D97757]" />
            {{ t('help.cli.title') }}
          </h2>
          <p class="text-muted-foreground text-sm leading-relaxed">
            {{ t('help.cli.desc') }}
          </p>
          <div class="space-y-2.5">
            <!-- The description rides inside the block as a `#` comment line, so
                 copying the block still yields something a shell can run. -->
            <pre
              v-for="c in CLI_COMMANDS"
              :key="c.id"
              :class="preCls"
            ><span class="text-muted-foreground"># {{ t(`help.cli.${c.id}`) }}</span>{{ `\n${c.cmd}` }}</pre>
          </div>
          <div class="space-y-1.5">
            <h3 class="text-foreground text-sm font-medium">
              {{ t('help.cli.safetyTitle') }}
            </h3>
            <ul
              class="text-muted-foreground space-y-1.5 text-sm leading-relaxed"
            >
              <li
                v-for="id in SAFETY_IDS"
                :key="id"
                class="flex items-start gap-2"
              >
                <Check class="mt-0.5 size-3.5 shrink-0 text-[#D97757]" />
                <span>{{ t(`help.cli.safety.${id}`) }}</span>
              </li>
            </ul>
          </div>
        </section>

        <!-- Theme rotation -->
        <section class="space-y-3">
          <h2 class="flex items-center gap-2 text-base font-semibold">
            <Repeat class="size-4 shrink-0 text-[#D97757]" />
            {{ t('help.rotation.title') }}
          </h2>
          <p class="text-muted-foreground text-sm leading-relaxed">
            {{ t('help.rotation.desc') }}
          </p>
          <ul class="text-muted-foreground space-y-1.5 text-sm leading-relaxed">
            <li
              v-for="id in ROTATION_MODE_IDS"
              :key="id"
              class="flex items-start gap-2"
            >
              <Check class="mt-0.5 size-3.5 shrink-0 text-[#D97757]" />
              <span>{{ t(`help.rotation.modes.${id}`) }}</span>
            </li>
          </ul>
          <div class="space-y-1.5">
            <h3 class="text-foreground text-sm font-medium">
              {{ t('help.rotation.cmdTitle') }}
            </h3>
            <div class="space-y-2.5">
              <!-- Same comment-then-command block as the CLI section above. -->
              <pre
                v-for="c in ROTATION_COMMANDS"
                :key="c.id"
                :class="preCls"
              ><span class="text-muted-foreground"># {{ t(`help.rotation.${c.id}`) }}</span>{{ `\n${c.cmd}` }}</pre>
            </div>
          </div>
          <p class="text-muted-foreground text-sm leading-relaxed">
            {{ t('help.rotation.entry') }}
          </p>
        </section>

        <!-- Pitfalls -->
        <section class="space-y-3">
          <h2 class="flex items-center gap-2 text-base font-semibold">
            <TriangleAlert class="size-4 shrink-0 text-[#D97757]" />
            {{ t('help.pitfalls.title') }}
          </h2>
          <p class="text-muted-foreground text-sm leading-relaxed">
            {{ t('help.pitfalls.subtitle') }}
          </p>

          <div
            class="border-border bg-card space-y-3 rounded-lg border p-4 text-sm leading-relaxed"
          >
            <h3 class="text-foreground text-base font-semibold">
              {{ t('help.pitfalls.fnm.title') }}
            </h3>
            <p class="text-muted-foreground">
              {{ t('help.pitfalls.fnm.intro') }}
            </p>
            <p class="text-muted-foreground">
              <strong class="text-foreground font-medium">
                {{ t('help.pitfalls.fnm.symptomLabel') }}
              </strong>
              {{ t('help.pitfalls.fnm.symptom') }}
            </p>
            <p class="text-muted-foreground">
              <strong class="text-foreground font-medium">
                {{ t('help.pitfalls.fnm.causeLabel') }}
              </strong>
              {{ t('help.pitfalls.fnm.cause') }}
            </p>

            <div class="space-y-1.5">
              <p class="text-muted-foreground">
                <strong class="text-foreground font-medium">
                  {{ t('help.pitfalls.fnm.fixLabel') }}
                </strong>
                {{ t('help.pitfalls.fnm.fixIntro') }}
              </p>
              <div class="relative">
                <pre :class="[preCls, 'pr-8']">{{ FNM_SETTINGS_SNIPPET }}</pre>
                <Button
                  size="icon"
                  variant="ghost"
                  class="text-muted-foreground hover:text-foreground absolute top-1.5 right-1.5 size-6"
                  :title="
                    copiedKey === 'fnm' ? t('help.copied') : t('help.copy')
                  "
                  @click="doCopy(FNM_SETTINGS_SNIPPET, 'fnm')"
                >
                  <Check v-if="copiedKey === 'fnm'" class="size-3.5" />
                  <Copy v-else class="size-3.5" />
                </Button>
              </div>
              <p class="text-muted-foreground">
                {{ t('help.pitfalls.fnm.fixNote') }}
              </p>
            </div>

            <div class="space-y-1.5">
              <p class="text-muted-foreground">
                {{ t('help.pitfalls.fnm.aliasIntro') }}
              </p>
              <pre :class="preCls">{{ FNM_ALIAS_CMD }}</pre>
              <p class="text-muted-foreground">
                {{ t('help.pitfalls.fnm.aliasNote') }}
              </p>
            </div>

            <div class="space-y-1.5">
              <p class="text-muted-foreground">
                {{ t('help.pitfalls.fnm.nvmIntro') }}
              </p>
              <pre :class="preCls">{{ NVM_CMD }}</pre>
            </div>

            <div
              class="border-border bg-muted/30 text-muted-foreground flex gap-2 rounded-md border px-3 py-2 leading-relaxed"
            >
              <Info class="mt-0.5 size-3.5 shrink-0" />
              <span>
                <strong class="text-foreground font-medium">
                  {{ t('help.pitfalls.fnm.npxLabel') }}
                </strong>
                {{ t('help.pitfalls.fnm.npxNote') }}
              </span>
            </div>
          </div>
        </section>

        <!-- FAQ -->
        <section class="space-y-1">
          <h2 class="flex items-center gap-2 text-base font-semibold">
            <CircleHelp class="size-4 shrink-0 text-[#D97757]" />
            {{ t('help.faq.title') }}
          </h2>
          <Accordion type="single" collapsible class="w-full">
            <AccordionItem v-for="id in FAQ_IDS" :key="id" :value="id">
              <AccordionTrigger class="py-3 text-left text-sm font-medium">
                {{ t(`help.faq.${id}.q`) }}
              </AccordionTrigger>
              <AccordionContent
                class="text-muted-foreground text-sm leading-relaxed"
              >
                {{ t(`help.faq.${id}.a`) }}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </main>

    <footer
      class="text-muted-foreground/60 shrink-0 px-4 py-1 text-center text-[11px]"
    >
      {{ t('global.copyright') }}
    </footer>
  </div>
</template>
