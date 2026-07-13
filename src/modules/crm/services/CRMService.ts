import dbService from "../../../core/database/DatabaseService";
import { unitOfWork } from "../../../core/database/UnitOfWork";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";

export interface Customer {
  id: string;
  phone: string;
  name: string;
  email: string;
  points: number;
  walletBalance: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  birthday?: number;
  anniversary?: number;
  notes?: string;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  isDefault: boolean;
}

export class CRMService {
  private get db() {
    return dbService.getAdapter();
  }

  public async getCustomers(): Promise<Customer[]> {
    return this.db.query("SELECT * FROM customers ORDER BY name ASC");
  }

  public async createCustomer(cust: Omit<Customer, "id">): Promise<string> {
    const id = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      `INSERT INTO customers (id, phone, name, email, points, walletBalance, tier, birthday, anniversary, notes, branchId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, cust.phone, cust.name, cust.email, cust.points || 0, cust.walletBalance || 0,
        cust.tier || "bronze", cust.birthday || null, cust.anniversary || null, cust.notes || "", "MAIN_BRANCH"
      ]
    );
    dbEventBus.emit("customer.created", { id, name: cust.name });
    return id;
  }

  public async getAddresses(customerId: string): Promise<CustomerAddress[]> {
    const rows = await this.db.query("SELECT * FROM customer_addresses WHERE customerId = ?", [customerId]);
    return rows.map(r => ({
      id: r.id,
      customerId: r.customerId,
      addressLine1: r.addressLine1,
      addressLine2: r.addressLine2,
      city: r.city,
      pincode: r.pincode,
      isDefault: r.isDefault === 1
    }));
  }

  public async addAddress(addr: Omit<CustomerAddress, "id">): Promise<string> {
    const id = `addr_${Date.now()}`;
    await unitOfWork.transaction(async () => {
      if (addr.isDefault) {
        await this.db.execute("UPDATE customer_addresses SET isDefault = 0 WHERE customerId = ?", [addr.customerId]);
      }
      await this.db.execute(
        `INSERT INTO customer_addresses (id, customerId, addressLine1, addressLine2, city, pincode, isDefault)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, addr.customerId, addr.addressLine1, addr.addressLine2, addr.city, addr.pincode, addr.isDefault ? 1 : 0]
      );
    });
    return id;
  }

  public async creditWallet(customerId: string, amount: number, pointsToAdd = 0): Promise<void> {
    await unitOfWork.transaction(async () => {
      const rows = await this.db.query("SELECT walletBalance, points FROM customers WHERE id = ?", [customerId]);
      if (rows.length === 0) throw new Error("Customer not found.");
      
      const newBalance = (rows[0].walletBalance || 0) + amount;
      const newPoints = (rows[0].points || 0) + pointsToAdd;
      
      // Compute next tier tier levels
      let nextTier: Customer["tier"] = "bronze";
      if (newPoints >= 5000) nextTier = "platinum";
      else if (newPoints >= 2000) nextTier = "gold";
      else if (newPoints >= 800) nextTier = "silver";

      await this.db.execute(
        "UPDATE customers SET walletBalance = ?, points = ?, tier = ? WHERE id = ?",
        [newBalance, newPoints, nextTier, customerId]
      );
    });
    dbEventBus.emit("customer.wallet.credited", { customerId, amount });
  }

  public async debitWallet(customerId: string, amount: number): Promise<void> {
    await unitOfWork.transaction(async () => {
      const rows = await this.db.query("SELECT walletBalance FROM customers WHERE id = ?", [customerId]);
      if (rows.length === 0) throw new Error("Customer not found.");
      if (rows[0].walletBalance < amount) throw new Error("Insufficient wallet balance.");

      const newBalance = rows[0].walletBalance - amount;
      await this.db.execute("UPDATE customers SET walletBalance = ? WHERE id = ?", [newBalance, customerId]);
    });
    dbEventBus.emit("customer.wallet.debited", { customerId, amount });
  }
}

export const crmService = new CRMService();
export default crmService;
