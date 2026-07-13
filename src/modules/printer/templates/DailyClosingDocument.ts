import { ReceiptModel } from "../types/ReceiptModel";
import { DocumentBuilder } from "./Document";

export interface DailyClosingData {
  shiftId: string;
  cashierName: string;
  openedAt: number;
  closedAt: number;
  openingBalance: number;
  expectedBalance: number;
  actualBalance: number;
  discrepancy: number;
  salesCash: number;
  salesCard: number;
  salesUpi: number;
  salesRazorpay: number;
}

export class DailyClosingDocument implements DocumentBuilder {
  public build(data: DailyClosingData, version = 1): ReceiptModel {
    const totalSales = data.salesCash + data.salesCard + data.salesUpi + data.salesRazorpay;
    
    const meta: Record<string, string> = {
      "Shift ID": data.shiftId,
      "Cashier": data.cashierName,
      "Opened": new Date(data.openedAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }),
      "Closed": new Date(data.closedAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }),
      "Date": new Date().toLocaleDateString("en-IN")
    };

    const summary = [
      { label: "Opening Float:", value: `₹${data.openingBalance.toFixed(2)}` },
      { label: "Cash Sales:", value: `₹${data.salesCash.toFixed(2)}` },
      { label: "Card Sales:", value: `₹${data.salesCard.toFixed(2)}` },
      { label: "UPI Sales:", value: `₹${data.salesUpi.toFixed(2)}` },
      { label: "Razorpay:", value: `₹${data.salesRazorpay.toFixed(2)}` },
      { label: "TOTAL SALES:", value: `₹${totalSales.toFixed(2)}`, isBold: true },
      { label: "Expected Drawer:", value: `₹${data.expectedBalance.toFixed(2)}` },
      { label: "Actual Drawer:", value: `₹${data.actualBalance.toFixed(2)}` },
      { label: "DISCREPANCY:", value: `₹${data.discrepancy.toFixed(2)}`, isBold: data.discrepancy !== 0 }
    ];

    return {
      receiptVersion: version,
      type: "closing",
      currency: "INR",
      locale: "en-IN",
      timezone: "Asia/Kolkata",
      header: {
        restaurantName: "SHIFT CLOSING AUDIT",
        branchName: "Paakashala",
        address: "Bengaluru",
        phone: ""
      },
      meta,
      items: [], // Closing reports contain meta and summary metrics, no itemized items.
      summary,
      footer: {
        notes: [
          "End of Shift Report",
          "Generated via POS Terminal Manager",
          "--------------------------------",
          "Cashier Signature   Manager Signature"
        ]
      }
    };
  }
}

export const dailyClosingDocument = new DailyClosingDocument();
export default dailyClosingDocument;
