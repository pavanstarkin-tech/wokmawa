import dbService from "../../core/database/DatabaseService";
import { unitOfWork } from "../../core/database/UnitOfWork";
import { dbEventBus } from "../../core/database/DatabaseEventBus";

export interface BranchTransfer {
  id: string;
  sourceBranchId: string;
  destBranchId: string;
  status: "pending" | "shipped" | "received" | "rejected";
  shippedDate?: number;
  receivedDate?: number;
  notes?: string;
}

export interface BranchTransferItem {
  id: string;
  transferId: string;
  ingredientId: string;
  shippedQty: number;
  receivedQty: number;
}

export class BranchTransferEngine {
  private get db() {
    return dbService.getAdapter();
  }

  public async getTransfers(): Promise<BranchTransfer[]> {
    return this.db.query("SELECT * FROM branch_transfers ORDER BY shippedDate DESC");
  }

  public async createTransfer(
    sourceBranch: string,
    destBranch: string,
    items: Array<{ ingredientId: string; shippedQty: number }>,
    notes = ""
  ): Promise<string> {
    const id = `xfer_${Date.now()}`;
    await unitOfWork.transaction(async () => {
      await this.db.execute(
        `INSERT INTO branch_transfers (id, sourceBranchId, destBranchId, status, shippedDate, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, sourceBranch, destBranch, "pending", Date.now(), notes]
      );

      for (const item of items) {
        const itemId = `xferi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await this.db.execute(
          `INSERT INTO branch_transfer_items (id, transferId, ingredientId, shippedQty, receivedQty)
           VALUES (?, ?, ?, ?, ?)`,
          [itemId, id, item.ingredientId, item.shippedQty, 0]
        );
      }
    });

    dbEventBus.emit("transfer.created", { id });
    return id;
  }

  public async receiveTransfer(transferId: string, receivedBy: string): Promise<void> {
    await unitOfWork.transaction(async () => {
      // 1. Get transfer items
      const items = await this.db.query(
        "SELECT * FROM branch_transfer_items WHERE transferId = ?",
        [transferId]
      );
      
      const xfer = await this.db.query(
        "SELECT * FROM branch_transfers WHERE id = ?",
        [transferId]
      );
      
      if (xfer.length === 0) throw new Error("Transfer not found.");
      const destBranch = xfer[0].destBranchId;

      // 2. Adjust destination stock quantity dynamically
      for (const item of items) {
        await this.db.execute(
          `INSERT INTO branch_inventory (branchId, ingredientId, stockQty)
           VALUES (?, ?, ?)
           ON CONFLICT(branchId, ingredientId) 
           DO UPDATE SET stockQty = stockQty + ?`,
          [destBranch, item.ingredientId, item.shippedQty, item.shippedQty]
        );

        await this.db.execute(
          "UPDATE branch_transfer_items SET receivedQty = ? WHERE id = ?",
          [item.shippedQty, item.id]
        );
      }

      await this.db.execute(
        "UPDATE branch_transfers SET status = 'received', receivedDate = ? WHERE id = ?",
        [Date.now(), transferId]
      );
    });

    dbEventBus.emit("transfer.received", { transferId });
  }
}

export const branchTransferEngine = new BranchTransferEngine();
export default branchTransferEngine;
