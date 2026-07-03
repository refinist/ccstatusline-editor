<script setup lang="ts">
import { Lightbulb } from '@lucide/vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// Rotating one-liner hints (à la the Claude Code CLI tip line). Each entry is an
// i18n key; the bar cycles through them so power-user shortcuts stay discoverable
// without cluttering the editor.
const TIP_KEYS = [
  'editor.tips.dblclick',
  'editor.tips.activeLine',
  'editor.tips.copyPaste',
  'editor.tips.arrows',
  'editor.tips.del',
  'editor.tips.reorder',
  'editor.tips.terminalResize'
];

const ROTATE_MS = 6000;

// Start on a random tip so a reload doesn't always open on the same one.
const idx = ref(Math.floor(Math.random() * TIP_KEYS.length));
let timer: ReturnType<typeof setInterval> | undefined;

// advance() keeps idx in [0, TIP_KEYS.length) via modulo, so this index is always valid.
const currentTipKey = computed(() => TIP_KEYS[idx.value]!);

function advance() {
  idx.value = (idx.value + 1) % TIP_KEYS.length;
}
function startTimer() {
  timer = setInterval(advance, ROTATE_MS);
}
// Manual click jumps to the next tip (wrapping to the first past the last one)
// and restarts the auto-rotation clock, so it doesn't immediately double-advance.
function onClick() {
  advance();
  if (timer) clearInterval(timer);
  startTimer();
}

onMounted(startTimer);
onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <button
    type="button"
    class="text-muted-foreground/70 hover:text-muted-foreground flex cursor-pointer items-center gap-1.5 px-1 text-[11px] select-none"
    :title="t(currentTipKey)"
    @click="onClick"
  >
    <Lightbulb class="ccse-bulb size-2.5 shrink-0 text-[#D97757]" />
    <Transition
      mode="out-in"
      enter-active-class="transition-opacity duration-300 ease-out"
      leave-active-class="transition-opacity duration-200 ease-in"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <span :key="idx" class="truncate">{{ t(currentTipKey) }}</span>
    </Transition>
  </button>
</template>

<style scoped>
/* The bulb stays permanently lit — a steady Claude-orange (#D97757) glow, no
   animation. Layered drop-shadows (a tight bright core over a soft wide halo)
   read as brighter than a single blur without smearing the small icon. */
.ccse-bulb {
  filter: drop-shadow(0 0 1px rgba(255, 235, 220, 1))
    drop-shadow(0 0 3px rgba(230, 145, 110, 1))
    drop-shadow(0 0 6px rgba(217, 119, 87, 0.9))
    drop-shadow(0 0 12px rgba(217, 119, 87, 0.7));
}
</style>
