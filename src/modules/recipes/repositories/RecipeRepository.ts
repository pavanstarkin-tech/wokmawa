import dbService from "../../../core/database/DatabaseService";
import { unitOfWork } from "../../../core/database/UnitOfWork";
import logger from "@/services/logger/Logger";

export interface Recipe {
  id: string;
  menuItemId: string;
  variantId: string;
  recipeName: string;
  yieldQuantity: number;
  yieldUnitId: string;
  yieldPercent: number;
  costPrice: number;
  packagingCost: number;
  labourCost: number;
  overheadCost: number;
  totalCost: number;
  status: "draft" | "active" | "archived" | "testing";
  version: number;
  approvedBy?: string;
  approvedAt?: number;
  createdAt: number;
  updatedAt: number;
  branchId: string;
}

export interface RecipeItem {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number;
  wastagePercent: number;
  sortOrder: number;
  ingredientName?: string;
  unitSymbol?: string;
  ingredientCostPrice?: number;
}

export class RecipeRepository {
  private get db() {
    return dbService.getAdapter();
  }

  public async getRecipes(): Promise<Recipe[]> {
    const rows = await this.db.query("SELECT * FROM recipes");
    return rows.map(r => this.mapRowToRecipe(r));
  }

  public async findByMenuItemVariant(menuItemId: string, variantId: string): Promise<Recipe | null> {
    const rows = await this.db.query(
      "SELECT * FROM recipes WHERE menuItemId = ? AND variantId = ?",
      [menuItemId, variantId]
    );
    if (rows.length === 0) return null;
    return this.mapRowToRecipe(rows[0]);
  }

  public async getRecipeItems(recipeId: string): Promise<RecipeItem[]> {
    const rows = await this.db.query(`
      SELECT ri.*, i.name as ingredientName, u.symbol as unitSymbol, i.costPrice as ingredientCostPrice
      FROM recipe_items ri
      JOIN ingredients i ON ri.ingredientId = i.id
      LEFT JOIN units u ON i.unitId = u.id
      WHERE ri.recipeId = ?
      ORDER BY ri.sortOrder ASC
    `, [recipeId]);

    return rows.map(r => ({
      id: r.id,
      recipeId: r.recipeId,
      ingredientId: r.ingredientId,
      quantity: r.quantity,
      wastagePercent: r.wastagePercent,
      sortOrder: r.sortOrder,
      ingredientName: r.ingredientName,
      unitSymbol: r.unitSymbol,
      ingredientCostPrice: r.ingredientCostPrice
    }));
  }

  public async saveRecipe(recipe: Recipe, items: RecipeItem[]): Promise<void> {
    const now = Date.now();
    await unitOfWork.transaction(async () => {
      // 1. Create or replace header
      await this.db.execute(
        `INSERT OR REPLACE INTO recipes (
          id, menuItemId, variantId, recipeName, yieldQuantity, yieldUnitId, yieldPercent,
          costPrice, packagingCost, labourCost, overheadCost, totalCost, status, version,
          approvedBy, approvedAt, createdAt, updatedAt, branchId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recipe.id, recipe.menuItemId, recipe.variantId, recipe.recipeName, recipe.yieldQuantity,
          recipe.yieldUnitId, recipe.yieldPercent, recipe.costPrice, recipe.packagingCost,
          recipe.labourCost, recipe.overheadCost, recipe.totalCost, recipe.status, recipe.version,
          recipe.approvedBy || null, recipe.approvedAt || null, recipe.createdAt || now, now, recipe.branchId || "MAIN_BRANCH"
        ]
      );

      // 2. Remove old items
      await this.db.execute("DELETE FROM recipe_items WHERE recipeId = ?", [recipe.id]);

      // 3. Insert new items
      for (const item of items) {
        await this.db.execute(
          `INSERT INTO recipe_items (id, recipeId, ingredientId, quantity, wastagePercent, sortOrder)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [item.id, recipe.id, item.ingredientId, item.quantity, item.wastagePercent, item.sortOrder]
        );
      }

      // 4. Save version history snapshot
      const historyId = `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const snapshot = JSON.stringify({ recipe, items });
      await this.db.execute(
        "INSERT INTO recipe_history (id, recipeId, version, snapshot, createdAt) VALUES (?, ?, ?, ?, ?)",
        [historyId, recipe.id, recipe.version, snapshot, now]
      );
    });
  }

  public async deleteRecipe(id: string): Promise<void> {
    await unitOfWork.transaction(async () => {
      await this.db.execute("DELETE FROM recipes WHERE id = ?", [id]);
      await this.db.execute("DELETE FROM recipe_items WHERE recipeId = ?", [id]);
    });
  }

  // --- Wastage Actions ---
  public async logWastage(
    recipeItemId: string,
    expectedQty: number,
    actualQty: number,
    variance: number
  ): Promise<void> {
    const id = `waste_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      `INSERT INTO recipe_wastage (id, recipeItemId, expectedQty, actualQty, variance, timestamp, branchId)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, recipeItemId, expectedQty, actualQty, variance, Date.now(), "MAIN_BRANCH"]
    );
  }

  public async getWastageLogs(): Promise<any[]> {
    return this.db.query(`
      SELECT w.*, ri.quantity as recipeQty, i.name as ingredientName, u.symbol as unitSymbol
      FROM recipe_wastage w
      JOIN recipe_items ri ON w.recipeItemId = ri.id
      JOIN ingredients i ON ri.ingredientId = i.id
      LEFT JOIN units u ON i.unitId = u.id
      ORDER BY w.timestamp DESC
    `);
  }

  public async getHistory(recipeId: string): Promise<any[]> {
    return this.db.query(
      "SELECT * FROM recipe_history WHERE recipeId = ? ORDER BY version DESC",
      [recipeId]
    );
  }

  // --- Helper mapping ---
  private mapRowToRecipe(r: any): Recipe {
    return {
      id: r.id,
      menuItemId: r.menuItemId,
      variantId: r.variantId,
      recipeName: r.recipeName,
      yieldQuantity: r.yieldQuantity,
      yieldUnitId: r.yieldUnitId,
      yieldPercent: r.yieldPercent || 100,
      costPrice: r.costPrice || 0,
      packagingCost: r.packagingCost || 0,
      labourCost: r.labourCost || 0,
      overheadCost: r.overheadCost || 0,
      totalCost: r.totalCost || 0,
      status: r.status as any,
      version: r.version || 1,
      approvedBy: r.approvedBy || undefined,
      approvedAt: r.approvedAt || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      branchId: r.branchId
    };
  }
}

export const recipeRepository = new RecipeRepository();
export default recipeRepository;
