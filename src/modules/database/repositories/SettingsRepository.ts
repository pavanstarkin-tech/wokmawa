import { BaseRepository } from "./BaseRepository";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";

export class SettingsRepository extends BaseRepository {
  public async getSetting<T>(key: string): Promise<T | null> {
    const rows = await this.db.query("SELECT value FROM settings WHERE key = ?", [key]);
    if (rows.length === 0) return null;
    try {
      return JSON.parse(rows[0].value) as T;
    } catch {
      return rows[0].value as any as T;
    }
  }

  public async saveSetting<T>(key: string, value: T, branchId = "MAIN_BRANCH"): Promise<void> {
    const valueStr = typeof value === "string" ? value : JSON.stringify(value);
    await this.db.execute(
      "INSERT OR REPLACE INTO settings (key, value, branchId) VALUES (?, ?, ?)",
      [key, valueStr, branchId]
    );
    
    // Emit setting mutation event
    dbEventBus.emit("settings.updated", { key, value });
  }
}

export const settingsRepository = new SettingsRepository();
export default settingsRepository;
