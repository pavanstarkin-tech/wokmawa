import dbService from "../database/DatabaseService";
import { dbEventBus } from "../database/DatabaseEventBus";
import logger from "@/services/logger/Logger";

export interface SyncJob {
  id: string;
  entity: string; // 'orders' | 'bills' | 'customers' | 'inventory' | 'menu'
  operation: "insert" | "update" | "delete";
  entityId: string;
  status: "pending" | "uploading" | "failed" | "completed";
  retryCount: number;
  createdAt: number;
  branchId: string;
}

export class SyncQueue {
  private get db() {
    return dbService.getAdapter();
  }

  public async enqueue(
    entity: string,
    operation: SyncJob["operation"],
    entityId: string,
    branchId = "MAIN_BRANCH"
  ): Promise<string> {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO syncQueue (id, entity, operation, entityId, status, retryCount, createdAt, branchId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, entity, operation, entityId, "pending", 0, now, branchId]
    );

    dbEventBus.emit("syncQueue.changed", { id, operation, entity });
    return id;
  }

  public async getPending(): Promise<SyncJob[]> {
    const rows = await this.db.query(
      "SELECT * FROM syncQueue WHERE status IN ('pending', 'failed') ORDER BY createdAt ASC"
    );
    
    return rows.map(r => ({
      id: r.id,
      entity: r.entity,
      operation: r.operation as any,
      entityId: r.entityId,
      status: r.status as any,
      retryCount: r.retryCount || 0,
      createdAt: r.createdAt,
      branchId: r.branchId
    }));
  }

  /**
   * Sorts jobs ensuring dependencies are satisfied (e.g. Orders must sync before Bills or Cash Sessions).
   */
  public sortPendingByDependency(jobs: SyncJob[]): SyncJob[] {
    return [...jobs].sort((a, b) => {
      // Priority weights: orders first (weight 1), then bills (weight 2), then others (weight 3)
      const getWeight = (entity: string) => {
        if (entity === "orders") return 1;
        if (entity === "bills") return 2;
        return 3;
      };
      const wA = getWeight(a.entity);
      const wB = getWeight(b.entity);
      if (wA !== wB) return wA - wB;
      return a.createdAt - b.createdAt;
    });
  }

  public async updateStatus(id: string, status: SyncJob["status"], error?: string): Promise<void> {
    await this.db.execute("UPDATE syncQueue SET status = ? WHERE id = ?", [status, id]);
    dbEventBus.emit("syncQueue.statusChanged", { id, status, error });
  }

  public async incrementRetry(id: string): Promise<void> {
    await this.db.execute("UPDATE syncQueue SET retryCount = retryCount + 1, status = 'failed' WHERE id = ?", [id]);
  }

  public async remove(id: string): Promise<void> {
    await this.db.execute("DELETE FROM syncQueue WHERE id = ?", [id]);
    dbEventBus.emit("syncQueue.changed", { id, operation: "delete" });
  }

  public async clearCompleted(): Promise<void> {
    await this.db.execute("DELETE FROM syncQueue WHERE status = 'completed'");
  }
}

export const syncQueue = new SyncQueue();
export default syncQueue;
