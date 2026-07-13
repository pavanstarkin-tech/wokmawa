import { PrinterDriver } from "./PrinterDriver";
import logger from "@/services/logger/Logger";
import { MockPrinter } from "./MockPrinter";

export class BluetoothPrinter implements PrinterDriver {
  private name: string;
  private fallback: MockPrinter;

  constructor(name: string) {
    this.name = name;
    this.fallback = new MockPrinter(name);
  }

  public async send(payload: Uint8Array): Promise<{ success: boolean; error?: string }> {
    logger.warn("printer", `Bluetooth printer support triggered for: ${this.name} (Future RFCOMM serial bridge)`);
    return this.fallback.send(payload);
  }
}
