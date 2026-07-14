import { PrinterDriver } from "./PrinterDriver";
import logger from "@/services/logger/Logger";
import { MockPrinter } from "./MockPrinter";

export class OSPrinter implements PrinterDriver {
  private printerName: string;
  private name: string;
  private fallback: MockPrinter;

  constructor(name: string, printerName: string) {
    this.name = name;
    this.printerName = printerName;
    this.fallback = new MockPrinter(name);
  }

  public async send(payload: Uint8Array): Promise<{ success: boolean; error?: string }> {
    const printerAPI = (window as any).printerAPI;

    if (printerAPI && typeof printerAPI.printRaw === "function") {
      logger.info("printer", `Spooling raw ESC/POS job to Windows printer: "${this.printerName}"`);
      try {
        const response = await printerAPI.printRaw(this.printerName, payload);
        if (response.success) {
          return { success: true };
        } else {
          return { success: false, error: response.error || "Failed to send job to Windows print spooler" };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    } else {
      logger.warn(
        "printer",
        `Electron OS print channel unavailable (running in browser). Falling back to MockPrinter console logger.`
      );
      return this.fallback.send(payload);
    }
  }
}
