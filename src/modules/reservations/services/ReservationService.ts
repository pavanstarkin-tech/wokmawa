import dbService from "../../../core/database/DatabaseService";
import { unitOfWork } from "../../../core/database/UnitOfWork";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";

export interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  partySize: number;
  reservationTime: number;
  tableId?: string;
  status: "pending" | "seated" | "cancelled" | "no_show";
  notes?: string;
  tableName?: string;
}

export class ReservationService {
  private get db() {
    return dbService.getAdapter();
  }

  public async getReservations(): Promise<Reservation[]> {
    const rows = await this.db.query(`
      SELECT r.*, t.tableName as tableName
      FROM reservations r
      LEFT JOIN tables t ON r.tableId = t.id
      ORDER BY r.reservationTime ASC
    `);
    return rows.map(r => ({
      id: r.id,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      partySize: r.partySize,
      reservationTime: r.reservationTime,
      tableId: r.tableId || undefined,
      status: r.status as any,
      notes: r.notes || "",
      tableName: r.tableName || undefined
    }));
  }

  public async createReservation(res: Omit<Reservation, "id">): Promise<string> {
    const id = `res_${Date.now()}`;
    await this.db.execute(
      `INSERT INTO reservations (id, customerName, customerPhone, partySize, reservationTime, tableId, status, notes, branchId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, res.customerName, res.customerPhone, res.partySize, Number(res.reservationTime),
        res.tableId || null, "pending", res.notes || "", "MAIN_BRANCH"
      ]
    );
    dbEventBus.emit("reservation.created", { id, customerName: res.customerName });
    return id;
  }

  public async updateStatus(reservationId: string, status: Reservation["status"]): Promise<void> {
    await unitOfWork.transaction(async () => {
      await this.db.execute("UPDATE reservations SET status = ? WHERE id = ?", [status, reservationId]);

      // If seated, allocate table occupied status
      if (status === "seated") {
        const rows = await this.db.query("SELECT tableId FROM reservations WHERE id = ?", [reservationId]);
        if (rows.length > 0 && rows[0].tableId) {
          await this.db.execute("UPDATE tables SET status = 'occupied' WHERE id = ?", [rows[0].tableId]);
        }
      }
    });
    dbEventBus.emit("reservation.status.changed", { reservationId, status });
  }

  /**
   * Suggests tables for matching party sizes that are currently vacant.
   */
  public async getSuggestedTables(partySize: number): Promise<any[]> {
    return this.db.query(
      "SELECT * FROM tables WHERE status = 'vacant' AND tableCapacity >= ? ORDER BY tableCapacity ASC",
      [partySize]
    );
  }
}

export const reservationService = new ReservationService();
export default reservationService;
