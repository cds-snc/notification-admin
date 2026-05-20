import { defineConfig } from "vite";
import inject from "@rollup/plugin-inject";
import path from "path";

/**
 * Vite config for the legacy IIFE bundle (all.min.js).
 *
 * This is a single-entry build so Rolldown's IIFE format restriction
 * (no code splitting with multiple inputs) is not an issue.
 *
 * Individual legacy files (branding_request, sessionRedirect, etc.) are
 * built separately by scripts/build-legacy-individual.mjs.
 *
 * See vite.config.js for the modern React/ES module entries.
 */
export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, "app/static"),
    emptyOutDir: false,

    rollupOptions: {
      input: {
        all: path.resolve(__dirname, "app/assets/javascripts/all.js"),
      },

      output: {
        format: "iife",
        entryFileNames: "javascripts/[name].min.js",
      },
    },
  },

  plugins: [
    inject({
      $: ["jquery", "default"],
      jQuery: ["jquery", "default"],
      accessibleAutocomplete: ["accessible-autocomplete", "default"],
    }),
  ],

  resolve: {
    alias: {
      govuk_frontend_toolkit: path.resolve(__dirname, "node_modules/govuk_frontend_toolkit"),
    },
  },
});

