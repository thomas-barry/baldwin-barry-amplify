import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import path from 'path';
import { defineConfig } from 'vite';

/**
 * Vite 8 raised the default JS target to Chrome 111 / Edge 111 / Firefox 114 /
 * Safari 16.4, which is *newer* than .browserslistrc resolves to (Chrome 109).
 * Left on the default, the bundle would ship JS syntax that browsers the CSS is
 * still being compiled for cannot parse. Derive the JS target from the same
 * browserslist source the CSS already uses so the two cannot drift apart.
 */
const BROWSERSLIST_TO_TARGET: Record<string, string> = {
  chrome: 'chrome',
  edge: 'edge',
  firefox: 'firefox',
  safari: 'safari',
  ios_saf: 'ios',
  opera: 'opera',
};

function browserslistToJsTargets(queries: string[]): string[] {
  const minimums = new Map<string, number>();
  for (const query of queries) {
    const [browser, versionRange] = query.split(' ');
    const target = BROWSERSLIST_TO_TARGET[browser];
    if (!target || !versionRange) continue;
    // Ranges arrive as "16.6-16.7"; the low end is the one we must support.
    const version = Number.parseFloat(versionRange.split('-')[0]);
    if (!Number.isFinite(version)) continue;
    const current = minimums.get(target);
    if (current === undefined || version < current) minimums.set(target, version);
  }
  return [...minimums].map(([target, version]) => `${target}${version}`);
}

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
  server: {
    host: true,
    allowedHosts: ['.local'],
  },
  build: {
    target: browserslistToJsTargets(browserslist()),
  },
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: browserslistToTargets(browserslist()),
    },
  },
  optimizeDeps: {
    include: ['react-image-gallery'],
  },
  resolve: {
    alias: {
      '@/components': path.resolve(import.meta.dirname, './src/components'),
      '@/modules': path.resolve(import.meta.dirname, './src/modules'),
      '@/context': path.resolve(import.meta.dirname, './src/context'),
      '@/lib': path.resolve(import.meta.dirname, './src/lib'),
      '@/assets': path.resolve(import.meta.dirname, './src/assets'),
      '@/routes': path.resolve(import.meta.dirname, './src/routes'),
      '@': path.resolve(import.meta.dirname, './src'),
      '@/schema': path.resolve(import.meta.dirname, './amplify/data/resource'),
    },
  },
});
