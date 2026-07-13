import logger from "@/services/logger/Logger";

export class CounterPrinterEngine {
  public async printReceipt(billId: string): Promise<boolean> {
    logger.info("printer", `Counter printer generating tax invoice receipt: ${billId}`);
    
    // Simulate ESC/POS line outputs
    const receiptLines = [
      "      PAAKASHALA RESTAURANT      ",
      "      GSTIN: 29AAAAA0000A1Z5     ",
      "=================================",
      `Invoice #: ${billId}`,
      `Date: ${new Date().toLocaleDateString()}`,
      "---------------------------------",
      "Item              Qty       Price",
      "Butter Naan        2        80.00",
      "Paneer Butter      1       180.00",
      "---------------------------------",
      "Subtotal:                  260.00",
      "GST (5%):                   13.00",
      "Grand Total:               273.00",
      "=================================",
      "    Thank you! Visit again.      "
    ];

    logger.info("printer", `ESC/POS receipt printed:\n${receiptLines.join("\n")}`);
    return true;
  }
}

export const counterPrinterEngine = new CounterPrinterEngine();
export default counterPrinterEngine;
