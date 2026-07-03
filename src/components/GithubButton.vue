<script setup lang="ts">
import { onMounted, ref } from 'vue';
import GithubIcon from '@/components/icons/GithubIcon.vue';
import { Button } from '@/components/ui/button';

const REPO = 'refinist/ccstatusline-editor';
const REPO_URL = `https://github.com/${REPO}`;

// Star count is a nice-to-have — any fetch failure (offline, rate-limited)
// just leaves the button showing the icon on its own. Kept as a number (not
// a pre-formatted string) so a genuine 0 still renders instead of being
// treated as "no count yet".
const stars = ref<number | null>(null);

function formatStars(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}

onMounted(async () => {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`);
    if (!res.ok) return;
    const data = await res.json();
    if (typeof data.stargazers_count === 'number')
      stars.value = data.stargazers_count;
  } catch {
    // ignore
  }
});
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
    <span v-if="stars !== null" class="w-8 text-xs tabular-nums">
      {{ formatStars(stars) }}
    </span>
    <span class="sr-only">GitHub</span>
  </Button>
</template>
