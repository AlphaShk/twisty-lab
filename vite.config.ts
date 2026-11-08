/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { thirdPartyLicenses } from './scripts/third-party-licenses.mjs';

export default defineConfig({
  plugins: [react(), thirdPartyLicenses()],
  // Relative asset URLs work both from file:// in Electron and under /twisty-lab/ on GitHub Pages.
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    // cubing.js ships its three.js-based 3D renderer as one lazily loaded ~510 kB chunk.
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
