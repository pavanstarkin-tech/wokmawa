import dbService from "../../../core/database/DatabaseService";
import { unitOfWork } from "../../../core/database/UnitOfWork";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";
import { inventoryEngine } from "../../../core/erp/InventoryEngine";
import { vendorLedgerEngine } from "./VendorLedgerEngine";
import logger from "@/services/logger/Logger";

export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  receivedDate: number;
  status: "completed" | "cancelled";
  total: number;
  branchId: string;
}

export interface GoodsReceiptItem {
  id: string;
  goodsReceiptId: string;
  ingredientId: string;
  acceptedQty: number;
  rejectedQty: number;
  damagedQty: number;
  returnedQty: number;
  remarks: string;
  expiryDate: number;
  batchNumber: string;
  unitCost: number;
}

export class GoodsReceiptEngine {
  private get db() {
    return dbService.getAdapter();
  }

  public async getGoodsReceipts(): Promise<GoodsReceipt[]> {
    return this.db.query("SELECT * FROM goods_receipts ORDER BY receivedDate DESC");
  }

  /**
   * Completes a Goods Receipt Note (GRN), updating stock counts, batch lots, average costs,
   * recipe valuations, and vendor accounts inside a single transactional block.
   */
  public async createGoodsReceipt(
    grn: Omit<GoodsReceipt, "id" | "grnNumber">,
    items: Array<Omit<GoodsReceiptItem, "id" | "goodsReceiptId">>
  ): Promise<string> {
    const grnId = `grn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const grnNumber = `GRN-${Date.now().toString().slice(-6)}`;

    // 1. Fetch PO to resolve vendor and check validity
    const poRows = await this.db.query("SELECT vendorId, status FROM purchase_orders WHERE id = ?", [grn.purchaseOrderId]);
    if (poRows.length === 0) {
      throw new Error(`Purchase Order ${grn.purchaseOrderId} not found.`);
    }
    if (poRows[0].status === "completed" || poRows[0].status === "cancelled") {
      throw new Error("Cannot receive items against a completed or cancelled Purchase Order.");
    }
    const vendorId = poRows[0].vendorId;

    await unitOfWork.transaction(async () => {
      // 2. Insert GRN header
      await this.db.execute(
        `INSERT INTO goods_receipts (id, grnNumber, purchaseOrderId, receivedDate, status, total, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [grnId, grnNumber, grn.purchaseOrderId, Date.now(), "completed", grn.total, "MAIN_BRANCH"]
      );

      // 3. Process each received item
      for (const item of items) {
        const itemId = `gri_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        
        // A. Save GRN item quality check inspection logs
        await this.db.execute(
          `INSERT INTO goods_receipt_items (
            id, goodsReceiptId, ingredientId, acceptedQty, rejectedQty, damagedQty, returnedQty, remarks, expiryDate, batchNumber, unitCost
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId, grnId, item.ingredientId, item.acceptedQty, item.rejectedQty, item.damagedQty,
            item.returnedQty, item.remarks || "", item.expiryDate || null, item.batchNumber || "DEFAULT", item.unitCost
          ]
        );

        if (item.acceptedQty > 0) {
          // B. Update PO receivedQty
          await this.db.execute(
            `UPDATE purchase_order_items
             SET receivedQty = receivedQty + ?
             WHERE purchaseOrderId = ? AND ingredientId = ?`,
            [item.acceptedQty, grn.purchaseOrderId, item.ingredientId]
          );

          // C. Fetch current stock and cost price to compute weighted average
          const ingRows = await this.db.query("SELECT stockQty, costPrice, name FROM ingredients WHERE id = ?", [item.ingredientId]);
          const currentStock = ingRows[0]?.stockQty || 0;
          const currentCost = ingRows[0]?.costPrice || 0;

          // D. Recalculate average cost price
          const totalNewStock = currentStock + item.acceptedQty;
          const newAvgCost = totalNewStock > 0 
            ? ((currentStock * currentCost) + (item.acceptedQty * item.unitCost)) / totalNewStock
            : item.unitCost;

          // E. Update inventory stock and cost price
          await inventoryEngine.adjustStock(
            item.ingredientId,
            item.acceptedQty,
            `Delivery Note ${grnNumber}`,
            "purchase",
            grnId
          );

          await this.db.execute(
            "UPDATE ingredients SET costPrice = ? WHERE id = ?",
            [newAvgCost, item.ingredientId]
          );

          // F. Insert into inventory batch tracker (FIFO tracking)
          const batchId = `bat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          await this.db.execute(
            `INSERT INTO inventory_batches (id, ingredientId, batchNumber, expiryDate, receivedQty, availableQty, unitCost, grnId, branchId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              batchId, item.ingredientId, item.batchNumber || `BAT-${Date.now().toString().slice(-4)}`,
              item.expiryDate || null, item.acceptedQty, item.acceptedQty, item.unitCost, grnId, "MAIN_BRANCH"
            ]
          );

          // G. Recalculate associated Recipe costs dynamically (cost cascade)
          const recRows = await this.db.query(
            "SELECT DISTINCT recipeId FROM recipe_items WHERE ingredientId = ?",
            [item.ingredientId]
          );
          
          for (const rec of recRows) {
            await this.recalculateRecipeCost(rec.recipeId);
          }
        }
      }

      // 4. Update Purchase Order status based on outstanding item balances
      const poItems = await this.db.query(
        "SELECT quantity, receivedQty FROM purchase_order_items WHERE purchaseOrderId = ?",
        [grn.purchaseOrderId]
      );
      
      const allCompleted = poItems.every(it => (it.receivedQty || 0) >= it.quantity);
      const anyReceived = poItems.some(it => (it.receivedQty || 0) > 0);
      const nextPOStatus = allCompleted ? "completed" : (anyReceived ? "partially_received" : "approved");

      await this.db.execute("UPDATE purchase_orders SET status = ? WHERE id = ?", [nextPOStatus, grn.purchaseOrderId]);

      // 5. Post credit transactions to the vendor account ledger
      await vendorLedgerEngine.postCredit(vendorId, "grn", grnId, grn.total);
    });

    dbEventBus.emit("grn.completed", { id: grnId, grnNumber });
    dbEventBus.emit("inventory.received", { grnId });
    return grnId;
  }

  /**
   * Recalculates recipe total costs dynamically using current average costing prices.
   */
  private async recalculateRecipeCost(recipeId: string): Promise<void> {
    const recRows = await this.db.query("SELECT * FROM recipes WHERE id = ?", [recipeId]);
    if (recRows.length === 0) return;
    const recipe = recRows[0];

    const rItems = await this.db.query(`
      SELECT ri.*, i.costPrice as ingredientCostPrice
      FROM recipe_items ri
      JOIN ingredients i ON ri.ingredientId = i.id
      WHERE ri.recipeId = ?
    `, [recipeId]);

    // Sum raw ingredients costs with wastage percentages
    const rawIngredientsCost = rItems.reduce((sum: number, item: any) => {
      const baseCost = item.ingredientCostPrice || 0;
      const wasteFactor = 1 + (item.wastagePercent || 0) / 100;
      return sum + (baseCost * item.quantity * wasteFactor);
    }, 0);

    const totalCost = rawIngredientsCost + (recipe.packagingCost || 0) + (recipe.labourCost || 0) + (recipe.overheadCost || 0);

    await this.db.execute(
      "UPDATE recipes SET costPrice = ?, totalCost = ?, updatedAt = ? WHERE id = ?",
      [rawIngredientsCost, totalCost, Date.now(), recipeId]
    );

    dbEventBus.emit("recipe.cost.changed", { recipeId, totalCost });
  }
}

export const goodsReceiptEngine = new GoodsReceiptEngine();
export default goodsReceiptEngine;
