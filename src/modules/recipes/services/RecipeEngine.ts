import { recipeRepository, Recipe, RecipeItem } from "../repositories/RecipeRepository";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";

export class RecipeEngine {
  public async getRecipes(): Promise<Recipe[]> {
    return recipeRepository.getRecipes();
  }

  public async getRecipeByItemVariant(menuItemId: string, variantId: string): Promise<Recipe | null> {
    return recipeRepository.findByMenuItemVariant(menuItemId, variantId);
  }

  public async getRecipeItems(recipeId: string): Promise<RecipeItem[]> {
    return recipeRepository.getRecipeItems(recipeId);
  }

  public async saveRecipe(recipe: Recipe, items: RecipeItem[]): Promise<void> {
    // 1. Run validations
    this.validateRecipe(recipe, items);

    // 2. Persist
    await recipeRepository.saveRecipe(recipe, items);

    // 3. Emit events
    dbEventBus.emit("recipe.created", recipe);
    dbEventBus.emit("recipe.cost.changed", { recipeId: recipe.id, totalCost: recipe.totalCost });
  }

  public async deleteRecipe(id: string): Promise<void> {
    await recipeRepository.deleteRecipe(id);
    dbEventBus.emit("recipe.deleted", { id });
  }

  /**
   * Duplicates a recipe, copying all ingredient items to a new portion size variant,
   * scaling quantities by a scaleFactor (e.g. 0.5 for half portions).
   */
  public async duplicateRecipe(
    sourceRecipeId: string,
    targetVariantId: string,
    scaleFactor = 1
  ): Promise<void> {
    const list = await recipeRepository.getRecipes();
    const source = list.find(r => r.id === sourceRecipeId);
    if (!source) throw new Error("Source recipe not found.");

    const items = await recipeRepository.getRecipeItems(sourceRecipeId);

    const newId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const duplicatedHeader: Recipe = {
      ...source,
      id: newId,
      variantId: targetVariantId,
      recipeName: `${source.recipeName} (${targetVariantId})`,
      yieldQuantity: source.yieldQuantity * scaleFactor,
      costPrice: source.costPrice * scaleFactor,
      packagingCost: source.packagingCost, // packaging stays standard
      totalCost: (source.costPrice * scaleFactor) + source.packagingCost + source.labourCost + source.overheadCost,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const duplicatedItems: RecipeItem[] = items.map(item => ({
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      recipeId: newId,
      quantity: item.quantity * scaleFactor
    }));

    await this.saveRecipe(duplicatedHeader, duplicatedItems);
  }

  /**
   * Validates recipe specifications for common configuration issues.
   */
  public validateRecipe(recipe: Recipe, items: RecipeItem[]): void {
    if (items.length === 0) {
      throw new Error("Recipes must contain at least 1 ingredient.");
    }

    const seenIds = new Set<string>();
    for (const item of items) {
      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity (${item.quantity}) specified for ingredient.`);
      }
      if (seenIds.has(item.ingredientId)) {
        throw new Error("Duplicate ingredients are not allowed in a single recipe.");
      }
      seenIds.add(item.ingredientId);
    }
  }
}

export const recipeEngine = new RecipeEngine();
export default recipeEngine;
