import { BaseRepository } from "./BaseRepository";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";

export interface CashSession {
  id: string;
  shiftId: string;
  cashierName: string;
  openedAt: number;
  closedAt?: number;
  openingBalance: number;
  expectedBalance: number;
  actualBalance?: number;
  discrepancy?: number;
  status: "open" | "closed";
  salesCash: number;
  salesCard: number;
  salesUpi: number;
  salesRazorpay: number;
  branchId: string;
}

export interface CashMovement {
  id: string;
  sessionId: string;
  type: "in" | "out";
  amount: number;
  reason: string;
  timestamp: number;
}

export class CashRepository extends BaseRepository {
  private mapRowToSession(row: any): CashSession {
    return {
      id: row.id,
      shiftId: row.shiftId,
      cashierName: row.cashierName,
      openedAt: row.openedAt,
      closedAt: row.closedAt || undefined,
      openingBalance: row.openingBalance || 0,
      expectedBalance: row.expectedBalance || 0,
      actualBalance: row.actualBalance !== null ? row.actualBalance : undefined,
      discrepancy: row.discrepancy !== null ? row.discrepancy : undefined,
      status: row.status as any,
      salesCash: row.salesCash || 0,
      salesCard: row.salesCard || 0,
      salesUpi: row.salesUpi || 0,
      salesRazorpay: row.salesRazorpay || 0,
      branchId: row.branchId
    };
  }

  public async getActiveSession(): Promise<CashSession | null> {
    const rows = await this.db.query("SELECT * FROM cashSessions WHERE status = 'open' LIMIT 1");
    if (rows.length === 0) return null;
    return this.mapRowToSession(rows[0]);
  }

  public async getSessions(): Promise<CashSession[]> {
    const rows = await this.db.query("SELECT * FROM cashSessions ORDER BY openedAt DESC");
    return rows.map(r => this.mapRowToSession(r));
  }

  public async openSession(session: Omit<CashSession, "branchId" | "expectedBalance" | "status" | "salesCash" | "salesCard" | "salesUpi" | "salesRazorpay">): Promise<CashSession> {
    const branchId = "MAIN_BRANCH";
    const expected = session.openingBalance;
    
    await this.db.execute(
      `INSERT INTO cashSessions (
        id, shiftId, cashierName, openedAt, openingBalance, expectedBalance, status, salesCash, salesCard, salesUpi, salesRazorpay, syncStatus, branchId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.shiftId,
        session.cashierName,
        session.openedAt,
        session.openingBalance,
        expected,
        "open",
        0, 0, 0, 0,
        "pending",
        branchId
      ]
    );

    // Schedule sync instruction
    const syncJobId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      "INSERT INTO syncQueue (id, entity, operation, entityId, status, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [syncJobId, "cashSessions", "update", session.id, "pending", Date.now(), branchId]
    );

    const result: CashSession = {
      ...session,
      expectedBalance: expected,
      status: "open",
      salesCash: 0,
      salesCard: 0,
      salesUpi: 0,
      salesRazorpay: 0,
      branchId
    };

    dbEventBus.emit("cashSession.opened", result);
    return result;
  }

  public async closeSession(id: string, closing: { actualBalance: number; closedAt: number }): Promise<void> {
    const session = await this.db.query("SELECT * FROM cashSessions WHERE id = ?", [id]);
    if (session.length === 0) return;
    const s = session[0];

    const discrepancy = closing.actualBalance - s.expectedBalance;

    await this.db.execute(
      `UPDATE cashSessions SET 
        status = 'closed', actualBalance = ?, closedAt = ?, discrepancy = ?, syncStatus = 'pending'
      WHERE id = ?`,
      [closing.actualBalance, closing.closedAt, discrepancy, id]
    );

    // Schedule sync instruction
    const syncJobId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      "INSERT INTO syncQueue (id, entity, operation, entityId, status, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [syncJobId, "cashSessions", "update", id, "pending", Date.now(), s.branchId]
    );

    dbEventBus.emit("cashSession.closed", { id, discrepancy });
  }

  public async addMovement(movement: CashMovement): Promise<void> {
    await this.db.execute(
      "INSERT INTO cashMovements (id, sessionId, type, amount, reason, timestamp, branchId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [movement.id, movement.sessionId, movement.type, movement.amount, movement.reason, movement.timestamp, "MAIN_BRANCH"]
    );

    // Update expectedBalance in active session
    const adjust = movement.type === "in" ? movement.amount : -movement.amount;
    await this.db.execute(
      "UPDATE cashSessions SET expectedBalance = expectedBalance + ? WHERE id = ?",
      [adjust, movement.sessionId]
    );

    dbEventBus.emit("cashMovement.added", movement);
  }

  public async getMovements(sessionId: string): Promise<CashMovement[]> {
    const rows = await this.db.query("SELECT * FROM cashMovements WHERE sessionId = ? ORDER BY timestamp DESC", [sessionId]);
    return rows.map(r => ({
      id: r.id,
      sessionId: r.sessionId,
      type: r.type as any,
      amount: r.amount,
      reason: r.reason,
      timestamp: r.timestamp
    }));
  }

  public async addSaleTransaction(sessionId: string, paymentMethod: string, amount: number): Promise<void> {
    let colName = "salesCash";
    if (paymentMethod === "card") colName = "salesCard";
    if (paymentMethod === "upi") colName = "salesUpi";
    if (paymentMethod === "razorpay") colName = "salesRazorpay";

    // Update cash drawer balance expected count (card/UPI payments do not increase cash float count, only cash does)
    const adjustExpected = paymentMethod === "cash" ? amount : 0;

    await this.db.execute(
      `UPDATE cashSessions SET 
        ${colName} = ${colName} + ?, 
        expectedBalance = expectedBalance + ?
      WHERE id = ?`,
      [amount, adjustExpected, sessionId]
    );
  }
}

export const cashRepository = new CashRepository();
export default cashRepository;
