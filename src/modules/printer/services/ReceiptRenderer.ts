import { EscPosEncoder } from "./EscPosEncoder";
import { ReceiptModel } from "../types/ReceiptModel";
import { PrinterProfile } from "../types/types";
import { imageProcessor } from "./ImageProcessor";
import logger from "@/services/logger/Logger";

export class ReceiptRenderer {
  /**
   * Renders the receipt model to ESC/POS binary data according to a printer's profile.
   */
  public async render(model: ReceiptModel, profile: PrinterProfile): Promise<Uint8Array> {
    const encoder = new EscPosEncoder();
    const cpl = profile.charactersPerLine || (profile.paperWidth === "58mm" ? 32 : 48);

    // Helper for horizontal lines
    const separator = "-".repeat(cpl);

    // Helper to pad columns
    const padToWidth = (left: string, right: string): string => {
      const spaceCount = cpl - left.length - right.length;
      return left + " ".repeat(Math.max(1, spaceCount)) + right;
    };

    // 1. Initialize
    encoder.initialize();
    encoder.font(profile.font || "A");

    // 2. Logo Printing (if supported and enabled)
    if (
      profile.logoEnabled &&
      profile.logoPath &&
      profile.capabilities.supportsImage
    ) {
      try {
        encoder.align("center");
        // Process unique logo image
        const logoData = await imageProcessor.processImage(profile.logoPath);
        encoder.bitmap(logoData.width, logoData.height, logoData.bytes);
        encoder.feed(1);
      } catch (err: any) {
        logger.error("printer", `Failed loading logo image at ${profile.logoPath}`, err);
      }
    }

    // 3. Header Details
    encoder.align("center");
    encoder.bold(true);
    // Double width and height for restaurant name
    encoder.size(2, 2);
    encoder.line(model.header.restaurantName);
    encoder.size(1, 1);
    encoder.bold(false);

    encoder.line(model.header.branchName);
    encoder.line(model.header.address);
    encoder.line(`Tel: ${model.header.phone}`);
    if (model.header.gstin) {
      encoder.line(`GSTIN: ${model.header.gstin}`);
    }
    encoder.line(separator);

    // 4. Meta Information (Left Aligned)
    encoder.align("left");
    Object.entries(model.meta).forEach(([key, val]) => {
      encoder.line(`${key}: ${val}`);
    });
    encoder.line(separator);

    // 5. Table Headers (Items)
    encoder.bold(true);
    if (profile.paperWidth === "58mm") {
      encoder.line("Item             Qty     Price");
    } else {
      encoder.line(padToWidth("Item (Qty x Rate)", "Total"));
    }
    encoder.bold(false);
    encoder.line(separator);

    // 6. Items List
    model.items.forEach((item) => {
      const totalStr = `₹${item.total.toFixed(0)}`;
      
      if (profile.paperWidth === "58mm") {
        // Starters / KOT item lines wrapping
        encoder.line(item.name);
        const qtyRateStr = `  ${item.qty} x ₹${item.rate.toFixed(0)}`;
        encoder.line(padToWidth(qtyRateStr, totalStr));
      } else {
        const qtyRateStr = `${item.qty} x ₹${item.rate.toFixed(0)}`;
        const leftSide = `${item.name} (${qtyRateStr})`;
        if (leftSide.length + totalStr.length >= cpl) {
          encoder.line(item.name);
          encoder.line(padToWidth(`  (${qtyRateStr})`, totalStr));
        } else {
          encoder.line(padToWidth(leftSide, totalStr));
        }
      }
    });
    encoder.line(separator);

    // 7. Summary / Financial metrics
    model.summary.forEach((sum) => {
      if (sum.isBold) {
        encoder.bold(true);
        if (profile.paperWidth === "80mm") {
          encoder.size(2, 1); // Large total
        }
      }
      encoder.line(padToWidth(sum.label, sum.value));
      encoder.size(1, 1);
      encoder.bold(false);
    });
    encoder.line(separator);

    // 8. UPI QR Payment (if provided and supported)
    if (model.footer.upiQrUrl) {
      encoder.align("center");
      if (profile.capabilities.supportsQR) {
        encoder.line("Scan to Pay UPI");
        encoder.feed(1);
        encoder.qrCode(model.footer.upiQrUrl, 6);
        encoder.feed(1);
      } else {
        // Text fallback
        encoder.line("UPI Pay ID Link:");
        encoder.line(model.footer.upiQrUrl);
      }
      encoder.line(separator);
    }

    // 9. Footer notes
    encoder.align("center");
    model.footer.notes.forEach((note) => {
      encoder.line(note);
    });

    // 10. Margin Feed & Cut
    if (profile.marginBottom > 0) {
      encoder.feed(profile.marginBottom);
    } else {
      encoder.feed(3); // Standard feed
    }

    if (profile.capabilities.supportsCut && profile.cutType !== "none") {
      encoder.cut();
    }

    // Cash drawer pulse on billing checkout receipts
    if (model.type === "receipt" && profile.capabilities.supportsCashDrawer) {
      encoder.pulseDrawer();
    }

    return encoder.getBytes();
  }
}

export const receiptRenderer = new ReceiptRenderer();
export default receiptRenderer;
