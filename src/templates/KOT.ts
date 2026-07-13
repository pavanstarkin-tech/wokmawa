import { EscPosEncoder } from "@/modules/printer/services/EscPosEncoder";

export interface KOTData {
  kotNumber: string;
  tableId: string;
  orderType: "dine-in" | "takeaway";
  cashierName: string;
  items: Array<{ name: string; quantity: number; notes?: string }>;
}

export function KOTTemplate(data: KOTData, paperWidth: "58mm" | "80mm" = "80mm"): EscPosEncoder {
  const encoder = new EscPosEncoder();
  const widthChars = paperWidth === "58mm" ? 32 : 48;
  const separator = "-".repeat(widthChars);

  // Pad helper
  const padToWidth = (left: string, right: string): string => {
    const spaceCount = widthChars - left.length - right.length;
    return left + " ".repeat(Math.max(1, spaceCount)) + right;
  };

  encoder.align("center");
  encoder.bold(true);
  encoder.size(2, 2);
  encoder.line("KITCHEN ORDER TICKET");
  encoder.size(1, 1);
  encoder.bold(false);
  encoder.line(separator);

  encoder.align("left");
  encoder.size(2, 1);
  encoder.bold(true);
  encoder.line(`TABLE: ${data.tableId.toUpperCase()}`);
  encoder.line(`KOT ID: ${data.kotNumber}`);
  encoder.size(1, 1);
  encoder.bold(false);
  encoder.line(`Type: ${data.orderType.toUpperCase()}`);
  encoder.line(`Time: ${new Date().toLocaleTimeString()}`);
  encoder.line(`Cashier: ${data.cashierName}`);
  encoder.line(separator);

  // Table header
  encoder.bold(true);
  encoder.line(padToWidth("Item Name", "Qty"));
  encoder.bold(false);
  encoder.line(separator);

  // KOT items (High visibility)
  encoder.size(2, 1);
  encoder.bold(true);
  data.items.forEach((it) => {
    encoder.line(padToWidth(it.name, `x${it.quantity}`));
    if (it.notes) {
      encoder.size(1, 1);
      encoder.bold(false);
      encoder.line(`  * NOTE: ${it.notes}`);
      encoder.size(2, 1);
      encoder.bold(true);
    }
  });
  encoder.size(1, 1);
  encoder.bold(false);

  encoder.line(separator);
  encoder.feed(3);
  encoder.cut();

  return encoder;
}
