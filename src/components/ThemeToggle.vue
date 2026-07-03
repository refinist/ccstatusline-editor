<script setup lang="ts">
import { useColorMode } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import ThemeToggleIcon from '@/components/icons/ThemeToggleIcon.vue';
import { Button } from '@/components/ui/button';

// Resolved appearance only (no "system" option) — clicking always flips
// between an explicit light/dark preference, persisted in localStorage.
// Defaults to dark (not the OS preference) until the user picks otherwise.
const mode = useColorMode({
  attribute: 'class',
  selector: 'html',
  modes: { light: '', dark: 'dark' },
  storageKey: 'ccse-color-mode',
  initialValue: 'dark'
});

const { t } = useI18n();

function toggle() {
  mode.value = mode.value === 'dark' ? 'light' : 'dark';
}
</script>

<template>
  <Button
    variant="ghost"
    size="icon-sm"
    class="text-muted-foreground shadow-none"
    :title="t('theme.label')"
    @click="toggle"
  >
    <ThemeToggleIcon class="size-4" />
    <span class="sr-only">{{ t('theme.label') }}</span>
  </Button>
</template>
