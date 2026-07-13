import dbService from "../../../core/database/DatabaseService";
import { unitOfWork } from "../../../core/database/UnitOfWork";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";

export interface Staff {
  id: string;
  name: string;
  role: string;
  pin: string;
  enabled: boolean;
}

export class AttendanceEngine {
  private get db() {
    return dbService.getAdapter();
  }

  public async pinLogin(pin: string): Promise<Staff | null> {
    const rows = await this.db.query("SELECT * FROM staff WHERE pin = ? AND enabled = 1 LIMIT 1", [pin]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      role: r.role,
      pin: r.pin,
      enabled: r.enabled === 1
    };
  }

  public async getStaffList(): Promise<Staff[]> {
    const rows = await this.db.query("SELECT * FROM staff ORDER BY name ASC");
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      role: r.role,
      pin: r.pin,
      enabled: r.enabled === 1
    }));
  }

  public async checkIn(staffId: string, shiftId: string): Promise<string> {
    const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const eventId = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    await unitOfWork.transaction(async () => {
      // 1. Insert header
      await this.db.execute(
        `INSERT INTO attendance (id, staffId, shiftId, checkIn, checkOut, attendanceStatus, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, staffId, shiftId, now, null, "present", "MAIN_BRANCH"]
      );

      // 2. Insert event log
      await this.db.execute(
        "INSERT INTO attendance_events (id, attendanceId, type, timestamp) VALUES (?, ?, ?, ?)",
        [eventId, id, "checkin", now]
      );
    });

    dbEventBus.emit("attendance.checkedIn", { staffId, attendanceId: id });
    return id;
  }

  public async checkOut(attendanceId: string): Promise<void> {
    const eventId = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    await unitOfWork.transaction(async () => {
      await this.db.execute(
        "UPDATE attendance SET checkOut = ? WHERE id = ?",
        [now, attendanceId]
      );

      await this.db.execute(
        "INSERT INTO attendance_events (id, attendanceId, type, timestamp) VALUES (?, ?, ?, ?)",
        [eventId, attendanceId, "checkout", now]
      );
    });

    dbEventBus.emit("attendance.checkedOut", { attendanceId });
  }

  public async startBreak(attendanceId: string): Promise<void> {
    const eventId = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    await this.db.execute(
      "INSERT INTO attendance_events (id, attendanceId, type, timestamp) VALUES (?, ?, ?, ?)",
      [eventId, attendanceId, "break_start", now]
    );
  }

  public async endBreak(attendanceId: string): Promise<void> {
    const eventId = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    await this.db.execute(
      "INSERT INTO attendance_events (id, attendanceId, type, timestamp) VALUES (?, ?, ?, ?)",
      [eventId, attendanceId, "break_end", now]
    );
  }

  public async getAttendanceLogs(): Promise<any[]> {
    return this.db.query(`
      SELECT a.*, s.name as staffName, s.role as staffRole
      FROM attendance a
      JOIN staff s ON a.staffId = s.id
      ORDER BY a.checkIn DESC
    `);
  }

  public async getAttendanceEvents(attendanceId: string): Promise<any[]> {
    return this.db.query(
      "SELECT * FROM attendance_events WHERE attendanceId = ? ORDER BY timestamp ASC",
      [attendanceId]
    );
  }
}

export const attendanceEngine = new AttendanceEngine();
export default attendanceEngine;
