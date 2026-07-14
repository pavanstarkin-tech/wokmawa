// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Disable SSR to output a pure static SPA with an index.html file for Hostinger.
    ssr: false,
    server: { entry: "server" },
  },
  nitro: {
    preset: "node-server"
  },
  vite: {
    base: "./",
    server: {
      port: 8081,
      strictPort: true,
      proxy: {
        // In dev, proxy /api/create-order.php → Razorpay and inject auth header
        // In prod, Hostinger runs the real PHP file which adds auth itself
        "/api/create-order.php": {
          target: "https://api.razorpay.com",
          changeOrigin: true,
          rewrite: () => "/v1/orders",
          headers: {
            "Authorization": `Basic ${Buffer.from("rzp_live_StBUehIpeULYuL:M76UWnmNsVE7hU5QrkriZuor").toString("base64")}`,
          },
        },
      },
    },
  },
});
