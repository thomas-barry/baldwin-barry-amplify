import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import path from 'path';
import { defineConfig } from 'vite';
import lightningcss from 'vite-plugin-lightningcss';

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
    lightningcss({
      targets: browserslistToTargets(browserslist('>= 0.25%')),
      minify: true,
    }),
  ],
  resolve: {
    alias: {
      '@/components': path.resolve(__dirname, './src/components'),
      '@/modules': path.resolve(__dirname, './src/modules'),
      '@/context': path.resolve(__dirname, './src/context'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/assets': path.resolve(__dirname, './src/assets'),
      '@/routes': path.resolve(__dirname, './src/routes'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
