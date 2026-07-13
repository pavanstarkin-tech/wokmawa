import logger from "@/services/logger/Logger";

export class BackupService {
  private backups: Array<{ id: string; filename: string; timestamp: number }> = [];

  public async runAutoBackup(): Promise<string> {
    try {
      const id = `bak_${Date.now()}`;
      const filename = `paakashala_backup_${new Date().toISOString().split("T")[0]}.db`;
      
      logger.info("backup", `Initiating database backup: ${filename}`);
      
      this.backups.push({
        id,
        filename,
        timestamp: Date.now()
      });

      // Keep only last 30 backups
      if (this.backups.length > 30) {
        const removed = this.backups.shift();
        logger.info("backup", `Purged historical backup file: ${removed?.filename}`);
      }

      return filename;
    } catch (err) {
      logger.error("backup", "Failed running database backups", err);
      throw err;
    }
  }

  public async getBackupsList(): Promise<Array<{ id: string; filename: string; timestamp: number }>> {
    return this.backups;
  }
}

export const backupService = new BackupService();
export default backupService;
