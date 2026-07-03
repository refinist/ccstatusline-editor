import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CcStatusConfig } from '@/widgets';

// One-shot hand-off for "apply this template" (TemplatesPage → EditorPage via
// router.replace): the config is stashed here just long enough to survive the
// route change, then taken (read + cleared) once by the editor on mount.
export const usePendingTemplateStore = defineStore('pendingTemplate', () => {
  const config = ref<CcStatusConfig | null>(null);

  function set(next: CcStatusConfig) {
    config.value = next;
  }

  /** Read and clear in one step, so a later remount never re-applies it. */
  function take(): CcStatusConfig | null {
    const value = config.value;
    config.value = null;
    return value;
  }

  return { config, set, take };
});
