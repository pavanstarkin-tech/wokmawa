import logger from "@/services/logger/Logger";

export class KitchenPrinterEngine {
  public async printKOT(tableId: string, items: Array<{ name: string; qty: number; notes?: string }>): Promise<boolean> {
    logger.info("printer", `Kitchen printer routing food items for Table: ${tableId}`);

    const kotLines = [
      "          KITCHEN ORDER TICKET          ",
      `Table: ${tableId} | Date: ${new Date().toLocaleTimeString()}`,
      "========================================",
      "Qty   Item Name                Notes",
      "----------------------------------------",
      ...items.map(i => `${i.qty.toString().padEnd(5)}${i.name.padEnd(25)}${i.notes || ""}`),
      "========================================"
    ];

    logger.info("printer", `ESC/POS KOT printed:\n${kotLines.join("\n")}`);
    return true;
  }
}

export const kitchenPrinterEngine = new KitchenPrinterEngine();
export default kitchenPrinterEngine;
