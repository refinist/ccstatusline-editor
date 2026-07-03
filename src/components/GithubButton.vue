<script setup lang="ts">
import GithubIcon from '@/components/icons/GithubIcon.vue';
import { Button } from '@/components/ui/button';

const REPO_URL = 'https://github.com/refinist/ccstatusline-editor';
</script>

<template>
  <Button
    as="a"
    :href="REPO_URL"
    target="_blank"
    rel="noopener noreferrer"
    variant="ghost"
    size="sm"
    class="text-muted-foreground h-8 gap-1.5 px-3 shadow-none"
    title="GitHub"
  >
    <GithubIcon class="size-3.5" />
    <span class="sr-only">GitHub</span>
  </Button>
</template>
