import { BaseRepository } from "./BaseRepository";

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  cashierName: string;
}

export class AuditRepository extends BaseRepository {
  public async logAction(
    action: string,
    entity: string,
    entityId: string,
    details: string,
    cashierName: string
  ): Promise<void> {
    const id = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      `INSERT INTO auditLogs (id, timestamp, action, entity, entityId, details, cashierName, branchId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, Date.now(), action, entity, entityId, details, cashierName, "MAIN_BRANCH"]
    );
  }

  public async getLogs(): Promise<AuditEntry[]> {
    const rows = await this.db.query("SELECT * FROM auditLogs ORDER BY timestamp DESC LIMIT 100");
    return rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      details: r.details,
      cashierName: r.cashierName
    }));
  }
}

export const auditRepository = new AuditRepository();
export default auditRepository;
