import { ReceiptModel } from "../types/ReceiptModel";
import { DocumentBuilder } from "./Document";

export interface ReceiptBillItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ReceiptBillData {
  billNumber: string;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  items: ReceiptBillItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  cashierName: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  upiId?: string;
  gstin?: string;
  logoPath?: string;
  restaurantName?: string;
}

export class ReceiptDocument implements DocumentBuilder {
  public build(data: ReceiptBillData, version = 1): ReceiptModel {
    const isUpi = !!data.upiId;
    const upiLink = isUpi
      ? `upi://pay?pa=${data.upiId}&pn=${encodeURIComponent(data.restaurantName || "Paakashala")}&am=${data.grandTotal.toFixed(2)}&cu=INR`
      : undefined;

    const meta: Record<string, string> = {
      "Bill No": data.billNumber,
      "Date": new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      "Cashier": data.cashierName
    };

    if (data.tableId) meta["Table"] = data.tableId;
    if (data.customerName) meta["Customer"] = data.customerName;
    if (data.customerPhone) meta["Phone"] = `+91 ${data.customerPhone}`;

    const items = data.items.map(it => ({
      name: it.name,
      qty: it.quantity,
      rate: it.price,
      total: it.quantity * it.price
    }));

    const summary: Array<{ label: string; value: string; isBold?: boolean }> = [
      { label: "Subtotal", value: `₹${data.subtotal.toFixed(2)}` }
    ];

    if (data.discount > 0) {
      summary.push({ label: "Promo Discount", value: `-₹${data.discount.toFixed(2)}` });
    }

    summary.push({ label: "GST (5%)", value: `₹${data.tax.toFixed(2)}` });
    summary.push({ label: "GRAND TOTAL", value: `₹${data.grandTotal.toFixed(2)}`, isBold: true });

    return {
      receiptVersion: version,
      type: "receipt",
      currency: "INR",
      locale: "en-IN",
      timezone: "Asia/Kolkata",
      header: {
        logoPath: data.logoPath,
        restaurantName: "PAAKASHALA",
        branchName: data.branchName,
        address: data.branchAddress,
        phone: data.branchPhone,
        gstin: data.gstin
      },
      meta,
      items,
      summary,
      footer: {
        notes: [
          "Thank you for dining with us!",
          "Visit again soon."
        ],
        upiQrUrl: upiLink
      }
    };
  }
}

export const receiptDocument = new ReceiptDocument();
export default receiptDocument;
