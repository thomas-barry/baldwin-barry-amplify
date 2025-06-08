import react from '@vitejs/plugin-react';
import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { defineConfig } from 'vite';
import lightningcss from 'vite-plugin-lightningcss';

export default defineConfig({
  plugins: [
    react(),
    lightningcss({
      targets: browserslistToTargets(browserslist('>= 0.25%')),
      minify: true,
    }),
  ],
});
