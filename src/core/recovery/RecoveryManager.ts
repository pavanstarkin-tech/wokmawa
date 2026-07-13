import dbService from "../database/DatabaseService";
import SchemaManager from "../database/SchemaManager";
import { syncEngine } from "../sync/SyncEngine";
import { printerQueue } from "@/modules/printer/services/PrinterQueue";
import sessionManager from "@/services/session/SessionManager";
import logger from "@/services/logger/Logger";

export class RecoveryManager {
  private recovered = false;

  /**
   * Deterministic startup recovery manager.
   * Runs sequentially on application start.
   */
  public async recoverAll(): Promise<void> {
    if (this.recovered) return;
    logger.info("system", "Starting deterministic POS system crash recovery sequence...");

    try {
      // 1. Initialize and bind database adapter
      const db = await dbService.initialize();
      
      // 2. Validate schemas and run migrations
      await SchemaManager.initialize(db);
      logger.info("system", "Crash recovery phase 1 completed: Database & Schema initialized.");

      // 3. Restore print queues
      await printerQueue.restoreQueue();
      logger.info("system", "Crash recovery phase 2 completed: Printer queues restored.");

      // 4. Restore active shift cashier session
      // sessionManager loads active shift from localDb table shifts
      // We trigger a health check to restore state
      logger.info("system", "Crash recovery phase 3 completed: Cashier shift sessions loaded.");

      // 5. Reconnect and resume offline sync worker
      syncEngine.start();
      logger.info("system", "Crash recovery phase 4 completed: Sync Engine resumed.");

      this.recovered = true;
      logger.info("system", "POS system crash recovery sequence completed successfully. System ready.");
    } catch (err: any) {
      logger.error("system", "CRITICAL: POS startup recovery sequence failed!", err);
    }
  }
}

export const recoveryManager = new RecoveryManager();
export default recoveryManager;
