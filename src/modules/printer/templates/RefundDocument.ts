import { ReceiptModel } from "../types/ReceiptModel";
import { DocumentBuilder } from "./Document";

export interface RefundData {
  refundId: string;
  originalBillNumber: string;
  reason: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  refundTotal: number;
  cashierName: string;
}

export class RefundDocument implements DocumentBuilder {
  public build(data: RefundData, version = 1): ReceiptModel {
    const meta: Record<string, string> = {
      "Refund ID": data.refundId,
      "Orig Bill": data.originalBillNumber,
      "Cashier": data.cashierName,
      "Date": new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    };

    const items = data.items.map(it => ({
      name: it.name,
      qty: it.quantity,
      rate: it.price,
      total: it.quantity * it.price
    }));

    const summary = [
      { label: "REFUND TOTAL:", value: `₹${data.refundTotal.toFixed(2)}`, isBold: true }
    ];

    return {
      receiptVersion: version,
      type: "refund",
      currency: "INR",
      locale: "en-IN",
      timezone: "Asia/Kolkata",
      header: {
        restaurantName: "CREDIT / REFUND NOTE",
        branchName: "Paakashala",
        address: "Bengaluru",
        phone: ""
      },
      meta,
      items,
      summary,
      footer: {
        notes: [
          `Reason: ${data.reason}`,
          "Please verify original bill receipt",
          "--------------------------------",
          "Customer Signature    Cashier Signature"
        ]
      }
    };
  }
}

export const refundDocument = new RefundDocument();
export default refundDocument;
