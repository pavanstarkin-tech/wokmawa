import dbService from "../../../core/database/DatabaseService";
import { unitOfWork } from "../../../core/database/UnitOfWork";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";

export class VendorLedgerEngine {
  private get db() {
    return dbService.getAdapter();
  }

  /**
   * Posts credit items (e.g. GRN purchases) which increase outstanding vendor balances.
   */
  public async postCredit(vendorId: string, refType: string, refId: string, amount: number): Promise<void> {
    await unitOfWork.transaction(async () => {
      // 1. Get current balance
      const currentBalance = await this.getVendorBalance(vendorId);
      const newBalance = currentBalance + amount;

      // 2. Insert ledger transaction
      const ledgerId = `vled_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await this.db.execute(
        `INSERT INTO vendor_ledger (id, vendorId, referenceType, referenceId, debit, credit, balance, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [ledgerId, vendorId, refType, refId, 0, amount, newBalance, Date.now()]
      );

      // 3. Update vendor master profile balance
      await this.db.execute("UPDATE vendors SET updatedAt = ? WHERE id = ?", [Date.now(), vendorId]);
    });

    dbEventBus.emit("vendor.balance.updated", { vendorId });
  }

  /**
   * Posts debit items (e.g. payments made, returned goods) which decrease outstanding vendor balances.
   */
  public async postDebit(vendorId: string, refType: string, refId: string, amount: number): Promise<void> {
    await unitOfWork.transaction(async () => {
      // 1. Get current balance
      const currentBalance = await this.getVendorBalance(vendorId);
      const newBalance = currentBalance - amount;

      // 2. Insert ledger transaction
      const ledgerId = `vled_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await this.db.execute(
        `INSERT INTO vendor_ledger (id, vendorId, referenceType, referenceId, debit, credit, balance, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [ledgerId, vendorId, refType, refId, amount, 0, newBalance, Date.now()]
      );

      // 3. Update vendor master profile balance
      await this.db.execute("UPDATE vendors SET updatedAt = ? WHERE id = ?", [Date.now(), vendorId]);
    });

    dbEventBus.emit("vendor.balance.updated", { vendorId });
  }

  /**
   * Records a payment to a vendor, updating logs and posting debit details.
   */
  public async recordPayment(
    vendorId: string,
    amount: number,
    paymentMode: string,
    transactionNumber: string,
    notes = ""
  ): Promise<void> {
    const paymentId = `vpmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    await unitOfWork.transaction(async () => {
      // 1. Insert payment entry
      await this.db.execute(
        `INSERT INTO vendor_payments (id, vendorId, amount, paymentMode, transactionNumber, paymentDate, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [paymentId, vendorId, amount, paymentMode, transactionNumber, now, notes]
      );

      // 2. Post debit to update ledger balance
      await this.postDebit(vendorId, "payment", paymentId, amount);
    });

    dbEventBus.emit("vendor.payment.received", { vendorId, amount });
  }

  public async getLedgerLogs(vendorId: string): Promise<any[]> {
    return this.db.query(
      "SELECT * FROM vendor_ledger WHERE vendorId = ? ORDER BY timestamp DESC",
      [vendorId]
    );
  }

  public async getVendorPayments(vendorId: string): Promise<any[]> {
    return this.db.query(
      "SELECT * FROM vendor_payments WHERE vendorId = ? ORDER BY paymentDate DESC",
      [vendorId]
    );
  }

  /**
   * Helper to retrieve outstanding vendor balances.
   * Compiles credit sum minus debit sum.
   */
  public async getVendorBalance(vendorId: string): Promise<number> {
    const rows = await this.db.query(
      "SELECT SUM(credit) as totalCredit, SUM(debit) as totalDebit FROM vendor_ledger WHERE vendorId = ?",
      [vendorId]
    );
    const credits = rows[0]?.totalCredit || 0;
    const debits = rows[0]?.totalDebit || 0;
    return credits - debits;
  }
}

export const vendorLedgerEngine = new VendorLedgerEngine();
export default vendorLedgerEngine;
