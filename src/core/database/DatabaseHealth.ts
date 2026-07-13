import dbService from "./DatabaseService";
import logger from "@/services/logger/Logger";

export interface HealthReport {
  healthy: boolean;
  databaseSize: string;
  totalOrders: number;
  totalBills: number;
  pendingSync: number;
  integrity: string;
  schemaVersion: number;
}

export class DatabaseHealth {
  private get db() {
    return dbService.getAdapter();
  }

  public async getHealthReport(): Promise<HealthReport> {
    try {
      // 1. Run PRAGMA integrity_check
      const check = await this.db.healthCheck();
      
      // 2. Fetch counts
      const orders = await this.db.query("SELECT COUNT(*) AS count FROM orders");
      const bills = await this.db.query("SELECT COUNT(*) AS count FROM bills");
      const syncs = await this.db.query("SELECT COUNT(*) AS count FROM syncQueue WHERE status = 'pending'");
      const versionRow = await this.db.query("SELECT version FROM database_info LIMIT 1");

      const totalOrders = orders[0]?.count || 0;
      const totalBills = bills[0]?.count || 0;
      const pendingSync = syncs[0]?.count || 0;
      const schemaVersion = versionRow[0]?.version || 1;

      // Estimate DB file size based on table count (since browser sandboxed FS hides actual disk sizes, we give a clean computed estimate or fetch size)
      const sizeEstimateBytes = 1024 * 64 + (totalOrders * 256) + (totalBills * 128);
      const sizeStr = `${(sizeEstimateBytes / 1024).toFixed(1)} KB`;

      return {
        healthy: check.healthy,
        databaseSize: sizeStr,
        totalOrders,
        totalBills,
        pendingSync,
        integrity: check.details || "unknown",
        schemaVersion
      };
    } catch (err: any) {
      logger.error("database", "Failed compiling database health report", err);
      return {
        healthy: false,
        databaseSize: "0 KB",
        totalOrders: 0,
        totalBills: 0,
        pendingSync: 0,
        integrity: err.message,
        schemaVersion: 0
      };
    }
  }

  /**
   * Run database compacting indexes.
   */
  public async compactDatabase(): Promise<void> {
    logger.info("database", "Executing database compacting (VACUUM)...");
    try {
      await this.db.vacuum();
      logger.info("database", "Database compressed and compacted successfully.");
    } catch (err: any) {
      logger.error("database", "Failed compacting database", err);
    }
  }
}

export const databaseHealth = new DatabaseHealth();
export default databaseHealth;
