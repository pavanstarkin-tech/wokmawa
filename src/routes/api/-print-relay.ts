// @ts-ignore
import { createAPIFileRoute } from "@tanstack/react-start/api";
import * as net from "net";

const EMULATOR_HOST = "127.0.0.1";
const EMULATOR_PORT = 9100;

/**
 * POST /api/print-relay
 *
 * Bridges the browser (which cannot open raw TCP sockets) to the local
 * Python ESC/POS emulator listening on port 9100.
 *
 * The request body should be a raw binary application/octet-stream payload
 * containing ESC/POS byte commands.
 */
export const APIRoute = createAPIFileRoute("/api/print-relay")({
  POST: async ({ request }: any) => {
    try {
      const arrayBuffer = await request.arrayBuffer();
      const payload = Buffer.from(arrayBuffer);

      await new Promise<void>((resolve, reject) => {
        const socket = new net.Socket();
        const timeout = 3000; // 3 second timeout

        socket.setTimeout(timeout);

        socket.connect(EMULATOR_PORT, EMULATOR_HOST, () => {
          socket.write(payload, (err) => {
            if (err) {
              socket.destroy();
              reject(err);
            } else {
              socket.end();
              resolve();
            }
          });
        });

        socket.on("timeout", () => {
          socket.destroy();
          reject(new Error(`Connection to ESC/POS emulator timed out after ${timeout}ms`));
        });

        socket.on("error", (err) => {
          socket.destroy();
          reject(err);
        });
      });

      return new Response(
        JSON.stringify({ success: true, message: "Print job relayed to ESC/POS emulator." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (err: any) {
      console.error("[print-relay] Failed to relay print job:", err.message);
      return new Response(
        JSON.stringify({ success: false, error: err.message }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  OPTIONS: async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  },
});
