<script setup lang="ts">
import { Check, Languages } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { LOCALES, setLocale, type Locale } from '@/i18n';

const { locale } = useI18n();
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="sm"
        class="text-muted-foreground h-7 w-7 px-0"
      >
        <Languages class="size-3.5" />
        <span class="sr-only">Language</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-[140px]">
      <DropdownMenuItem
        v-for="l in LOCALES"
        :key="l.code"
        class="gap-2 text-xs"
        @click="setLocale(l.code as Locale)"
      >
        <span class="flex-1">{{ l.label }}</span>
        <Check v-if="locale === l.code" class="text-muted-foreground size-3" />
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
