import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { transformSync } from "@babel/core";
import path from "path";

/**
 * Vite 8 uses OXC which only parses JSX in .jsx/.tsx files. Our React
 * source files use .js extensions, so we run Babel with preset-react as a
 * pre-enforce plugin before OXC ever sees the code.
 */
function jsxInJsFiles() {
  return {
    name: "jsx-in-js-files",
    enforce: "pre",
    transform(code, id) {
      if (id.includes("node_modules")) return null;
      if (!/\/app\/assets\/javascripts\/.+\.js$/.test(id)) return null;
      // Quick guard — skip files that clearly contain no JSX
      if (!code.includes("<")) return null;

      const result = transformSync(code, {
        filename: id,
        presets: [["@babel/preset-react", { runtime: "classic" }]],
        configFile: false,
        babelrc: false,
        sourceMaps: true,
      });

      if (!result) return null;
      return { code: result.code, map: result.map };
    },
  };
}

/**
 * Vite config for modern React/ES module entries.
 *
 * index.js, scheduler.js, and tiptap/editor.js are all proper ES modules.
 * Each bundles its own copy of React — no shared vendor chunk needed since
 * the browser's module system deduplicates across <script type="module"> tags.
 *
 * See vite.legacy.config.js for the IIFE legacy (jQuery) bundle.
 */
export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, "app/static"),
    emptyOutDir: false, // don't wipe app/static/images etc.

    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "app/assets/javascripts/index.js"),
        scheduler: path.resolve(__dirname, "app/assets/javascripts/scheduler/scheduler.js"),
        tiptap: path.resolve(__dirname, "app/assets/javascripts/tiptap/editor.js"),
      },

      output: {
        format: "es",
        // Fixed filenames — no content hashes — so AssetFingerprinter works unchanged
        entryFileNames: "javascripts/[name].min.js",
        chunkFileNames: "javascripts/[name].min.js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },

  plugins: [
    jsxInJsFiles(),
    react(),

    // Copy images from toolkit and app/assets during build
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/govuk_frontend_toolkit/images/*",
          dest: "images",
        },
        {
          src: "app/assets/images/**/*",
          dest: "images",
        },
      ],
    }),
  ],

  // Dev server settings for HMR mode (VITE_DEV_SERVER=True)
  server: {
    port: 5173,
    host: "0.0.0.0",
    cors: true,
    hmr: {
      protocol: "ws",
      host: "localhost",
    },
  },

  resolve: {
    alias: {
      govuk_frontend_toolkit: path.resolve(__dirname, "node_modules/govuk_frontend_toolkit"),
    },
  },
});

