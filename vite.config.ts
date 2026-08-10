// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      // Lovable stores large media outside the repo — src/assets/*.asset.json are
      // pointers to /__l5e/ paths that only Lovable's infrastructure serves, so
      // they 404 locally and the landing page renders without its videos.
      // Proxying to production makes local match the deployed site.
      // Dev-only: Vite ignores server.proxy when building.
      proxy: {
        "/__l5e": {
          target: "https://grainhero.app",
          changeOrigin: true,
        },
      },
    },
    optimizeDeps: {
      include: ["tesseract.js"],
    },
    build: {
      rollupOptions: {
        external: [],
      },
    },
  },
});
