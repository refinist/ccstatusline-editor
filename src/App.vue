<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner';
</script>

<template>
  <!-- Copyright isn't in a global footer — that would span the full width and shrink
       the editor's side panels. Each page renders it itself (bottom of the middle
       column on the editor page, page footer on the templates page). -->
  <div class="h-full overflow-auto">
    <RouterView />
  </div>
  <Toaster position="top-center" :duration="2000" rich-colors />
</template>
