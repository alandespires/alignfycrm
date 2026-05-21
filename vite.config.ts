// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";

const shim = fileURLToPath(new URL("./src/lib/lucide-react-shim.cjs", import.meta.url));

export default defineConfig({
  vite: {
    resolve: {
      alias: [
        { find: /^lucide-react$/, replacement: shim },
      ],
    },
  },
});
