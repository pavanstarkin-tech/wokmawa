import dbService from "./DatabaseService";
import logger from "@/services/logger/Logger";

export class UnitOfWork {
  /**
   * Executes multiple database writes inside a single ACID transaction block.
   * Auto-rollbacks changes upon any failure.
   */
  public async transaction(callback: () => Promise<void>): Promise<void> {
    const db = dbService.getAdapter();
    try {
      await db.execute("BEGIN TRANSACTION;");
      await callback();
      await db.execute("COMMIT;");
    } catch (err: any) {
      try {
        await db.execute("ROLLBACK;");
      } catch (rollbackErr) {
        logger.error("database", "Rollback execution failed", rollbackErr);
      }
      logger.error("database", "Unit of Work transaction aborted and rolled back", err);
      throw err;
    }
  }
}

export const unitOfWork = new UnitOfWork();
export default unitOfWork;
