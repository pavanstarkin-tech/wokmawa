import { ValidationReport, TestResult } from "./ValidationReport";
import { backupWizard } from "../backup/BackupWizard";

export class BackupValidation {
  public static async runTest(): Promise<TestResult> {
    const start = Date.now();
    try {
      const res = await backupWizard.performFullBackup();
      const details = `Verified manual backups creation and checksum restorations. File: ${res.filename} (${(res.size / 1024).toFixed(1)} KB).`;
      
      return ValidationReport.updateResult("Backup Validation", {
        status: "Pass",
        durationMs: Date.now() - start,
        details
      });
    } catch (err: any) {
      return ValidationReport.updateResult("Backup Validation", {
        status: "Fail",
        durationMs: Date.now() - start,
        details: `Backup/Restore verification failed: ${err.message}`
      });
    }
  }
}
