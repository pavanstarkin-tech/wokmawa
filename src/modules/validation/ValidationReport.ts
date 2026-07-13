export interface TestResult {
  name: string;
  status: "Pass" | "Fail";
  durationMs: number;
  details: string;
  lastRun: number;
}

export class ValidationReport {
  private static results: Map<string, TestResult> = new Map();

  public static updateResult(name: string, result: Omit<TestResult, "name" | "lastRun">): TestResult {
    const updated: TestResult = {
      ...result,
      name,
      lastRun: Date.now()
    };
    this.results.set(name, updated);
    return updated;
  }

  public static getResults(): TestResult[] {
    return Array.from(this.results.values());
  }
}
