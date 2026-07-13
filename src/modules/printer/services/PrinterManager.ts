import localDb from "@/services/database/localDb";
import logger from "@/services/logger/Logger";
import { PrinterConfig, PrintJob } from "../types";
import { PrinterDriver } from "../drivers/PrinterDriver";
import { NetworkPrinter } from "../drivers/NetworkPrinter";
import { USBPrinter } from "../drivers/USBPrinter";
import { BluetoothPrinter } from "../drivers/BluetoothPrinter";
import { MockPrinter } from "../drivers/MockPrinter";

import { ReceiptTemplate, ReceiptData } from "@/templates/Receipt";
import { KOTTemplate, KOTData } from "@/templates/KOT";
import { DailyClosingTemplate, DailyClosingData } from "@/templates/DailyClosing";
import { TestReceiptTemplate } from "@/templates/TestReceipt";

class PrinterManager {
  private printers: PrinterConfig[] = [];

  constructor() {
    this.loadPrinters();
  }

  public loadPrinters() {
    try {
      this.printers = localDb.getTable("printers") || [];
      if (this.printers.length === 0) {
        // Seed a default mock printer and network billing printer
        const defaultPrinters: PrinterConfig[] = [
          {
            id: "billing_printer_default",
            name: "Main Billing Printer",
            type: "mock",
            role: "billing",
            paperWidth: "80mm",
            autoCut: true,
            branchId: "MAIN_BRANCH"
          },
          {
            id: "kitchen_printer_default",
            name: "Kitchen KOT Printer",
            type: "lan",
            ip: "192.168.1.200",
            port: 9100,
            role: "kitchen",
            paperWidth: "80mm",
            autoCut: true,
            branchId: "MAIN_BRANCH"
          }
        ];
        localDb.setTable("printers", defaultPrinters);
        this.printers = defaultPrinters;
      }
    } catch (e) {
      logger.error("printer", "Failed to load printers from local database", e);
      this.printers = [];
    }
  }

  public getPrinters(): PrinterConfig[] {
    this.loadPrinters();
    return this.printers;
  }

  public addPrinter(printer: Omit<PrinterConfig, "id">): PrinterConfig {
    const saved = localDb.insertRecord("printers", printer) as PrinterConfig;
    this.loadPrinters();
    return saved;
  }

  public updatePrinter(id: string, updates: Partial<PrinterConfig>) {
    localDb.updateRecord("printers", id, updates);
    this.loadPrinters();
  }

  public deletePrinter(id: string) {
    localDb.deleteRecord("printers", id);
    this.loadPrinters();
  }

  private getDriver(config: PrinterConfig): PrinterDriver {
    switch (config.type) {
      case "lan":
        return new NetworkPrinter(config.name, config.ip || "127.0.0.1", config.port || 9100);
      case "usb":
        return new USBPrinter(config.name);
      case "bluetooth":
        return new BluetoothPrinter(config.name);
      case "mock":
      default:
        return new MockPrinter(config.name);
    }
  }

  // --- Print Operations ---

  public async printReceipt(receiptData: ReceiptData): Promise<boolean> {
    this.loadPrinters();
    const billingPrinters = this.printers.filter((p) => p.role === "billing");
    
    if (billingPrinters.length === 0) {
      logger.warn("printer", "No billing printers configured. Printing to mock console.");
      const mockDriver = new MockPrinter("System Fallback");
      const bytes = ReceiptTemplate(receiptData, "80mm").getBytes();
      await mockDriver.send(bytes);
      return true;
    }

    let success = true;
    for (const pr of billingPrinters) {
      try {
        const driver = this.getDriver(pr);
        const bytes = ReceiptTemplate(receiptData, pr.paperWidth).getBytes();
        const res = await driver.send(bytes);
        if (!res.success) {
          success = false;
          logger.error("printer", `Failed printing receipt to: ${pr.name} - ${res.error}`);
        }
      } catch (err: any) {
        success = false;
        logger.error("printer", `Crash during receipt printing to: ${pr.name}`, err);
      }
    }
    return success;
  }

  public async printKOT(kotData: KOTData): Promise<boolean> {
    this.loadPrinters();
    const kitchenPrinters = this.printers.filter((p) => p.role === "kitchen");

    if (kitchenPrinters.length === 0) {
      logger.warn("printer", "No kitchen KOT printers configured. Printing to mock console.");
      const mockDriver = new MockPrinter("Kitchen Fallback");
      const bytes = KOTTemplate(kotData, "80mm").getBytes();
      await mockDriver.send(bytes);
      return true;
    }

    let success = true;
    for (const pr of kitchenPrinters) {
      try {
        const driver = this.getDriver(pr);
        const bytes = KOTTemplate(kotData, pr.paperWidth).getBytes();
        const res = await driver.send(bytes);
        if (!res.success) {
          success = false;
          logger.error("printer", `Failed printing KOT to: ${pr.name} - ${res.error}`);
        }
      } catch (err: any) {
        success = false;
        logger.error("printer", `Crash during KOT printing to: ${pr.name}`, err);
      }
    }
    return success;
  }

  public async printDailyClosing(closingData: DailyClosingData): Promise<boolean> {
    this.loadPrinters();
    const billingPrinters = this.printers.filter((p) => p.role === "billing");
    const target = billingPrinters.length > 0 ? billingPrinters[0] : null;

    if (!target) {
      const mockDriver = new MockPrinter("Closing Fallback");
      const bytes = DailyClosingTemplate(closingData, "80mm").getBytes();
      await mockDriver.send(bytes);
      return true;
    }

    try {
      const driver = this.getDriver(target);
      const bytes = DailyClosingTemplate(closingData, target.paperWidth).getBytes();
      const res = await driver.send(bytes);
      return res.success;
    } catch (err: any) {
      logger.error("printer", `Failed daily closing print to ${target.name}`, err);
      return false;
    }
  }

  public async printTest(printerId: string): Promise<{ success: boolean; error?: string }> {
    this.loadPrinters();
    const pr = this.printers.find((p) => p.id === printerId);
    if (!pr) {
      return { success: false, error: "Printer config not found" };
    }

    try {
      const driver = this.getDriver(pr);
      const bytes = TestReceiptTemplate(pr.paperWidth).getBytes();
      return await driver.send(bytes);
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const printerManager = new PrinterManager();
export default printerManager;
