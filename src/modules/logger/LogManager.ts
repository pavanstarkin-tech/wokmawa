import dbService from "../../core/database/DatabaseService";

export class LogManager {
  private get db() {
    return dbService.getAdapter();
  }

  public async logSystemMessage(
    category: "database" | "sync" | "printer" | "payments" | "security",
    level: "info" | "warn" | "error",
    message: string
  ): Promise<void> {
    try {
      const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await this.db.execute(
        "INSERT INTO system_logs (id, category, level, message, timestamp) VALUES (?, ?, ?, ?, ?)",
        [id, category, level, message, Date.now()]
      );
    } catch {
      // Quiet fail to avoid logging recursion loops
    }
  }

  public async fetchSystemLogs(category?: string): Promise<any[]> {
    if (category) {
      return this.db.query(
        "SELECT * FROM system_logs WHERE category = ? ORDER BY timestamp DESC LIMIT 100",
        [category]
      );
    }
    return this.db.query("SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 100");
  }
}

export const logManager = new LogManager();
export default logManager;
