import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  // host: true → listen on 0.0.0.0 (all interfaces), so it's reachable from phones and
  // other devices on the same LAN via the local IP; Vite also prints
  // Network: http://<local-ip>:5173/ on startup.
  server: {
    host: true,
    // Proxy /api/* to `wrangler dev` (local Worker + KV emulation, port 8787), so the
    // share endpoints also work directly within `pnpm dev`'s hot-reload flow.
    // Must use the object form: the string shorthand is equivalent to
    // changeOrigin:true (which rewrites Host to 8787), but the worker's write
    // endpoints validate that Origin matches the request Host, so Host must be
    // passed through unchanged (kept at 5173) to match the Origin sent by the
    // browser.
    proxy: {
      '/api': {
        target: 'http://localhost:8787'
      }
    }
  },
  preview: {
    host: true
  }
});
