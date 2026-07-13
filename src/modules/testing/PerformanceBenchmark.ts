import dbService from "../../core/database/DatabaseService";
import { unitOfWork } from "../../core/database/UnitOfWork";
import logger from "@/services/logger/Logger";

export class PerformanceBenchmark {
  private get db() {
    return dbService.getAdapter();
  }

  public async runScalingBenchmark(count = 1000): Promise<{ timeSpentMs: number; status: string }> {
    const start = Date.now();
    logger.info("testing", `Starting SQLite scaling benchmark: inserting ${count} transactions.`);

    try {
      await unitOfWork.transaction(async () => {
        // Enforce batch seeding
        for (let i = 0; i < count; i++) {
          const id = `bench_${Date.now()}_${i}`;
          await this.db.execute(
            `INSERT INTO global_audit_logs (id, actionType, tableName, recordId, oldValues, newValues, userId, terminalId, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              "void_bill",
              "bills",
              `bill_${i}`,
              `{"price": 100}`,
              `{"price": 0}`,
              "benchmark_user",
              "terminal_1",
              Date.now()
            ]
          );
        }
      });

      const end = Date.now();
      const diff = end - start;
      logger.info("testing", `SQLite benchmark completed successfully in ${diff} ms.`);
      return {
        timeSpentMs: diff,
        status: `Success: Seeded ${count} records. SQLite is responsive.`
      };
    } catch (err: any) {
      logger.error("testing", "Benchmark scaling run failed", err);
      return { timeSpentMs: 0, status: `Failed: ${err.message}` };
    }
  }
}

export const performanceBenchmark = new PerformanceBenchmark();
export default performanceBenchmark;
