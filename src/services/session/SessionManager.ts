import localDb from "../database/localDb";
import logger from "../logger/Logger";
import eventBus from "../event-bus/eventBus";

export interface CashShift {
  id: string;
  cashierName: string;
  openedAt: number;
  closedAt: number | null;
  openingBalance: number;
  expectedBalance: number;
  actualBalance: number | null;
  discrepancy: number | null;
  notes?: string;
  status: "open" | "closed";
}

class SessionManager {
  private activeShift: CashShift | null = null;
  private currentTableId: string | null = null;
  private activeCustomer: { phone: string; name: string } | null = null;

  constructor() {
    this.loadActiveShift();
  }

  private loadActiveShift() {
    try {
      const shifts = localDb.getTable("shifts");
      const openShift = shifts.find((s: CashShift) => s.status === "open");
      if (openShift) {
        this.activeShift = openShift;
      }
    } catch (e) {
      logger.error("pos", "Failed to load active shift from database", e);
    }
  }

  public getActiveShift(): CashShift | null {
    return this.activeShift;
  }

  public openShift(cashierName: string, openingBalance: number): CashShift {
    if (this.activeShift) {
      logger.warn("pos", "Attempted to open shift but a shift is already active.");
      return this.activeShift;
    }

    const newShift: CashShift = {
      id: `shift_${Date.now()}`,
      cashierName,
      openedAt: Date.now(),
      closedAt: null,
      openingBalance,
      expectedBalance: openingBalance,
      actualBalance: null,
      discrepancy: null,
      status: "open",
    };

    localDb.insertRecord("shifts", newShift);
    this.activeShift = newShift;
    eventBus.emit("drawer.changed", { type: "open", amount: openingBalance });
    logger.info("pos", `Cash register shift opened by ${cashierName}`, newShift);
    return newShift;
  }

  public closeShift(actualBalance: number, notes?: string): CashShift | null {
    if (!this.activeShift) {
      logger.warn("pos", "Attempted to close shift but no shift is active.");
      return null;
    }

    const discrepancy = actualBalance - this.activeShift.expectedBalance;
    const closedShift: Partial<CashShift> = {
      closedAt: Date.now(),
      actualBalance,
      discrepancy,
      status: "closed",
      notes,
    };

    localDb.updateRecord("shifts", this.activeShift.id, closedShift);
    const completedShift = { ...this.activeShift, ...closedShift } as CashShift;
    
    eventBus.emit("drawer.changed", { type: "close", amount: actualBalance });
    logger.info("pos", `Cash register shift closed with discrepancy ₹${discrepancy}`, completedShift);
    this.activeShift = null;
    return completedShift;
  }

  public recordTransaction(amount: number) {
    if (this.activeShift) {
      const updatedExpected = this.activeShift.expectedBalance + amount;
      localDb.updateRecord("shifts", this.activeShift.id, { expectedBalance: updatedExpected });
      this.activeShift.expectedBalance = updatedExpected;
      logger.info("pos", `Recorded cash transaction of ₹${amount} inside shift.`);
    }
  }

  // --- UI Routing Context Helpers ---

  public getSelectedTable(): string | null {
    return this.currentTableId;
  }

  public setSelectedTable(tableId: string | null) {
    this.currentTableId = tableId;
  }

  public getActiveCustomer() {
    return this.activeCustomer;
  }

  public setActiveCustomer(customer: { phone: string; name: string } | null) {
    this.activeCustomer = customer;
  }
}

export const sessionManager = new SessionManager();
export default sessionManager;
