import { ReceiptModel } from "../types/ReceiptModel";
import { DocumentBuilder } from "./Document";

export interface TestDocumentData {
  printerName: string;
  connectionType: string;
  ipAddress?: string;
  port?: number;
  capabilities: {
    supportsQR: boolean;
    supportsImage: boolean;
    supportsBarcode: boolean;
    supportsCut: boolean;
    supportsCashDrawer: boolean;
  };
}

export class TestDocument implements DocumentBuilder {
  public build(data: TestDocumentData, version = 1): ReceiptModel {
    const meta: Record<string, string> = {
      "Printer": data.printerName,
      "Connection": data.connectionType.toUpperCase(),
      "Date": new Date().toLocaleDateString("en-IN"),
      "Time": new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })
    };

    if (data.ipAddress) {
      meta["IP Address"] = `${data.ipAddress}:${data.port || 9100}`;
    }

    const summary = [
      { label: "Supports Barcodes:", value: data.capabilities.supportsBarcode ? "YES" : "NO" },
      { label: "Supports QR Codes:", value: data.capabilities.supportsQR ? "YES" : "NO" },
      { label: "Supports Images:", value: data.capabilities.supportsImage ? "YES" : "NO" },
      { label: "Supports Auto Cut:", value: data.capabilities.supportsCut ? "YES" : "NO" },
      { label: "Cash Drawer Pulse:", value: data.capabilities.supportsCashDrawer ? "YES" : "NO" },
      { label: "DIAGNOSTICS STATUS:", value: "PASS", isBold: true }
    ];

    return {
      receiptVersion: version,
      type: "test",
      currency: "INR",
      locale: "en-IN",
      timezone: "Asia/Kolkata",
      header: {
        restaurantName: "PAAKASHALA POS",
        branchName: "PRINTER TEST CONNECTION",
        address: "DIAGNOSTICS SYSTEM",
        phone: ""
      },
      meta,
      items: [],
      summary,
      footer: {
        notes: [
          "★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★",
          "If this slip prints clearly, your ESC/POS",
          "thermal printer connection is fully configured",
          "and operational in Paakashala Restaurant OS.",
          "★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★"
        ]
      }
    };
  }
}

export const testDocument = new TestDocument();
export default testDocument;
