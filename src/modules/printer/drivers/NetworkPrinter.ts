import { PrinterDriver } from "./PrinterDriver";
import logger from "@/services/logger/Logger";
import { MockPrinter } from "./MockPrinter";

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
    // Check if running inside Electron and printerAPI is exposed
    const printerAPI = (window as any).printerAPI;

    if (printerAPI && typeof printerAPI.printNetwork === "function") {
      logger.info("printer", `Streaming TCP print job to ${this.name} (${this.ip}:${this.port})`);
      try {
        const response = await printerAPI.printNetwork(this.ip, this.port, payload);
        if (response.success) {
          return { success: true };
        } else {
          return { success: false, error: response.error || "Failed to print over network" };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    } else {
      // Browser environment fallback
      logger.warn(
        "printer", 
        `Electron IPC print channel unavailable. Running in browser mode. Redirecting to MockPrinter console logger.`
      );
      return this.fallback.send(payload);
    }
  }
}
