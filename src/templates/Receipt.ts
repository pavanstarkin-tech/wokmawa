import { EscPosEncoder } from "@/modules/printer/services/EscPosEncoder";

export interface ReceiptData {
  billNumber: string;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  cashierName: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  upiId?: string;
}

export function ReceiptTemplate(data: ReceiptData, paperWidth: "58mm" | "80mm" = "80mm"): EscPosEncoder {
  const encoder = new EscPosEncoder();
  const widthChars = paperWidth === "58mm" ? 32 : 48;

  // Helper for border lines
  const separator = "-".repeat(widthChars);

  // Helper to pad columns
  const padToWidth = (left: string, right: string): string => {
    const spaceCount = widthChars - left.length - right.length;
    return left + " ".repeat(Math.max(1, spaceCount)) + right;
  };

  encoder.align("center");
  encoder.bold(true);
  encoder.size(2, 2);
  encoder.line("PAAKASHALA");
  encoder.size(1, 1);
  encoder.bold(false);
  encoder.line(data.branchName);
  encoder.line(data.branchAddress);
  encoder.line(`Tel: ${data.branchPhone}`);
  encoder.line(separator);

  encoder.align("left");
  encoder.line(`Bill: ${data.billNumber}`);
  encoder.line(`Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
  encoder.line(`Cashier: ${data.cashierName}`);
  if (data.tableId) encoder.line(`Table: ${data.tableId}`);
  if (data.customerName) encoder.line(`Customer: ${data.customerName}`);
  if (data.customerPhone) encoder.line(`Phone: +91 ${data.customerPhone}`);
  encoder.line(separator);

  // Table Headers
  encoder.bold(true);
  if (paperWidth === "58mm") {
    encoder.line("Item Qty Price");
  } else {
    encoder.line(padToWidth("Item (Qty x Price)", "Total"));
  }
  encoder.bold(false);
  encoder.line(separator);

  // Items List
  data.items.forEach((it) => {
    const total = it.quantity * it.price;
    const nameStr = `${it.name}`;
    const qtyPriceStr = `${it.quantity} x ₹${it.price.toFixed(0)}`;
    const totalStr = `₹${total.toFixed(0)}`;

    if (paperWidth === "58mm") {
      encoder.line(nameStr);
      encoder.line(padToWidth(`  ${qtyPriceStr}`, totalStr));
    } else {
      encoder.line(padToWidth(`${nameStr} (${qtyPriceStr})`, totalStr));
    }
  });

  encoder.line(separator);

  // Summary Math
  encoder.line(padToWidth("Subtotal:", `₹${data.subtotal.toFixed(2)}`));
  if (data.discount > 0) {
    encoder.line(padToWidth("Discount:", `-₹${data.discount.toFixed(2)}`));
  }
  encoder.line(padToWidth("GST (5%):", `₹${data.tax.toFixed(2)}`));
  encoder.line(separator);

  // Grand Total
  encoder.bold(true);
  encoder.size(2, 1);
  encoder.line(padToWidth("GRAND TOTAL:", `₹${data.grandTotal.toFixed(2)}`));
  encoder.size(1, 1);
  encoder.bold(false);
  encoder.line(separator);

  // Payment UPI QR indicator
  if (data.upiId) {
    encoder.align("center");
    encoder.line("Scan to Pay UPI");
    encoder.line(data.upiId);
    encoder.line(separator);
  }

  // Footer notes
  encoder.align("center");
  encoder.line("Thank you for dining with us!");
  encoder.line("Visit again soon.");
  encoder.feed(3);
  encoder.cut();

  return encoder;
}
