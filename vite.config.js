import { defineConfig } from 'vite';

// Use relative asset paths so the app works from GitHub Pages, local previews,
// and any static subdirectory without hardcoding the repository name.
export default defineConfig({
  base: './',
});
