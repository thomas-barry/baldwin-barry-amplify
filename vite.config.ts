import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import lightningcss from 'vite-plugin-lightningcss';
import { browserslistToTargets } from 'lightningcss';
import browserslist from 'browserslist';

export default defineConfig({
  plugins: [
    react(),
    lightningcss({
      targets: browserslistToTargets(browserslist('>= 0.25%')),
      minify: true,
    }),
  ],
});
