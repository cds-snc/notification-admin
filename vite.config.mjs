import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  build: {
    outDir: 'app/static/stylesheets',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        index: './app/assets/stylesheets/tailwind/style.css',
        tooltip: './app/assets/javascripts/tiptap/tooltip.css',
        editor: './app/assets/javascripts/tiptap/editor.css',
      },
      output: {
        assetFileNames: '[name].[ext]',
      },
    },
    minify: true,
  },
})
