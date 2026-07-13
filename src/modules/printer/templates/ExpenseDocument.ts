import { ReceiptModel } from "../types/ReceiptModel";
import { DocumentBuilder } from "./Document";

export interface ExpenseData {
  voucherId: string;
  category: string; // e.g. "Milk procurement", "Cleaning supplies"
  amount: number;
  description: string;
  cashierName: string;
  recipientName: string;
}

export class ExpenseDocument implements DocumentBuilder {
  public build(data: ExpenseData, version = 1): ReceiptModel {
    const meta: Record<string, string> = {
      "Voucher ID": data.voucherId,
      "Category": data.category,
      "Recipient": data.recipientName,
      "Cashier": data.cashierName,
      "Date": new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    };

    const summary = [
      { label: "EXPENSE AMOUNT:", value: `₹${data.amount.toFixed(2)}`, isBold: true }
    ];

    return {
      receiptVersion: version,
      type: "expense",
      currency: "INR",
      locale: "en-IN",
      timezone: "Asia/Kolkata",
      header: {
        restaurantName: "CASH EXPENSE VOUCHER",
        branchName: "Paakashala",
        address: "PETTY CASH PAYOUT",
        phone: ""
      },
      meta,
      items: [],
      summary,
      footer: {
        notes: [
          `Purpose: ${data.description}`,
          "--------------------------------",
          "Recipient Signature    Cashier Signature"
        ]
      }
    };
  }
}

export const expenseDocument = new ExpenseDocument();
export default expenseDocument;
