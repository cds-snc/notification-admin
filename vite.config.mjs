import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        index: './app/assets/stylesheets/tailwind/style.css',
        tooltip: './app/assets/javascripts/tiptap/tooltip.css',
        editor: './app/assets/javascripts/tiptap/editor.css',
      },
      output: {
        dir: '.',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'app/static/stylesheets/index.css';
          if (assetInfo.name === 'tooltip.css') return 'app/assets/javascripts/tiptap/tooltip.compiled.css';
          if (assetInfo.name === 'editor.css') return 'app/assets/javascripts/tiptap/editor.compiled.css';
          return 'app/static/stylesheets/[name].[ext]';
        },
      },
    },
    minify: true,
  },
})