import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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