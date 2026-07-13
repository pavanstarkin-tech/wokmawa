import { PrinterDriver } from "./PrinterDriver";
import logger from "@/services/logger/Logger";

export class MockPrinter implements PrinterDriver {
  private printerName: string;

  constructor(name: string) {
    this.printerName = name;
  }

  public async send(payload: Uint8Array): Promise<{ success: boolean; error?: string }> {
    // Convert bytes back to readable text where possible for console display
    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(payload).replace(/[\x00-\x1F]/g, ""); // Strip binary codes

    logger.info("printer", `[MOCK PRINT - ${this.printerName}]`, {
      byteLength: payload.length,
      previewText: text.substring(0, 100) + (text.length > 100 ? "..." : "")
    });

    return { success: true };
  }
}
