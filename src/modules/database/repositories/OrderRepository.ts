import { BaseRepository } from "./BaseRepository";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";

export interface Order {
  id: string;
  tableId: string;
  items: any[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  total: number;
  status: "pending" | "preparing" | "ready" | "paid" | "cancelled";
  createdAt: number;
  updatedAt?: number;
  customerName?: string;
  mobile?: string;
  appliedCoupon?: string;
  version: number;
  branchId: string;
}

export class OrderRepository extends BaseRepository {
  private mapRowToModel(row: any): Order {
    return {
      id: row.id,
      tableId: row.tableId,
      items: JSON.parse(row.items || "[]"),
      subtotal: row.subtotal || undefined,
      discount: row.discount || undefined,
      tax: row.tax || undefined,
      total: row.grandTotal,
      status: row.status as any,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt || undefined,
      customerName: row.customerName || undefined,
      mobile: row.customerPhone || undefined,
      appliedCoupon: row.appliedCoupon || undefined,
      version: row.version || 1,
      branchId: row.branchId
    };
  }

  public async findById(id: string): Promise<Order | null> {
    const rows = await this.db.query("SELECT * FROM orders WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return this.mapRowToModel(rows[0]);
  }

  public async findPending(): Promise<Order[]> {
    const rows = await this.db.query(
      "SELECT * FROM orders WHERE status IN ('pending', 'preparing', 'ready') ORDER BY createdAt ASC"
    );
    return rows.map(r => this.mapRowToModel(r));
  }

  public async findByTable(tableId: string): Promise<Order | null> {
    const rows = await this.db.query(
      "SELECT * FROM orders WHERE tableId = ? AND status IN ('pending', 'preparing', 'ready') LIMIT 1",
      [tableId]
    );
    if (rows.length === 0) return null;
    return this.mapRowToModel(rows[0]);
  }

  public async getAll(): Promise<Order[]> {
    const rows = await this.db.query("SELECT * FROM orders ORDER BY createdAt DESC");
    return rows.map(r => this.mapRowToModel(r));
  }

  public async create(order: Omit<Order, "version" | "branchId">): Promise<Order> {
    const branchId = "MAIN_BRANCH";
    const recordVersion = 1;
    const now = Date.now();

    await this.db.execute(
      `INSERT INTO orders (
        id, billNumber, tableId, customerName, customerPhone, items, subtotal, discount, tax, grandTotal, 
        status, cashierName, orderType, instructions, version, syncStatus, createdAt, updatedAt, branchId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        `PK-${order.id.substring(0, 6).toUpperCase()}`,
        order.tableId,
        order.customerName || null,
        order.mobile || null,
        JSON.stringify(order.items),
        order.subtotal || null,
        order.discount || 0,
        order.tax || 0,
        order.total,
        order.status,
        "POS Terminal",
        order.tableId ? "dine-in" : "takeaway",
        "",
        recordVersion,
        "pending",
        order.createdAt || now,
        now,
        branchId
      ]
    );

    // Schedule sync job instruction
    const syncJobId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      "INSERT INTO syncQueue (id, entity, operation, entityId, status, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [syncJobId, "orders", "insert", order.id, "pending", now, branchId]
    );

    const result: Order = {
      ...order,
      version: recordVersion,
      branchId
    };

    dbEventBus.emit("order.created", result);
    return result;
  }

  public async update(order: Order): Promise<void> {
    const now = Date.now();
    const nextVersion = order.version + 1;

    // Optimistic Concurrency check
    const rows = await this.db.query("SELECT version FROM orders WHERE id = ?", [order.id]);
    if (rows.length > 0 && rows[0].version !== order.version) {
      throw new Error(`Optimistic lock exception: Order ${order.id} version mismatch.`);
    }

    await this.db.execute(
      `UPDATE orders SET 
        tableId = ?, customerName = ?, customerPhone = ?, items = ?, subtotal = ?, discount = ?, tax = ?, 
        grandTotal = ?, status = ?, version = ?, syncStatus = 'pending', updatedAt = ?
      WHERE id = ?`,
      [
        order.tableId,
        order.customerName || null,
        order.mobile || null,
        JSON.stringify(order.items),
        order.subtotal || null,
        order.discount || 0,
        order.tax || 0,
        order.total,
        order.status,
        nextVersion,
        now,
        order.id
      ]
    );

    // Schedule sync update instruction
    const syncJobId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      "INSERT INTO syncQueue (id, entity, operation, entityId, status, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [syncJobId, "orders", "update", order.id, "pending", now, order.branchId]
    );

    dbEventBus.emit("order.updated", { ...order, version: nextVersion });
  }

  public async cancel(id: string): Promise<void> {
    const order = await this.findById(id);
    if (!order) return;
    
    const now = Date.now();
    const nextVersion = order.version + 1;

    await this.db.execute(
      "UPDATE orders SET status = 'cancelled', version = ?, syncStatus = 'pending', updatedAt = ? WHERE id = ?",
      [nextVersion, now, id]
    );

    const syncJobId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      "INSERT INTO syncQueue (id, entity, operation, entityId, status, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [syncJobId, "orders", "update", id, "pending", now, order.branchId]
    );

    dbEventBus.emit("order.updated", { ...order, status: "cancelled", version: nextVersion });
  }
}

export const orderRepository = new OrderRepository();
export default orderRepository;
