import { ReceiptModel } from "../types/ReceiptModel";

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export class ReceiptValidator {
  /**
   * Validate a ReceiptModel for structural correctness.
   */
  public static validate(model: ReceiptModel): ValidationResult {
    const errors: string[] = [];

    // 1. Basic properties
    if (!model.receiptVersion) {
      errors.push("Missing receiptVersion metadata");
    }
    if (!model.type) {
      errors.push("Missing receipt type");
    }

    // 2. Header validations
    const header = model.header;
    if (!header) {
      errors.push("Missing header configuration");
    } else {
      if (!header.restaurantName?.trim()) {
        errors.push("Restaurant name in header cannot be empty");
      }
      if (!header.branchName?.trim()) {
        errors.push("Branch name in header cannot be empty");
      }
    }

    // 3. Items validations (for KOT, receipts, duplicates, refunds)
    if (["receipt", "kot", "duplicate", "refund"].includes(model.type)) {
      if (!model.items || model.items.length === 0) {
        errors.push("Document contains an empty items list");
      } else {
        model.items.forEach((item, idx) => {
          if (!item.name?.trim()) {
            errors.push(`Item at index ${idx} is missing a name`);
          }
          if (item.qty <= 0) {
            errors.push(`Item "${item.name || idx}" has an invalid quantity: ${item.qty}`);
          }
        });
      }
    }

    // 4. Financial totals consistency validation
    if (["receipt", "duplicate", "refund"].includes(model.type)) {
      const grandTotalIndex = model.summary.findIndex(
        s => s.label.toLowerCase().includes("grand total") || s.label.toLowerCase().includes("total")
      );
      if (grandTotalIndex === -1 && !model.summary.some(s => s.isBold)) {
        errors.push("Receipt summary is missing a grand total entry");
      }
    }

    // 5. UPI URL Check
    if (model.footer?.upiQrUrl) {
      const url = model.footer.upiQrUrl;
      if (!url.startsWith("upi://") && !url.startsWith("http://") && !url.startsWith("https://")) {
        errors.push(`UPI payment URL has an invalid scheme: "${url.substring(0, 10)}..."`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

export default ReceiptValidator;
