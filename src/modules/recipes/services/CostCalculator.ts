import { Recipe, RecipeItem } from "../repositories/RecipeRepository";

export interface CostBreakdown {
  rawIngredientsCost: number;
  packagingCost: number;
  labourCost: number;
  overheadCost: number;
  totalCost: number;
  grossMarginPercent: number;
  foodCostPercent: number;
  suggestedPrice: number;
}

export class CostCalculator {
  /**
   * Computes the complete cost profile of a recipe given its item details and active selling price.
   */
  public static calculateCost(
    recipe: Recipe,
    items: RecipeItem[],
    sellingPrice = 0
  ): CostBreakdown {
    // 1. Sum up ingredient contributions accounting for yield loss wastage percentages
    const rawIngredientsCost = items.reduce((sum, item) => {
      const baseCost = item.ingredientCostPrice || 0;
      const quantityUsed = item.quantity || 0;
      const wasteFactor = 1 + (item.wastagePercent || 0) / 100;
      return sum + (baseCost * quantityUsed * wasteFactor);
    }, 0);

    const packagingCost = recipe.packagingCost || 0;
    const labourCost = recipe.labourCost || 0;
    const overheadCost = recipe.overheadCost || 0;

    const totalCost = rawIngredientsCost + packagingCost + labourCost + overheadCost;

    // 2. Compute Food Cost percentage comparing recipe total cost with active menu selling price
    let foodCostPercent = 0;
    let grossMarginPercent = 0;

    if (sellingPrice > 0) {
      foodCostPercent = (totalCost / sellingPrice) * 100;
      grossMarginPercent = ((sellingPrice - totalCost) / sellingPrice) * 100;
    }

    // 3. Suggest a selling price based on standard 30% Food Cost target
    const targetFoodCostFactor = 0.30; // 30%
    const suggestedPrice = totalCost / targetFoodCostFactor;

    return {
      rawIngredientsCost,
      packagingCost,
      labourCost,
      overheadCost,
      totalCost,
      grossMarginPercent,
      foodCostPercent,
      suggestedPrice
    };
  }
}

export default CostCalculator;
