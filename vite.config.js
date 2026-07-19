import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    // Keep -webkit-backdrop-filter in the minified CSS: Safari only supports
    // the unprefixed property from 18 on, and the default target lets the
    // minifier strip the prefixed fallback (nav/drawer blur vanished on iOS)
    cssTarget: 'safari15',
  },
  server: {
    port: 3000,
  },
});