import dbService from "../../core/database/DatabaseService";
import { reportsEngine } from "../reports/services/ReportsEngine";
import logger from "@/services/logger/Logger";

export class AICopilot {
  private get db() {
    return dbService.getAdapter();
  }

  /**
   * Processes a natural language analytics query offline by executing SQL summation.
   */
  public async queryLocalAssistant(question: string): Promise<string> {
    const query = question.toLowerCase().trim();
    logger.info("ai", `Offline Copilot analyzing query: "${question}"`);

    try {
      if (query.includes("sales") || query.includes("revenue")) {
        const stats = await reportsEngine.getSalesReport(Date.now() - 86400000, Date.now() + 86400000);
        return `Today's gross sales revenue is ₹${stats.grossSales.toFixed(2)} compiled across ${stats.billsCount} transactions.`;
      }

      if (query.includes("profit") || query.includes("cogs")) {
        const stats = await reportsEngine.getPandLReport(Date.now() - 86400000 * 30, Date.now() + 86400000);
        return `P&L compilation (last 30 days): Gross Revenue: ₹${stats.totalRevenue.toFixed(2)} | COGS outlays: ₹${stats.totalCostOfGoodsSold.toFixed(2)} | Net Profit: ₹${stats.netProfit.toFixed(2)}.`;
      }

      if (query.includes("stock") || query.includes("low")) {
        const rows = await this.db.query("SELECT name, stockQty, minStock FROM ingredients WHERE stockQty <= minStock");
        if (rows.length === 0) {
          return "All ingredients are currently stocked above safe threshold limits.";
        }
        const items = rows.map((r: any) => `${r.name} (${r.stockQty} on hand, min threshold: ${r.minStock})`).join(", ");
        return `These ingredients have dropped below safe reorder limits: ${items}.`;
      }

      if (query.includes("cost") || query.includes("dish")) {
        const rows = await this.db.query("SELECT recipeName, totalCost FROM recipes ORDER BY totalCost DESC LIMIT 3");
        const items = rows.map((r: any) => `${r.recipeName} (Cost: ₹${r.totalCost.toFixed(2)})`).join(", ");
        return `These are the highest costing menu items: ${items}.`;
      }

      return "I can help analyze sales revenue, profit, low stock limits, and dish costings. Please try asking about sales or low stock.";
    } catch (err: any) {
      logger.error("ai", "Assistant failed parsing queries offline", err);
      return `Failed to compute response: ${err.message}`;
    }
  }
}

export const aiCopilot = new AICopilot();
export default aiCopilot;
