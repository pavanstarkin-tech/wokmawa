import { BaseRepository } from "./BaseRepository";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  stockQty: number;
  unit: string;
  minStock: number;
  branchId: string;
}

export class InventoryRepository extends BaseRepository {
  private mapRowToModel(row: any): InventoryItem {
    return {
      id: row.id,
      name: row.name,
      sku: row.sku,
      category: row.category,
      stockQty: row.stockQty || 0,
      unit: row.unit,
      minStock: row.minStock || 0,
      branchId: row.branchId
    };
  }

  public async getAll(): Promise<InventoryItem[]> {
    const rows = await this.db.query("SELECT * FROM inventory");
    if (rows.length === 0) {
      return this.seedDefaults();
    }
    return rows.map(r => this.mapRowToModel(r));
  }

  private async seedDefaults(): Promise<InventoryItem[]> {
    const defaults: InventoryItem[] = [
      { id: "inv_1", name: "Basmati Biryani Rice", sku: "RICE-BAS-001", category: "Dry Goods", stockQty: 150, unit: "kg", minStock: 30, branchId: "MAIN_BRANCH" },
      { id: "inv_2", name: "Cow Milk", sku: "MILK-COW-002", category: "Dairy", stockQty: 45, unit: "litres", minStock: 10, branchId: "MAIN_BRANCH" },
      { id: "inv_3", name: "Premium Paneer", sku: "DAI-PAN-003", category: "Dairy", stockQty: 12, unit: "kg", minStock: 5, branchId: "MAIN_BRANCH" },
      { id: "inv_4", name: "Cooking Oil (Sunflower)", sku: "OIL-SUN-004", category: "Oils", stockQty: 80, unit: "litres", minStock: 20, branchId: "MAIN_BRANCH" }
    ];
    for (const item of defaults) {
      await this.saveItem(item);
    }
    return defaults;
  }

  public async saveItem(item: Omit<InventoryItem, "branchId">): Promise<InventoryItem> {
    const now = Date.now();
    const branchId = "MAIN_BRANCH";

    await this.db.execute(
      `INSERT OR REPLACE INTO inventory (
        id, name, sku, category, stockQty, unit, minStock, syncStatus, updatedAt, branchId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.name,
        item.sku,
        item.category,
        item.stockQty,
        item.unit,
        item.minStock,
        "pending",
        now,
        branchId
      ]
    );

    // Schedule sync instruction
    const syncJobId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      "INSERT INTO syncQueue (id, entity, operation, entityId, status, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [syncJobId, "inventory", "update", item.id, "pending", now, branchId]
    );

    const result = { ...item, branchId };
    dbEventBus.emit("inventory.updated", result);
    return result;
  }

  public async updateStock(id: string, qty: number): Promise<void> {
    const now = Date.now();
    await this.db.execute(
      "UPDATE inventory SET stockQty = ?, syncStatus = 'pending', updatedAt = ? WHERE id = ?",
      [qty, now, id]
    );

    // Schedule sync instruction
    const syncJobId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      "INSERT INTO syncQueue (id, entity, operation, entityId, status, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [syncJobId, "inventory", "update", id, "pending", now, "MAIN_BRANCH"]
    );

    dbEventBus.emit("inventory.updated", { id, stockQty: qty });
  }
}

export const inventoryRepository = new InventoryRepository();
export default inventoryRepository;
