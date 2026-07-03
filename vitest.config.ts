import path from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// Separate test config: reuses the `@` alias + vue() plugin (TerminalPreview's SSR
// smoke test needs .vue compilation), without loading tailwindcss(). Logic unit
// tests and SSR renderToString both run fine in the node environment; add
// environment: 'happy-dom' + @vue/test-utils later if mounting interactive
// components becomes necessary.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
});
