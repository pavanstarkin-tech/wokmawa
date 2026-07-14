import { PrinterDriver } from "./PrinterDriver";
import logger from "@/services/logger/Logger";
import { MockPrinter } from "./MockPrinter";

const EMULATOR_HOST = "127.0.0.1";
const EMULATOR_PORT = 9100;

export class NetworkPrinter implements PrinterDriver {
  private ip: string;
  private port: number;
  private name: string;
  private fallback: MockPrinter;

  constructor(name: string, ip: string, port = 9100) {
    this.name = name;
    this.ip = ip;
    this.port = port;
    this.fallback = new MockPrinter(name);
  }

  public async send(payload: Uint8Array): Promise<{ success: boolean; error?: string }> {
    // 1. Electron native TCP path
    const printerAPI = (window as any).printerAPI;
    if (printerAPI && typeof printerAPI.printNetwork === "function") {
      logger.info("printer", `Streaming TCP print job to ${this.name} (${this.ip}:${this.port})`);
      try {
        const response = await printerAPI.printNetwork(this.ip, this.port, payload);
        if (response.success) return { success: true };
        return { success: false, error: response.error || "Failed to print over network" };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // 2. Browser environment — relay to local Python ESC/POS emulator via /api/print-relay
    logger.warn(
      "printer",
      `Electron IPC unavailable. Attempting relay to local ESC/POS emulator at ${EMULATOR_HOST}:${EMULATOR_PORT}`
    );
    try {
      const response = await fetch("/api/print-relay", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: payload
      });
      if (response.ok) {
        logger.info("printer", "Print job successfully relayed to local ESC/POS emulator.");
        return { success: true };
      }
      throw new Error(`Relay responded with HTTP ${response.status}`);
    } catch (err: any) {
      logger.warn("printer", `Relay to emulator failed (${err.message}). Falling back to MockPrinter console logger.`);
      return this.fallback.send(payload);
    }
  }
}
