import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        // Uncomment to auto-inject shared variables/mixins into every SCSS file:
        // additionalData: `@use "@css/variables" as *;`,
      },
    },
  },

  resolve: {
    alias: {
      '@js':  resolve(__dirname, 'src/js'),
      '@css': resolve(__dirname, 'src/css'),
    },
  },

  build: {
    outDir:      'dist',
    emptyOutDir: true,
    sourcemap:   true,
    assetsInlineLimit: 0,

    lib: {
      entry:   resolve(__dirname, 'src/js/main.js'),
      name:    'BlockEditor',
      formats: ['es', 'umd'],
      fileName: (format) =>
        format === 'es' ? 'block-forge.js' : `block-forge.${format}.js`,
    },

    rollupOptions: {
      external: [],

      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name === 'style.css' ? 'block-forge.css' : assetInfo.name,

        footer: `
if (typeof window !== "undefined" && window.BlockEditor && window.BlockEditor.default) {
  window.BlockEditor = window.BlockEditor.default;
}`,
      },
    },
  },
});