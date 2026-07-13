import { calculateCartPromotions } from "@/lib/promotions-engine";
import { Offer } from "@/lib/promotions";
import { CartItem } from "@/lib/paakashala-store";
import { MenuItem } from "@/lib/paakashala-menu";

export interface DiscountResult {
  discountAmount: number;
  savings: number;
  appliedOffers: any[];
  freeItems: any[];
}

export class DiscountEngine {
  public static calculate(
    cartItems: CartItem[],
    offers: Offer[],
    couponCode?: string,
    menuItems?: MenuItem[]
  ): DiscountResult {
    const res = calculateCartPromotions(cartItems, offers, couponCode, menuItems);
    
    return {
      discountAmount: res.discount,
      savings: res.savings,
      appliedOffers: res.appliedOffers,
      freeItems: res.freeItems
    };
  }
}

export default DiscountEngine;
