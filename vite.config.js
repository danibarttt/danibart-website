import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import staticPagesDev from './src/static-pages-dev.mjs';

export default defineConfig({
  // staticPagesDev only applies to `vite` (serve): it makes the /p/ and /s/
  // pages, a post-build step in production, work in dev too.
  plugins: [react(), staticPagesDev()],
  base: '/',
  build: {
    // Both backdrop-filter forms must reach production: Safari ≤17 only
    // understands -webkit-backdrop-filter, Chrome/Firefox only the unprefixed
    // one. Vite 8's CSS minifier (lightningcss) collapses the pair into a
    // single form whatever the targets — with the default target it kept only
    // the unprefixed one (blur gone on iOS), with a safari target only the
    // -webkit- one (blur gone on Chrome/Android). CSS minification is
    // disabled to keep both; gzip covers most of the size difference.
    cssMinify: false,
    cssTarget: ['chrome87', 'firefox78', 'safari15'],
  },
  server: {
    port: 3000,
  },
});