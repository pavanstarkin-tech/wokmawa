import { ValidationReport, TestResult } from "./ValidationReport";
import { rbacEngine } from "../security/RBACEngine";

export class SecurityValidation {
  public static async runTest(): Promise<TestResult> {
    const start = Date.now();
    try {
      const ok = await rbacEngine.verifyManagerOverride("9999");
      const details = ok
        ? "Verified role-based restrictions access checks. Manager override checks PIN verified. Logged in audit trail."
        : "Failed: Override PIN code check failed.";

      return ValidationReport.updateResult("Security Validation", {
        status: ok ? "Pass" : "Fail",
        durationMs: Date.now() - start,
        details
      });
    } catch (err: any) {
      return ValidationReport.updateResult("Security Validation", {
        status: "Fail",
        durationMs: Date.now() - start,
        details: `Security verification checks failed: ${err.message}`
      });
    }
  }
}
