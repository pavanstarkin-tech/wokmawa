import eventBus from "@/services/event-bus/eventBus";
import dbService from "../../../core/database/DatabaseService";
import { recipeRepository } from "../repositories/RecipeRepository";
import { inventoryEngine } from "../../../core/erp/InventoryEngine";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";
import logger from "@/services/logger/Logger";

export class ConsumptionEngine {
  private get db() {
    return dbService.getAdapter();
  }

  public initialize() {
    logger.info("sync", "ConsumptionEngine registering billing completed events listeners...");
    
    // Subscribe to billing completed events
    eventBus.on("billing.completed", async (payload: any) => {
      try {
        const order = payload.order || payload.bill;
        if (!order) return;
        
        await this.consumeBillIngredients(order.id, order.items || [], order.branchId || "MAIN_BRANCH");
      } catch (err) {
        logger.error("sync", "Stock consumption execution crashed", err);
      }
    });
  }

  /**
   * Translates completed billing items to ingredient stock deductions, writing records to the consumption ledger.
   * Emits low-stock alert signals if required.
   */
  public async consumeBillIngredients(
    billId: string,
    items: Array<{ id: string; quantity: number; variantId?: string }>,
    branchId = "MAIN_BRANCH"
  ): Promise<void> {
    // 1. Double-deduction Guard: Check if this bill was already processed
    const processed = await this.db.query("SELECT id FROM consumption_ledger WHERE billId = ? LIMIT 1", [billId]);
    if (processed.length > 0) {
      logger.info("sync", `Bill ${billId} already processed. Skipping stock consumption.`);
      return;
    }

    logger.info("sync", `Processing stock consumption for completed Bill: ${billId}...`);

    for (const item of items) {
      const variantId = item.variantId || "default";
      
      // 2. Query active recipe
      const recipe = await recipeRepository.findByMenuItemVariant(item.id, variantId);
      if (!recipe) {
        // No recipe mapping exists, proceed to next item
        continue;
      }

      // 3. Fetch recipe items
      const recipeItems = await recipeRepository.getRecipeItems(recipe.id);

      for (const rItem of recipeItems) {
        // Compute total quantity consumed: Quantity Sold * Recipe Quantity * wastage factors
        const wastageFactor = 1 + (rItem.wastagePercent || 0) / 100;
        const totalQtyConsumed = item.quantity * rItem.quantity * wastageFactor;

        // Stock deduction (negative adjustment)
        const deductQty = -1 * totalQtyConsumed;

        try {
          // Adjust stock in SQLite database
          await inventoryEngine.adjustStock(
            rItem.ingredientId,
            deductQty,
            `Sales Bill #${billId.substring(0, 6).toUpperCase()}`,
            "sales",
            billId
          );

          // Write record to consumption ledger
          const ledgerId = `cons_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          await this.db.execute(
            `INSERT INTO consumption_ledger (id, billId, recipeId, ingredientId, quantity, timestamp, branchId)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [ledgerId, billId, recipe.id, rItem.ingredientId, totalQtyConsumed, Date.now(), branchId]
          );

          logger.info("sync", `Deducted stock for ${rItem.ingredientName}: -${totalQtyConsumed} ${rItem.unitSymbol || "pcs"}`);
        } catch (err) {
          logger.error("sync", `Failed stock deduction for ingredient ${rItem.ingredientId} in Bill ${billId}`, err);
        }
      }
    }

    dbEventBus.emit("inventory.recipe.consumed", { billId });
  }
}

export const consumptionEngine = new ConsumptionEngine();
export default consumptionEngine;
