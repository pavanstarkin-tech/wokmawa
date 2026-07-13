import { BaseRepository } from "./BaseRepository";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";

export interface RestaurantTable {
  id: string;
  name: string;
  status: "vacant" | "occupied" | "cleaning";
  currentOrderId?: string;
  capacity: number;
  branchId: string;
  updatedAt: number;
}

export class TableRepository extends BaseRepository {
  public async getTables(): Promise<RestaurantTable[]> {
    const rows = await this.db.query("SELECT * FROM tables");
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      status: r.status,
      currentOrderId: r.currentOrderId || undefined,
      capacity: r.capacity,
      branchId: r.branchId,
      updatedAt: r.updatedAt
    }));
  }

  public async getTable(id: string): Promise<RestaurantTable | null> {
    const rows = await this.db.query("SELECT * FROM tables WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      status: r.status,
      currentOrderId: r.currentOrderId || undefined,
      capacity: r.capacity,
      branchId: r.branchId,
      updatedAt: r.updatedAt
    };
  }

  public async updateTableStatus(
    id: string,
    status: RestaurantTable["status"],
    currentOrderId?: string,
    branchId = "MAIN_BRANCH"
  ): Promise<void> {
    const now = Date.now();
    await this.db.execute(
      "UPDATE tables SET status = ?, currentOrderId = ?, updatedAt = ? WHERE id = ?",
      [status, currentOrderId || null, now, id]
    );

    // Emit event
    dbEventBus.emit("tables.updated", { id, status, currentOrderId });
  }
}

export const tableRepository = new TableRepository();
export default tableRepository;
