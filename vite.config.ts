// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import * as net from "net";
import type { Plugin } from "vite";

/**
 * Vite dev-server middleware that bridges browser fetch() → raw TCP socket
 * for the local Python ESC/POS emulator on port 9100.
 * Browsers cannot open raw TCP sockets, so we relay through this Node.js handler.
 */
function printRelayPlugin(): Plugin {
  return {
    name: "paakashala-print-relay",
    configureServer(server) {
      server.middlewares.use("/api/print-relay", (req: any, res: any) => {
        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          });
          res.end();
          return;
        }

        if (req.method !== "POST") {
          res.writeHead(405);
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => {
          const payload = Buffer.concat(chunks);

          const socket = new net.Socket();
          socket.setTimeout(3000);

          socket.connect(9100, "127.0.0.1", () => {
            socket.write(payload, (writeErr) => {
              if (writeErr) {
                socket.destroy();
                res.writeHead(502, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: writeErr.message }));
                return;
              }
              socket.end();
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: true, message: "Print job relayed to ESC/POS emulator." }));
            });
          });

          socket.on("timeout", () => {
            socket.destroy();
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: "Connection to ESC/POS emulator timed out. Is python escpos_emulator.py running?" }));
          });

          socket.on("error", (err) => {
            socket.destroy();
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: err.message }));
          });
        });
      });
    },
  };
}

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
    plugins: [printRelayPlugin()],
    server: {
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
