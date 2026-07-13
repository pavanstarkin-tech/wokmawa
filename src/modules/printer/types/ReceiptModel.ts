export interface ReceiptModel {
  receiptVersion: number; // For layout version migrations (e.g. 1, 2)
  type: "receipt" | "kot" | "duplicate" | "refund" | "closing" | "gst" | "expense" | "test";
  currency: string; // e.g. "INR"
  locale: string; // e.g. "en-IN"
  timezone: string; // e.g. "Asia/Kolkata"
  header: {
    logoPath?: string; // Absolute path to unique disk logo
    restaurantName: string;
    branchName: string;
    address: string;
    phone: string;
    gstin?: string;
  };
  meta: Record<string, string>; // e.g. { "Bill No": "PK-1249", "Table": "T4", "Cashier": "Ramesh" }
  items: Array<{
    name: string;
    qty: number;
    rate: number;
    total: number;
  }>;
  summary: Array<{
    label: string;
    value: string;
    isBold?: boolean;
  }>;
  footer: {
    notes: string[];
    upiQrUrl?: string; // Target URL for UPI payment QR codes (if any)
  };
}
