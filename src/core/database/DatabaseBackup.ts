import dbService from "./DatabaseService";
import logger from "@/services/logger/Logger";

export class DatabaseBackup {
  /**
   * Dispatches a database snapshot backup.
   */
  public async createBackup(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    logger.info("database", "Initiating database backup...");
    try {
      const db = dbService.getAdapter();
      const res = await db.backup();
      if (res.success) {
        logger.info("database", `Database backup completed successfully at: ${res.filePath}`);
      } else {
        logger.error("database", `Database backup failed: ${res.error}`);
      }
      return res;
    } catch (err: any) {
      logger.error("database", "Crash during database backup routine", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Restores the database from a backup path.
   */
  public async restoreBackup(backupPath: string): Promise<{ success: boolean; error?: string }> {
    logger.warn("database", `Initiating database restore from path: ${backupPath}`);
    try {
      const db = dbService.getAdapter();
      const res = await db.restore(backupPath);
      if (res.success) {
        logger.info("database", "Database restored successfully. Reloading cache.");
        // Reload page or force refresh localDb cache
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }
      return res;
    } catch (err: any) {
      logger.error("database", "Failed to restore database from backup file", err);
      return { success: false, error: err.message };
    }
  }
}

export const databaseBackup = new DatabaseBackup();
export default databaseBackup;
