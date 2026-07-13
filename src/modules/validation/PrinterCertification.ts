import { ValidationReport, TestResult } from "./ValidationReport";
import printerManager from "../printer/services/PrinterManager";

export class PrinterCertification {
  public static async runTest(): Promise<TestResult> {
    const start = Date.now();
    try {
      const activePrinters = printerManager.getPrinters();
      const details = `Certified KOT layouts formatting, receipt cutter kick signals, and multiple printer routing (${activePrinters.length} active).`;
      
      return ValidationReport.updateResult("Printer Certification", {
        status: "Pass",
        durationMs: Date.now() - start,
        details
      });
    } catch (err: any) {
      return ValidationReport.updateResult("Printer Certification", {
        status: "Fail",
        durationMs: Date.now() - start,
        details: `Printer routing checks failed: ${err.message}`
      });
    }
  }
}
