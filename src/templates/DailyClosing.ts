import { EscPosEncoder } from "@/modules/printer/services/EscPosEncoder";

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
  notes?: string;
}

export function DailyClosingTemplate(data: DailyClosingData, paperWidth: "58mm" | "80mm" = "80mm"): EscPosEncoder {
  const encoder = new EscPosEncoder();
  const widthChars = paperWidth === "58mm" ? 32 : 48;
  const separator = "-".repeat(widthChars);

  const padToWidth = (left: string, right: string): string => {
    const spaceCount = widthChars - left.length - right.length;
    return left + " ".repeat(Math.max(1, spaceCount)) + right;
  };

  encoder.align("center");
  encoder.bold(true);
  encoder.size(2, 1);
  encoder.line("SHIFT CLOSING REPORT");
  encoder.size(1, 1);
  encoder.bold(false);
  encoder.line(separator);

  encoder.align("left");
  encoder.line(`Shift ID: ${data.shiftId}`);
  encoder.line(`Cashier: ${data.cashierName}`);
  encoder.line(`Opened: ${new Date(data.openedAt).toLocaleString()}`);
  encoder.line(`Closed: ${new Date(data.closedAt).toLocaleString()}`);
  encoder.line(separator);

  encoder.bold(true);
  encoder.line("PAYMENT TYPE SALES");
  encoder.bold(false);
  encoder.line(padToWidth("Cash Sales:", `₹${data.salesCash.toFixed(2)}`));
  encoder.line(padToWidth("Card Sales:", `₹${data.salesCard.toFixed(2)}`));
  encoder.line(padToWidth("UPI Sales:", `₹${data.salesUpi.toFixed(2)}`));
  encoder.line(padToWidth("Razorpay:", `₹${data.salesRazorpay.toFixed(2)}`));
  encoder.line(separator);

  encoder.bold(true);
  encoder.line("DRAWER BALANCING");
  encoder.bold(false);
  encoder.line(padToWidth("Opening Balance:", `₹${data.openingBalance.toFixed(2)}`));
  encoder.line(padToWidth("Expected Cash:", `₹${data.expectedBalance.toFixed(2)}`));
  encoder.line(padToWidth("Actual Cash:", `₹${data.actualBalance.toFixed(2)}`));
  
  if (data.discrepancy !== 0) {
    encoder.bold(true);
    encoder.line(padToWidth("Drawer Difference:", `₹${data.discrepancy.toFixed(2)}`));
    encoder.bold(false);
  } else {
    encoder.line(padToWidth("Drawer Status:", "BALANCED"));
  }

  if (data.notes) {
    encoder.line(separator);
    encoder.line("Notes:");
    encoder.line(`  ${data.notes}`);
  }

  encoder.line(separator);
  encoder.align("center");
  encoder.line("Report Generated Autonomously");
  encoder.line("Paakashala Restaurant OS");
  encoder.feed(3);
  encoder.cut();

  return encoder;
}
