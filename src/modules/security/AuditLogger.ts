import dbService from "../../core/database/DatabaseService";
import logger from "@/services/logger/Logger";

export interface AuditRecord {
  actionType: "void_bill" | "change_price" | "discount" | "delete_order";
  tableName: string;
  recordId: string;
  oldValues: string;
  newValues: string;
  userId: string;
  terminalId: string;
}

export class AuditLogger {
  private get db() {
    return dbService.getAdapter();
  }

  public async logOverrideAction(record: AuditRecord): Promise<void> {
    try {
      const id = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await this.db.execute(
        `INSERT INTO global_audit_logs (id, actionType, tableName, recordId, oldValues, newValues, userId, terminalId, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          record.actionType,
          record.tableName,
          record.recordId,
          record.oldValues,
          record.newValues,
          record.userId,
          record.terminalId,
          Date.now()
        ]
      );
      logger.info("security", `Audit action logged: ${record.actionType} on table ${record.tableName}`);
    } catch (err) {
      logger.error("security", "Failed recording audit overrides logs", err);
    }
  }

  public async queryAuditLogs(): Promise<any[]> {
    return this.db.query("SELECT * FROM global_audit_logs ORDER BY timestamp DESC LIMIT 50");
  }
}

export const auditLogger = new AuditLogger();
export default auditLogger;
