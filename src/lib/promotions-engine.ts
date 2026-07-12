import type { CartItem } from "./paakashala-store";
import type { Offer, OfferCondition } from "./promotions";
import { MENU, type MenuItem } from "./paakashala-menu";

export interface CalculationResult {
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  savings: number;
  appliedOffers: {
    offer: Offer;
    discountAmount: number;
    description: string;
  }[];
  freeItems: CartItem[];
  unlockedOffers: Offer[];
  lockedOffers: {
    offer: Offer;
    remainingAmount: number;
    message: string;
    progress: number; // 0 to 100
  }[];
}

// Check if an offer is active based on dates, times, and weekdays
export function isOfferScheduleActive(offer: Offer, now: Date = new Date()): boolean {
  if (offer.status !== "active") return false;

  const currentTimestamp = now.getTime();
  
  // Date range check
  if (offer.startDate) {
    const start = new Date(offer.startDate).getTime();
    if (currentTimestamp < start) return false;
  }
  if (offer.endDate) {
    // End date check (include the full end date by setting time to 23:59:59)
    const end = new Date(offer.endDate);
    end.setHours(23, 59, 59, 999);
    if (currentTimestamp > end.getTime()) return false;
  }

  // Weekdays check
  if (offer.weekdays && offer.weekdays.length > 0) {
    const currentWeekday = now.toLocaleDateString("en-US", { weekday: "long" });
    if (!offer.weekdays.includes(currentWeekday)) return false;
  }

  // Time of day check (Happy Hours)
  if (offer.startTime && offer.endTime) {
    const [startH, startM] = offer.startTime.split(":").map(Number);
    const [endH, endM] = offer.endTime.split(":").map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
      return false;
    }
  }

  return true;
}

