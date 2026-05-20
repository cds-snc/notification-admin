/**
 * Builds the individually-loaded legacy JS files (per-page scripts).
 *
 * These files are standalone jQuery-based scripts that don't need bundling —
 * they rely on window.$ set by all.min.js and are loaded as classic <script>
 * tags on specific pages. We use Vite's lib mode to produce one minified IIFE
 * per file, mirroring what Gulp's minifyIndividualJs() task previously did.
 */

import { build } from "vite";
import inject from "@rollup/plugin-inject";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const files = [
  "branding_request",
  "contactGaTracking",
  "formValidateRequired",
  "sessionRedirect",
  "touDialog",
  "templateFilters",
];

for (const name of files) {
  await build({
    configFile: false,
    logLevel: "warn",
    build: {
      lib: {
        entry: path.resolve(root, `app/assets/javascripts/${name}.js`),
        name,
        formats: ["iife"],
        fileName: () => `${name}.min.js`,
      },
      outDir: path.resolve(root, "app/static/javascripts"),
      emptyOutDir: false,
      minify: true,
    },
    plugins: [
      inject({
        $: ["jquery", "default"],
        jQuery: ["jquery", "default"],
        accessibleAutocomplete: ["accessible-autocomplete", "default"],
      }),
    ],
  });
}

console.log(`✓ Built ${files.length} individual legacy files`);
