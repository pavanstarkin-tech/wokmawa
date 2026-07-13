import dbService from "../database/DatabaseService";
import { unitOfWork } from "../database/UnitOfWork";
import { dbEventBus } from "../database/DatabaseEventBus";
import logger from "@/services/logger/Logger";

export interface Ingredient {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName?: string;
  unitId: string;
  unitSymbol?: string;
  stockQty: number;
  minStock: number;
  costPrice: number;
  updatedAt: number;
}

export interface IngredientCategory {
  id: string;
  name: string;
}

export interface MeasurementUnit {
  id: string;
  name: string;
  symbol: string;
}

export interface StockMovement {
  id: string;
  ingredientId: string;
  ingredientName?: string;
  type: "in" | "out";
  quantity: number;
  source: "purchase" | "sales" | "adjustment" | "wastage";
  referenceId?: string;
  timestamp: number;
}

export class InventoryEngine {
  private get db() {
    return dbService.getAdapter();
  }

  // --- Category Actions ---
  public async getCategories(): Promise<IngredientCategory[]> {
    const rows = await this.db.query("SELECT * FROM ingredient_categories ORDER BY name ASC");
    return rows.map(r => ({ id: r.id, name: r.name }));
  }

  public async addCategory(name: string): Promise<string> {
    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      "INSERT INTO ingredient_categories (id, name, branchId) VALUES (?, ?, ?)",
      [id, name, "MAIN_BRANCH"]
    );
    dbEventBus.emit("inventory.categoryCreated", { id, name });
    return id;
  }

  // --- Unit Actions ---
  public async getUnits(): Promise<MeasurementUnit[]> {
    const rows = await this.db.query("SELECT * FROM units ORDER BY name ASC");
    return rows.map(r => ({ id: r.id, name: r.name, symbol: r.symbol }));
  }

  public async addUnit(name: string, symbol: string): Promise<string> {
    const id = `unit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      "INSERT INTO units (id, name, symbol) VALUES (?, ?, ?)",
      [id, name, symbol]
    );
    dbEventBus.emit("inventory.unitCreated", { id, name, symbol });
    return id;
  }

  // --- Ingredient Actions ---
  public async getIngredients(): Promise<Ingredient[]> {
    const rows = await this.db.query(`
      SELECT i.*, c.name as categoryName, u.symbol as unitSymbol
      FROM ingredients i
      LEFT JOIN ingredient_categories c ON i.categoryId = c.id
      LEFT JOIN units u ON i.unitId = u.id
      ORDER BY i.name ASC
    `);
    
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      categoryId: r.categoryId,
      categoryName: r.categoryName || "Uncategorized",
      unitId: r.unitId,
      unitSymbol: r.unitSymbol || "pcs",
      stockQty: r.stockQty || 0,
      minStock: r.minStock || 0,
      costPrice: r.costPrice || 0,
      updatedAt: r.updatedAt
    }));
  }

  public async addIngredient(
    name: string,
    sku: string,
    categoryId: string,
    unitId: string,
    minStock = 0,
    costPrice = 0,
    openingStock = 0
  ): Promise<string> {
    const id = `ing_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    await unitOfWork.transaction(async () => {
      // 1. Insert ingredient
      await this.db.execute(
        `INSERT INTO ingredients (
          id, name, sku, categoryId, unitId, stockQty, minStock, costPrice, updatedAt, branchId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, sku, categoryId, unitId, openingStock, minStock, costPrice, now, "MAIN_BRANCH"]
      );

      // 2. Log opening stock if > 0
      if (openingStock > 0) {
        const movementId = `mov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await this.db.execute(
          `INSERT INTO stock_movements (id, ingredientId, type, quantity, source, timestamp, branchId)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [movementId, id, "in", openingStock, "adjustment", now, "MAIN_BRANCH"]
        );
      }
    });

    dbEventBus.emit("inventory.ingredientCreated", { id, name, sku });
    return id;
  }

  public async adjustStock(
    ingredientId: string,
    adjustQty: number,
    reason: string,
    source: StockMovement["source"] = "adjustment",
    referenceId?: string
  ): Promise<void> {
    const now = Date.now();

    await unitOfWork.transaction(async () => {
      // 1. Fetch current stock
      const rows = await this.db.query("SELECT stockQty, name FROM ingredients WHERE id = ?", [ingredientId]);
      if (rows.length === 0) {
        throw new Error(`Ingredient ${ingredientId} not found.`);
      }
      
      const currentStock = rows[0].stockQty || 0;
      const newStock = currentStock + adjustQty;

      // 2. Update stock level
      await this.db.execute(
        "UPDATE ingredients SET stockQty = ?, updatedAt = ? WHERE id = ?",
        [newStock, now, ingredientId]
      );

      // 3. Log movement
      const movementId = `mov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const type = adjustQty >= 0 ? "in" : "out";
      await this.db.execute(
        `INSERT INTO stock_movements (id, ingredientId, type, quantity, source, referenceId, timestamp, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [movementId, ingredientId, type, Math.abs(adjustQty), source, referenceId || null, now, "MAIN_BRANCH"]
      );

      // 4. Log adjustment details specifically if adjusting manually
      if (source === "adjustment" || source === "wastage") {
        const adjId = `adj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await this.db.execute(
          `INSERT INTO stock_adjustments (id, ingredientId, adjustQty, reason, timestamp, branchId)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [adjId, ingredientId, adjustQty, reason, now, "MAIN_BRANCH"]
        );
      }
    });

    dbEventBus.emit("inventory.stockAdjusted", { ingredientId, adjustQty, reason });
  }

  public async getLowStockIngredients(): Promise<Ingredient[]> {
    const list = await this.getIngredients();
    return list.filter(i => i.stockQty <= i.minStock);
  }

  public async getStockMovements(ingredientId?: string): Promise<StockMovement[]> {
    let query = `
      SELECT m.*, i.name as ingredientName
      FROM stock_movements m
      JOIN ingredients i ON m.ingredientId = i.id
    `;
    const params: any[] = [];

    if (ingredientId) {
      query += " WHERE m.ingredientId = ?";
      params.push(ingredientId);
    }

    query += " ORDER BY m.timestamp DESC LIMIT 100";
    const rows = await this.db.query(query, params);
    
    return rows.map(r => ({
      id: r.id,
      ingredientId: r.ingredientId,
      ingredientName: r.ingredientName,
      type: r.type as any,
      quantity: r.quantity,
      source: r.source as any,
      referenceId: r.referenceId || undefined,
      timestamp: r.timestamp
    }));
  }
}

export const inventoryEngine = new InventoryEngine();
export default inventoryEngine;
