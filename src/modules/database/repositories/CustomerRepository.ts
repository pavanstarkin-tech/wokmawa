import { BaseRepository } from "./BaseRepository";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
  branchId: string;
}

export class CustomerRepository extends BaseRepository {
  private mapRowToModel(row: any): Customer {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email || undefined,
      loyaltyPoints: row.loyaltyPoints || 0,
      branchId: row.branchId
    };
  }

  public async getAll(): Promise<Customer[]> {
    const rows = await this.db.query("SELECT * FROM customers");
    return rows.map(r => this.mapRowToModel(r));
  }

  public async findByPhone(phone: string): Promise<Customer | null> {
    const rows = await this.db.query("SELECT * FROM customers WHERE phone = ?", [phone]);
    if (rows.length === 0) return null;
    return this.mapRowToModel(rows[0]);
  }

  public async saveCustomer(customer: Omit<Customer, "branchId">): Promise<Customer> {
    const now = Date.now();
    const branchId = "MAIN_BRANCH";

    await this.db.execute(
      `INSERT OR REPLACE INTO customers (
        id, name, phone, email, loyaltyPoints, syncStatus, createdAt, updatedAt, branchId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.id,
        customer.name,
        customer.phone,
        customer.email || null,
        customer.loyaltyPoints,
        "pending",
        now,
        now,
        branchId
      ]
    );

    // Schedule sync instruction
    const syncJobId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      "INSERT INTO syncQueue (id, entity, operation, entityId, status, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [syncJobId, "customers", "update", customer.id, "pending", now, branchId]
    );

    const result: Customer = {
      ...customer,
      branchId
    };

    dbEventBus.emit("customer.updated", result);
    return result;
  }
}

export const customerRepository = new CustomerRepository();
export default customerRepository;
