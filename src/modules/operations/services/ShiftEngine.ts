import dbService from "../../../core/database/DatabaseService";
import { unitOfWork } from "../../../core/database/UnitOfWork";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";

export interface Shift {
  id: string;
  shiftName: string;
  openedBy: string;
  closedBy?: string;
  openingTime: number;
  closingTime?: number;
  openingFloat: number;
  expectedClosing: number;
  actualClosing?: number;
  variance?: number;
  status: "open" | "closed";
  managerId?: string;
  terminalId?: string;
  openingNotes?: string;
  closingNotes?: string;
  branchId: string;
}

export class ShiftEngine {
  private get db() {
    return dbService.getAdapter();
  }

  public async getActiveShift(): Promise<Shift | null> {
    const rows = await this.db.query("SELECT * FROM shifts WHERE status = 'open' LIMIT 1");
    if (rows.length === 0) return null;
    return this.mapRowToShift(rows[0]);
  }

  public async openShift(
    openedBy: string,
    openingFloat: number,
    managerId?: string,
    terminalId?: string,
    openingNotes = ""
  ): Promise<string> {
    // Check if an active shift is already open
    const active = await this.getActiveShift();
    if (active) {
      throw new Error(`Shift ${active.shiftName} is currently already open.`);
    }

    const id = `shift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const shiftName = `Shift-${new Date().toLocaleDateString()} - ${openedBy}`;

    await unitOfWork.transaction(async () => {
      // 1. Create shift record
      await this.db.execute(
        `INSERT INTO shifts (
          id, shiftName, openedBy, closedBy, openingTime, closingTime, openingFloat,
          expectedClosing, actualClosing, variance, status, managerId, terminalId, openingNotes, closingNotes, branchId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, shiftName, openedBy, null, Date.now(), null, openingFloat,
          openingFloat, null, null, "open", managerId || null, terminalId || null, openingNotes, "", "MAIN_BRANCH"
        ]
      );

      // 2. Log opening cash movement
      const movId = `cmov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await this.db.execute(
        `INSERT INTO cash_movements (id, shiftId, movementType, amount, reason, referenceType, referenceId, performedBy, timestamp, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [movId, id, "Opening Float", openingFloat, "Initial Shift cash float allocation", "shift", id, openedBy, Date.now(), "MAIN_BRANCH"]
      );
    });

    dbEventBus.emit("shift.opened", { id, shiftName });
    return id;
  }

  public async recordCashMovement(
    shiftId: string,
    type: string,
    amount: number,
    reason: string,
    refType: string,
    refId: string,
    performedBy: string
  ): Promise<void> {
    const id = `cmov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      `INSERT INTO cash_movements (id, shiftId, movementType, amount, reason, referenceType, referenceId, performedBy, timestamp, branchId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, shiftId, type, amount, reason, refType, refId, performedBy, Date.now(), "MAIN_BRANCH"]
    );

    // Update expectedClosing float
    const shift = await this.db.query("SELECT expectedClosing FROM shifts WHERE id = ?", [shiftId]);
    if (shift.length > 0) {
      const isAddition = ["Sale", "Opening Float", "Cash Deposit", "Adjustment"].includes(type);
      const adjustment = isAddition ? amount : -amount;
      const nextExpected = (shift[0].expectedClosing || 0) + adjustment;
      await this.db.execute("UPDATE shifts SET expectedClosing = ? WHERE id = ?", [nextExpected, shiftId]);
    }

    dbEventBus.emit("cash.added", { shiftId, amount, type });
  }

  public async closeShift(
    shiftId: string,
    closedBy: string,
    actualFloat: number,
    closingNotes = "",
    denominations: Array<{ denomination: number; actualQty: number; expectedQty: number }> = []
  ): Promise<void> {
    // 1. Validation checklist
    await this.validateBeforeClosing(shiftId);

    // 2. Fetch expected value
    const rows = await this.db.query("SELECT expectedClosing FROM shifts WHERE id = ?", [shiftId]);
    if (rows.length === 0) throw new Error("Shift not found.");
    const expected = rows[0].expectedClosing || 0;
    const variance = actualFloat - expected;

    await unitOfWork.transaction(async () => {
      // A. Update header status to closed
      await this.db.execute(
        `UPDATE shifts
         SET status = 'closed', closedBy = ?, closingTime = ?, actualClosing = ?, variance = ?, closingNotes = ?
         WHERE id = ?`,
        [closedBy, Date.now(), actualFloat, variance, closingNotes, shiftId]
      );

      // B. Save denominations count logs
      for (const d of denominations) {
        const dId = `den_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const itemVar = d.actualQty - d.expectedQty;
        await this.db.execute(
          `INSERT INTO cash_denominations (id, shiftId, denomination, expectedQuantity, actualQuantity, variance, total)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [dId, shiftId, d.denomination, d.expectedQty, d.actualQty, itemVar, d.denomination * d.actualQty]
        );
      }
    });

    dbEventBus.emit("shift.closed", { shiftId, variance });
  }

  private async validateBeforeClosing(shiftId: string): Promise<void> {
    // A. Check for unsynced transactions in queue
    const syncRows = await this.db.query("SELECT id FROM syncQueue WHERE status = 'pending'");
    if (syncRows.length > 0) {
      throw new Error(`Cannot close shift. There are ${syncRows.length} unsynced transactions remaining.`);
    }

    // B. Check for active tables that haven't paid bills
    const openTables = await this.db.query("SELECT id FROM tables WHERE status = 'occupied'");
    if (openTables.length > 0) {
      throw new Error(`Cannot close shift. There are still ${openTables.length} occupied table sessions active.`);
    }
  }

  public async getCashDrawerMovements(shiftId: string): Promise<any[]> {
    return this.db.query("SELECT * FROM cash_movements WHERE shiftId = ? ORDER BY timestamp DESC", [shiftId]);
  }

  private mapRowToShift(r: any): Shift {
    return {
      id: r.id,
      shiftName: r.shiftName,
      openedBy: r.openedBy,
      closedBy: r.closedBy || undefined,
      openingTime: r.openingTime,
      closingTime: r.closingTime || undefined,
      openingFloat: r.openingFloat,
      expectedClosing: r.expectedClosing,
      actualClosing: r.actualClosing || undefined,
      variance: r.variance !== null ? r.variance : undefined,
      status: r.status as any,
      managerId: r.managerId || undefined,
      terminalId: r.terminalId || undefined,
      openingNotes: r.openingNotes || "",
      closingNotes: r.closingNotes || "",
      branchId: r.branchId
    };
  }
}

export const shiftEngine = new ShiftEngine();
export default shiftEngine;
