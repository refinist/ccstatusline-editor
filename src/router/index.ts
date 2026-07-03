import { createRouter, createWebHistory } from 'vue-router';

// History mode: clean URLs (no `#`). The host needs to fall back to index.html
// for unknown paths (e.g. a hard refresh on /templates) — see deploy config.
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'editor',
      component: () => import('@/pages/EditorPage.vue')
    },
    {
      path: '/templates',
      name: 'templates',
      component: () => import('@/pages/TemplatesPage.vue')
    },
    {
      path: '/help',
      name: 'help',
      component: () => import('@/pages/HelpPage.vue')
    }
  ]
});
