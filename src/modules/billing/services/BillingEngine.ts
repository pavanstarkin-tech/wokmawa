import { MenuItem } from "@/lib/paakashala-menu";
import { Offer } from "@/lib/promotions";
import { CartItem } from "@/lib/paakashala-store";
import DiscountEngine from "./DiscountEngine";
import TaxCalculator from "./TaxCalculator";
import BillNumberGenerator from "./BillNumberGenerator";

export interface CreateBillParams {
  cartItems: CartItem[];
  offers: Offer[];
  couponCode?: string;
  tipAmount: number;
  cashierName: string;
  tableId?: string;
  customer?: { phone: string; name: string };
  paymentType: "cash" | "card" | "upi" | "razorpay";
  branchId?: string;
  menuItems?: MenuItem[];
}

export interface BillTransaction {
  id: string;
  billNumber: string;
  branchId: string;
  createdAt: number;
  tableId?: string;
  customer?: { phone: string; name: string };
  cashierName: string;
  items: CartItem[];
  freeItems: CartItem[];
  subtotal: number;
  discount: number;
  taxableAmount: number;
  tax: number;
  tip: number;
  grandTotal: number;
  paymentType: "cash" | "card" | "upi" | "razorpay";
  status: "completed" | "pending";
}

export class BillingEngine {
  public static createBill(params: CreateBillParams): BillTransaction {
    const branchId = params.branchId || "MAIN_BRANCH";
    const billNumber = BillNumberGenerator.generate(branchId);

    // 1. Calculate Discounts
    const promo = DiscountEngine.calculate(
      params.cartItems,
      params.offers,
      params.couponCode,
      params.menuItems
    );

    // 2. Calculate Subtotal and Taxable Base
    const subtotal = params.cartItems.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
    const taxableAmount = Math.max(0, subtotal - promo.discountAmount);

    // 3. Calculate Taxes (GST + Service Charges)
    const taxes = TaxCalculator.calculate(taxableAmount);

    // 4. Calculate Final Grand Total
    const grandTotal = Math.round((taxableAmount + taxes.totalTaxes + params.tipAmount) * 100) / 100;

    const id = `bill_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      id,
      billNumber,
      branchId,
      createdAt: Date.now(),
      tableId: params.tableId,
      customer: params.customer,
      cashierName: params.cashierName,
      items: params.cartItems,
      freeItems: promo.freeItems,
      subtotal,
      discount: promo.discountAmount,
      taxableAmount,
      tax: taxes.totalTaxes,
      tip: params.tipAmount,
      grandTotal,
      paymentType: params.paymentType,
      status: "completed"
    };
  }
}

export default BillingEngine;
