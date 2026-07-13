import { ReceiptModel } from "../types/ReceiptModel";
import { DocumentBuilder } from "./Document";

export interface KOTItem {
  name: string;
  quantity: number;
}

export interface KOTData {
  kotNumber: string;
  tableId: string;
  orderType: "dine-in" | "takeaway" | "delivery";
  cashierName: string;
  items: KOTItem[];
  instructions?: string;
}

export class KOTDocument implements DocumentBuilder {
  public build(data: KOTData, version = 1): ReceiptModel {
    const meta: Record<string, string> = {
      "KOT No": data.kotNumber,
      "Table": data.tableId,
      "Type": data.orderType.toUpperCase(),
      "Date": new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }),
      "Server": data.cashierName
    };

    const items = data.items.map(it => ({
      name: it.name,
      qty: it.quantity,
      rate: 0,
      total: 0
    }));

    const footerNotes = ["*** KITCHEN ORDER TICKET ***"];
    if (data.instructions) {
      footerNotes.unshift(`Instructions: ${data.instructions}`);
    }

    return {
      receiptVersion: version,
      type: "kot",
      currency: "INR",
      locale: "en-IN",
      timezone: "Asia/Kolkata",
      header: {
        restaurantName: "KITCHEN COPY",
        branchName: "Paakashala",
        address: "KOT ROUTING",
        phone: ""
      },
      meta,
      items,
      summary: [], // KOTs have no prices/totals
      footer: {
        notes: footerNotes
      }
    };
  }
}

export const kotDocument = new KOTDocument();
export default kotDocument;
