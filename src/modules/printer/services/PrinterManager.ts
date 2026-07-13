import { printerRepository } from "../repository/PrinterRepository";
import { printerQueue } from "./PrinterQueue";
import { printerMonitor } from "./PrinterMonitor";
import { receiptRenderer } from "./ReceiptRenderer";
import { ReceiptValidator } from "./ReceiptValidator";
import { receiptDocument, ReceiptBillData } from "../templates/ReceiptDocument";
import { kotDocument, KOTData } from "../templates/KOTDocument";
import { dailyClosingDocument, DailyClosingData } from "../templates/DailyClosingDocument";
import { testDocument } from "../templates/TestDocument";
import { PrinterConfig } from "../types/types";
import logger from "@/services/logger/Logger";

class PrinterManager {
  /**
   * Retrieves all printers from the repository.
   */
  public getPrinters(): PrinterConfig[] {
    return printerRepository.getPrinters();
  }

  public addPrinter(config: Omit<PrinterConfig, "id">): void {
    const printer: PrinterConfig = {
      ...config,
      id: `pr_${Date.now()}`
    } as any;
    printerRepository.savePrinter(printer);
  }

  public deletePrinter(id: string): void {
    printerRepository.deletePrinter(id);
  }

  /**
   * High-fidelity checkout receipt printing flow.
   * Compiles the receipt model, runs validation, renders it, and queues it.
   */
  public async printReceipt(data: any): Promise<boolean> {
    logger.info("printer", `Receipt print request initiated for bill: ${data.billNumber}`);
    
    // Find active billing printers
    const printers = printerRepository.getPrinters().filter(p => p.enabled && p.role === "billing");
    if (printers.length === 0) {
      logger.warn("printer", "No billing printers configured or enabled. Print job aborted.");
      return false;
    }

    let success = true;
    for (const pr of printers) {
      try {
        // Compile intermediate model
        const logoPath = pr.profile.logoEnabled ? pr.profile.logoPath : undefined;
        const documentData: ReceiptBillData = {
          ...data,
          logoPath,
          gstin: data.gstin || "29AAAAA0000A1Z5", // Default Indian GSTIN format
          restaurantName: "PAAKASHALA"
        };
        
        const docModel = receiptDocument.build(documentData, pr.profile.logoPath ? 2 : 1);

        // Run validation
        const valRes = ReceiptValidator.validate(docModel);
        if (!valRes.valid) {
          logger.error("printer", `Receipt validation failed: ${valRes.errors?.join(", ")}`);
          success = false;
          continue;
        }

        // Render ESC/POS binary payload
        const bytes = await receiptRenderer.render(docModel, pr.profile);

        // Enqueue job with Priority 1 (Billing)
        const jobId = await printerQueue.enqueueJob(pr.id, "receipt", bytes, 1);
        if (jobId === "skipped") {
          logger.info("printer", `Receipt job skipped due to idempotency verification.`);
        }
      } catch (err: any) {
        logger.error("printer", `Crash during receipt compilation for printer ${pr.name}`, err);
        success = false;
      }
    }

    return success;
  }

  /**
   * Kitchen KOT printing flow.
   * Routes the print job to printers mapped to the ordered items' categories.
   */
  public async printKOT(data: any): Promise<boolean> {
    logger.info("printer", `KOT print request initiated for Table ${data.tableId}`);
    
    // Determine target printers based on category mappings
    const mappings = printerRepository.getCategoryMappings();
    const targetPrinterIds = new Set<string>();

    const items = data.items || [];
    items.forEach((item: any) => {
      // Find printer mapping for this category
      const mappedPrinters = mappings[item.category] || [];
      mappedPrinters.forEach(id => targetPrinterIds.add(id));
    });

    // If no category-specific printers are mapped, fall back to KOT/Kitchen printers
    if (targetPrinterIds.size === 0) {
      const kitchenPrinters = printerRepository.getPrinters().filter(p => p.enabled && p.role === "kitchen");
      kitchenPrinters.forEach(p => targetPrinterIds.add(p.id));
    }

    if (targetPrinterIds.size === 0) {
      logger.warn("printer", "No target printers discovered for KOT routing. Printing to default mock console.");
      // Fallback mock
      const mockPrinters = printerRepository.getPrinters().filter(p => p.type === "mock");
      if (mockPrinters.length > 0) {
        targetPrinterIds.add(mockPrinters[0].id);
      } else {
        return false;
      }
    }

    let success = true;
    for (const printerId of targetPrinterIds) {
      const pr = printerRepository.getPrinter(printerId);
      if (!pr || !pr.enabled) continue;

      try {
        const kotData: KOTData = {
          kotNumber: data.kotNumber || `KOT-${Date.now().toString().slice(-4)}`,
          tableId: data.tableId || "T0",
          orderType: data.orderType || "dine-in",
          cashierName: data.cashierName || "Waiter",
          items: items.map((i: any) => ({ name: i.name, quantity: i.quantity })),
          instructions: data.instructions
        };

        const docModel = kotDocument.build(kotData);
        const bytes = await receiptRenderer.render(docModel, pr.profile);

        // Enqueue KOT job with Priority 2 (Kitchen)
        const jobId = await printerQueue.enqueueJob(pr.id, "kot", bytes, 2);
        if (jobId === "skipped") {
          logger.info("printer", `KOT job skipped due to idempotency verification.`);
        }
      } catch (err: any) {
        logger.error("printer", `Crash during KOT compilation for printer ${pr.name}`, err);
        success = false;
      }
    }

    return success;
  }

  /**
   * Daily Closing shift report printing flow.
   */
  public async printDailyClosing(data: DailyClosingData): Promise<boolean> {
    logger.info("printer", `Daily Closing print request initiated for shift: ${data.shiftId}`);
    
    // Find active billing printers to print reports
    const printers = printerRepository.getPrinters().filter(p => p.enabled && p.role === "billing");
    if (printers.length === 0) {
      logger.warn("printer", "No billing/report printers configured. closing print aborted.");
      return false;
    }

    let success = true;
    for (const pr of printers) {
      try {
        const docModel = dailyClosingDocument.build(data);
        const bytes = await receiptRenderer.render(docModel, pr.profile);
        
        // Enqueue report with Priority 3 (Reports)
        await printerQueue.enqueueJob(pr.id, "closing", bytes, 3);
      } catch (err: any) {
        logger.error("printer", `Crash during Closing print for printer ${pr.name}`, err);
        success = false;
      }
    }

    return success;
  }

  /**
   * Test printing flow for checking connections.
   */
  public async printTest(printerId: string): Promise<{ success: boolean; error?: string }> {
    const pr = printerRepository.getPrinter(printerId);
    if (!pr) {
      return { success: false, error: "Printer config not found" };
    }

    try {
      const docModel = testDocument.build({
        printerName: pr.name,
        connectionType: pr.type,
        ipAddress: pr.ip,
        port: pr.port,
        capabilities: pr.profile.capabilities
      });

      const bytes = await receiptRenderer.render(docModel, pr.profile);
      
      // Enqueue diagnostics test print with Priority 4 (Diagnostics)
      const jobId = await printerQueue.enqueueJob(pr.id, "test", bytes, 4);
      return { success: jobId !== "skipped" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const printerManager = new PrinterManager();
export default printerManager;
