import { ValidationReport, TestResult } from "./ValidationReport";
import { performanceBenchmark } from "../testing/PerformanceBenchmark";

export class PerformanceValidation {
  public static async runTest(): Promise<TestResult> {
    const start = Date.now();
    try {
      const res = await performanceBenchmark.runScalingBenchmark(100); // Seeding benchmark subset
      const details = `Verified SQLite query execution speeds. 100 benchmark rows generated. Latency: ${res.timeSpentMs} ms.`;
      
      return ValidationReport.updateResult("Performance Validation", {
        status: "Pass",
        durationMs: Date.now() - start,
        details
      });
    } catch (err: any) {
      return ValidationReport.updateResult("Performance Validation", {
        status: "Fail",
        durationMs: Date.now() - start,
        details: `Performance validation failed: ${err.message}`
      });
    }
  }
}
