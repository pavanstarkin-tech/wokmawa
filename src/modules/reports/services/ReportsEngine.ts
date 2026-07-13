import dbService from "../../../core/database/DatabaseService";

export interface SalesReport {
  grossSales: number;
  taxCollected: number;
  billsCount: number;
  cashSales: number;
  cardSales: number;
  upiSales: number;
}

export interface ProfitAndLossReport {
  totalRevenue: number;
  totalCostOfGoodsSold: number;
  totalExpenses: number;
  netProfit: number;
}

export class ReportsEngine {
  private get db() {
    return dbService.getAdapter();
  }

  public async getSalesReport(startTime: number, endTime: number): Promise<SalesReport> {
    const rows = await this.db.query(
      `SELECT 
        SUM(grandTotal) as gross,
        SUM(tax) as totalTax,
        COUNT(id) as count,
        SUM(CASE WHEN paymentMethod = 'cash' THEN amountPaid ELSE 0 END) as cash,
        SUM(CASE WHEN paymentMethod = 'card' THEN amountPaid ELSE 0 END) as card,
        SUM(CASE WHEN paymentMethod = 'upi' THEN amountPaid ELSE 0 END) as upi
       FROM bills
       WHERE createdAt >= ? AND createdAt <= ?`,
      [startTime, endTime]
    );

    const r = rows[0] || {};
    return {
      grossSales: r.gross || 0,
      taxCollected: r.totalTax || 0,
      billsCount: r.count || 0,
      cashSales: r.cash || 0,
      cardSales: r.card || 0,
      upiSales: r.upi || 0
    };
  }

  public async getInventoryValue(): Promise<number> {
    const rows = await this.db.query("SELECT SUM(stockQty * costPrice) as totalVal FROM ingredients");
    return rows[0]?.totalVal || 0;
  }

  public async getPandLReport(startTime: number, endTime: number): Promise<ProfitAndLossReport> {
    // 1. Sales revenue
    const sales = await this.getSalesReport(startTime, endTime);
    
    // 2. Expenses outlays
    const expRows = await this.db.query(
      "SELECT SUM(amount) as total FROM expenses WHERE timestamp >= ? AND timestamp <= ?",
      [startTime, endTime]
    );
    const totalExp = expRows[0]?.total || 0;

    // 3. Purchase Cost of Goods Sold (cogs)
    const grnRows = await this.db.query(
      "SELECT SUM(total) as total FROM goods_receipts WHERE receivedDate >= ? AND receivedDate <= ?",
      [startTime, endTime]
    );
    const cogs = grnRows[0]?.total || 0;

    return {
      totalRevenue: sales.grossSales,
      totalCostOfGoodsSold: cogs,
      totalExpenses: totalExp,
      netProfit: sales.grossSales - cogs - totalExp
    };
  }
}

export const reportsEngine = new ReportsEngine();
export default reportsEngine;