export function calculateCartPromotions(
  cartItems: CartItem[],
  offers: Offer[],
  couponCode: string | undefined,
  menuItems: MenuItem[] = MENU
): CalculationResult {
  const allProducts = menuItems.length > 0 ? menuItems : MENU;
  const now = new Date();
  
  // 1. Initial calculations
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
  
  // Get currently active promotions
  const activeOffers = offers.filter(offer => isOfferScheduleActive(offer, now));
  
  // Separate coupon offers from automatic promotions
  const autoOffers = activeOffers.filter(o => o.type !== "coupon");
  const couponOffers = activeOffers.filter(o => o.type === "coupon");
  
  // Find applied coupon if code matches
  let appliedCouponOffer: Offer | undefined;
  if (couponCode) {
    const code = couponCode.trim().toUpperCase();
    appliedCouponOffer = couponOffers.find(o => o.couponCode?.toUpperCase() === code);
  }

  // Sort auto offers by priority (descending)
  const sortedOffers = [...autoOffers].sort((a, b) => b.priority - a.priority);
  
  // If coupon is valid, we include it at its priority level
  if (appliedCouponOffer) {
    sortedOffers.push(appliedCouponOffer);
    sortedOffers.sort((a, b) => b.priority - a.priority);
  }

  let totalDiscount = 0;
  const appliedOffersList: CalculationResult["appliedOffers"] = [];
  const freeItemsList: CartItem[] = [];
  const unlockedOffers: Offer[] = [];
  const lockedOffers: CalculationResult["lockedOffers"] = [];
  
  // Copy cart items to track remaining quantities for BOGO/bundles to avoid double application
  const remainingCart = cartItems.map(item => ({ ...item }));

  // Keep track of stacking rules: if we apply a non-stackable offer, we stop applying subsequent offers
  let stackingBlocked = false;

  for (const offer of sortedOffers) {
    // Skip if stacking is blocked by a previous high-priority non-stackable offer
    if (stackingBlocked) continue;

    // Check if the coupon matches (if this is a coupon offer, but wasn't the active one, skip)
    if (offer.type === "coupon" && (!couponCode || offer.couponCode?.toUpperCase() !== couponCode.trim().toUpperCase())) {
      continue;
    }

    let discountAmount = 0;
    let applied = false;
    let desc = "";

    // A. Percentage Discount
    if (offer.type === "percentage" || offer.type === "happy_hours" || offer.type === "weekend" || (offer.type === "coupon" && offer.rewards?.discountPercentage)) {
      const pct = offer.rewards?.discountPercentage || 0;
      
      if (offer.targetType === "entire_order") {
        const minCart = offer.conditions?.minCartValue || 0;
        if (subtotal >= minCart) {
          discountAmount = (subtotal * pct) / 100;
          applied = true;
          desc = `${pct}% Off Entire Order`;
        } else {
          // Locked offer check
          const remainingAmount = minCart - subtotal;
          lockedOffers.push({
            offer,
            remainingAmount,
            message: `Spend ₹${remainingAmount.toFixed(0)} more to unlock ${offer.name}`,
            progress: Math.min(100, Math.max(0, (subtotal / minCart) * 100)),
          });
        }
      } else if (offer.targetType === "categories" && offer.targetCategories) {
        // Apply percent discount only to items in target categories
        let eligibleSum = 0;
        cartItems.forEach(item => {
          if (offer.targetCategories?.includes(item.category)) {
            eligibleSum += (item.price ?? 0) * item.quantity;
          }
        });
        if (eligibleSum > 0) {
          discountAmount = (eligibleSum * pct) / 100;
          applied = true;
          desc = `${pct}% Off on select categories`;
        }
      } else if (offer.targetType === "products" && offer.targetProducts) {
        // Apply percent discount only to target products
        let eligibleSum = 0;
        cartItems.forEach(item => {
          if (offer.targetProducts?.includes(item.id)) {
            eligibleSum += (item.price ?? 0) * item.quantity;
          }
        });
        if (eligibleSum > 0) {
          discountAmount = (eligibleSum * pct) / 100;
          applied = true;
          desc = `${pct}% Off select items`;
        }
      }
    }

    // B. Fixed Discount
    else if (offer.type === "fixed" || (offer.type === "coupon" && offer.rewards?.discountValue)) {
      const val = offer.rewards?.discountValue || 0;
      const minCart = offer.conditions?.minCartValue || 0;
      
      if (subtotal >= minCart) {
        discountAmount = Math.min(val, subtotal - totalDiscount); // don't make total negative
        applied = true;
        desc = `Flat ₹${val} Off`;
      } else {
        const remainingAmount = minCart - subtotal;
        lockedOffers.push({
          offer,
          remainingAmount,
          message: `Spend ₹${remainingAmount.toFixed(0)} more to unlock ${offer.name}`,
          progress: Math.min(100, Math.max(0, (subtotal / minCart) * 100)),
        });
      }
    }

    // C. Cart Value Offers
    else if (offer.type === "cart_value") {
      const minCart = offer.conditions?.minCartValue || 0;
      
      if (subtotal >= minCart) {
        if (offer.rewards?.discountPercentage) {
          discountAmount = (subtotal * offer.rewards.discountPercentage) / 100;
          desc = `${offer.rewards.discountPercentage}% Off for orders above ₹${minCart}`;
        } else if (offer.rewards?.discountValue) {
          discountAmount = offer.rewards.discountValue;
          desc = `₹${offer.rewards.discountValue} Off for orders above ₹${minCart}`;
        }
        applied = true;
      } else {
        const remainingAmount = minCart - subtotal;
        lockedOffers.push({
          offer,
          remainingAmount,
          message: `Spend ₹${remainingAmount.toFixed(0)} more to get ${offer.name}`,
          progress: Math.min(100, Math.max(0, (subtotal / minCart) * 100)),
        });
      }
    }

    // D. Buy One Get One (BOGO) (Buy X of Product A, Get Y of Product A or B Free)
    else if (offer.type === "bogo" || offer.type === "buy_x_get_y") {
      const buyProdId = offer.conditions?.buyProductId;
      const freeProdId = offer.conditions?.freeProductId || buyProdId;
      const buyQty = offer.conditions?.buyQuantity || 1;
      const freeQty = offer.conditions?.freeQuantity || 1;
      const limit = offer.conditions?.limit || 999; // max times it can apply

      if (buyProdId && freeProdId) {
        // Find if user has the buy product in cart
        const buyItem = remainingCart.find(item => item.id === buyProdId);
        
        if (buyItem && buyItem.quantity >= buyQty) {
          // Calculate how many free items we can reward
          const sets = Math.min(Math.floor(buyItem.quantity / buyQty), limit);
          const rewardQty = sets * freeQty;

          if (rewardQty > 0) {
            // Find free product info in MENU
            const productInfo = allProducts.find(p => p.id === freeProdId);
            
            if (productInfo) {
              // If it's the same product (e.g. Buy 1 Biryani, Get 1 Biryani Free),
              // we discount the item in the cart or add a free item
              if (buyProdId === freeProdId) {
                // Discount the item already in the cart
                // The free ones are within the quantity the user ordered.
                // E.g., if user has 2 Biryanis in cart, and it's Buy 1 Get 1, they get 1 free.
                // If they have 1 Biryani, they get 0 free. They must add another to trigger BOGO.
                const freeCountInCart = Math.floor(buyItem.quantity / (buyQty + freeQty)) * freeQty;
                
                if (freeCountInCart > 0) {
                  discountAmount = freeCountInCart * (buyItem.price || 0);
                  applied = true;
                  desc = `BOGO: Buy ${buyQty} Get ${freeQty} Free (Applied to ${freeCountInCart} items)`;
                } else {
                  // Prompt user to add more to unlock BOGO
                  const needed = (buyQty + freeQty) - buyItem.quantity;
                  lockedOffers.push({
                    offer,
                    remainingAmount: needed,
                    message: `Add ${needed} more ${buyItem.name} to get ${freeQty} Free`,
                    progress: Math.min(100, Math.max(0, (buyItem.quantity / (buyQty + freeQty)) * 100)),
                  });
                }
              } else {
                // Different product (e.g. Buy Biryani, Get Drink Free)
                // Look for free product in cart to discount it, OR auto-add it.
                const freeInCart = remainingCart.find(item => item.id === freeProdId);
                
                if (freeInCart) {
                  // Discount the existing item in the cart
                  const discountQty = Math.min(freeInCart.quantity, rewardQty);
                  discountAmount = discountQty * (freeInCart.price || 0);
                  applied = true;
                  desc = `Buy ${buyItem.name} Get ${freeInCart.name} Free`;
                  
                  // Consume from remaining cart quantities
                  freeInCart.quantity -= discountQty;
                } else {
                  // Auto add free item at ₹0
                  const freeCartItem: CartItem = {
                    id: productInfo.id,
                    name: `${productInfo.name} (Free Gift)`,
                    category: productInfo.category,
                    price: 0, // Zero price
                    quantity: rewardQty,
                    image: productInfo.image,
                    type: productInfo.type,
                  };
                  freeItemsList.push(freeCartItem);
                  applied = true;
                  desc = `Free ${productInfo.name} Added!`;
                }
              }
            }
          }
        } else if (buyItem) {
          // User has item but not enough quantity
          const needed = buyQty - buyItem.quantity;
          lockedOffers.push({
            offer,
            remainingAmount: needed,
            message: `Add ${needed} more ${buyItem.name} to trigger ${offer.name}`,
            progress: Math.min(100, (buyItem.quantity / buyQty) * 100),
          });
        }
      }
    }

    // E. Category Based BOGO
    else if (offer.type === "category_bogo") {
      const buyCat = offer.conditions?.buyCategoryId;
      const freeCat = offer.conditions?.freeCategoryId;
      const buyQty = offer.conditions?.buyQuantity || 1;
      const freeQty = offer.conditions?.freeQuantity || 1;

      if (buyCat && freeCat) {
        // Find items in buy category
        const buyItems = remainingCart.filter(item => item.category === buyCat);
        const totalBuyQty = buyItems.reduce((s, item) => s + item.quantity, 0);

        if (totalBuyQty >= buyQty) {
          const rewardQty = Math.floor(totalBuyQty / buyQty) * freeQty;
          
          // Find any items in free category in cart to discount
          const freeItemsInCart = remainingCart.filter(item => item.category === freeCat && item.quantity > 0);
          
          if (freeItemsInCart.length > 0) {
            // Sort by price ascending to discount cheapest items in free category first
            const sortedFree = [...freeItemsInCart].sort((a, b) => (a.price || 0) - (b.price || 0));
            let itemsToDiscount = rewardQty;
            let currentDiscount = 0;

            for (const item of sortedFree) {
              if (itemsToDiscount <= 0) break;
              const discountCount = Math.min(item.quantity, itemsToDiscount);
              currentDiscount += discountCount * (item.price || 0);
              itemsToDiscount -= discountCount;
              item.quantity -= discountCount; // Consume
            }

            if (currentDiscount > 0) {
              discountAmount = currentDiscount;
              applied = true;
              desc = `Free item from ${freeCat} applied`;
            }
          } else {
            // Suggest adding a free item
            lockedOffers.push({
              offer,
              remainingAmount: 1,
              message: `Add any item from ${freeCat} to get it FREE!`,
              progress: 100, // Offer is unlocked but free product is not in cart
            });
          }
        } else {
          // Show progress
          const needed = buyQty - totalBuyQty;
          lockedOffers.push({
            offer,
            remainingAmount: needed,
            message: `Add ${needed} more items from ${buyCat} to get free item from ${freeCat}`,
            progress: Math.min(100, (totalBuyQty / buyQty) * 100),
          });
        }
      }
    }

    // F. Bundle Pricing / Combo Deals (e.g. Any 2 Biryanis for ₹599)
    else if (offer.type === "bundle") {
      const requiredQty = offer.conditions?.requiredQuantity || 2;
      const targetCat = offer.targetCategories?.[0]; // category level bundle
      const bundlePrice = offer.rewards?.bundlePrice || 0;

      if (targetCat) {
        // Find items in this category in cart
        const eligibleItems = remainingCart.filter(item => item.category === targetCat && item.quantity > 0);
        const totalQty = eligibleItems.reduce((s, item) => s + item.quantity, 0);

        if (totalQty >= requiredQty) {
          const sets = Math.floor(totalQty / requiredQty);
          // Sort items by price descending so bundle applies to cheapest or highest? Usually,
          // bundle applies to the items that are in the cart. Let's do price descending:
          const flatItemsList: number[] = [];
          eligibleItems.forEach(item => {
            for (let i = 0; i < item.quantity; i++) {
              flatItemsList.push(item.price || 0);
            }
          });
          
          // Sort ascending so we discount cheapest first (safest for restaurant) or let it be neutral.
          flatItemsList.sort((a, b) => a - b);
          
          let normalSum = 0;
          const itemsBundled = sets * requiredQty;
          for (let i = 0; i < itemsBundled; i++) {
            normalSum += flatItemsList[i];
          }

          const bundleCost = sets * bundlePrice;
          if (normalSum > bundleCost) {
            discountAmount = normalSum - bundleCost;
            applied = true;
            desc = `Bundle: ${itemsBundled} ${targetCat} items for ₹${bundleCost}`;
            
            // Consume from remaining cart
            let remainingToConsume = itemsBundled;
            // Go through eligible items in cart and reduce their remaining quantity
            for (const item of eligibleItems) {
              if (remainingToConsume <= 0) break;
              const consumed = Math.min(item.quantity, remainingToConsume);
              item.quantity -= consumed;
              remainingToConsume -= consumed;
            }
          }
        } else if (totalQty > 0) {
          const needed = requiredQty - totalQty;
          lockedOffers.push({
            offer,
            remainingAmount: needed,
            message: `Add ${needed} more ${targetCat} to get bundle price of ₹${bundlePrice}`,
            progress: (totalQty / requiredQty) * 100,
          });
        }
      }
    }

    // G. Free Gift (Spend ₹1500, Get Ice Cream Free)
    else if (offer.type === "free_gift") {
      const minCart = offer.conditions?.minCartValue || 0;
      const giftProdId = offer.rewards?.giftProductId;

      if (subtotal >= minCart && giftProdId) {
        const productInfo = allProducts.find(p => p.id === giftProdId);
        
        if (productInfo) {
          // See if user already has it in cart, if yes make it free, if not auto-add.
          const giftInCart = remainingCart.find(item => item.id === giftProdId);
          if (giftInCart) {
            discountAmount = giftInCart.price || 0;
            giftInCart.quantity -= 1; // Consume 1 free
          } else {
            // Auto add free gift
            freeItemsList.push({
              id: productInfo.id,
              name: `${productInfo.name} (Free Gift)`,
              category: productInfo.category,
              price: 0,
              quantity: 1,
              image: productInfo.image,
              type: productInfo.type,
            });
          }
          applied = true;
          desc = `Unlocked Free Gift: ${productInfo.name}`;
        }
      } else if (giftProdId) {
        const remainingAmount = minCart - subtotal;
        lockedOffers.push({
          offer,
          remainingAmount,
          message: `Spend ₹${remainingAmount.toFixed(0)} more to get a Free Gift!`,
          progress: Math.min(100, (subtotal / minCart) * 100),
        });
      }
    }

    // If applied successfully, save details and check stacking
    if (applied && discountAmount >= 0) {
      totalDiscount += discountAmount;
      appliedOffersList.push({
        offer,
        discountAmount,
        description: desc,
      });
      unlockedOffers.push(offer);

      if (!offer.isStackable) {
        stackingBlocked = true;
      }
    }
  }

  // Round discount to 2 decimals
  totalDiscount = Math.round(totalDiscount * 100) / 100;
  
  // Calculate Tax (e.g. 5% GST on the discounted total)
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const tax = Math.round(taxableAmount * 0.05 * 100) / 100;
  const grandTotal = Math.round((taxableAmount + tax) * 100) / 100;

  // Deterministic fake discount percentage between 10% and 30% based on item id
  const getFakeDiscountPct = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 10 + Math.abs(hash % 21); // 10 to 30
  };

  // Savings is total discount + difference between MRP and selling price of items in the cart
  const mrpDiff = cartItems.reduce((sum, item) => {
    // If we have an MRP field, calculate original savings
    // We fetch MRP from menuItems list (fallback to cart item if mrp is passed there)
    const menuItem = allProducts.find(m => m.id === item.id);
    const price = item.price || 0;
    
    const discountPct = (menuItem as any)?.mrp && price > 0 && (menuItem as any).mrp > price
      ? Math.round((((menuItem as any).mrp - price) / (menuItem as any).mrp) * 100)
      : getFakeDiscountPct(item.id);

    const mrp = (menuItem as any)?.mrp || (price > 0 ? Math.round(price / (1 - discountPct / 100)) : 0);
    if (mrp > price) {
      return sum + (mrp - price) * item.quantity;
    }
    return sum;
  }, 0);

  const savings = Math.round((totalDiscount + mrpDiff) * 100) / 100;

  return {
    subtotal,
    discount: totalDiscount,
    tax,
    grandTotal,
    savings,
    appliedOffers: appliedOffersList,
    freeItems: freeItemsList,
    unlockedOffers,
    lockedOffers,
  };
}
