import { DatabaseAdapter } from "./DatabaseAdapter";
import { migrationManager } from "./MigrationManager";
import logger from "@/services/logger/Logger";

export class SchemaManager {
  /**
   * Initializes schemas, runs pending migrations, checks structural health, and seeds defaults.
   */
  public static async initialize(db: DatabaseAdapter): Promise<void> {
    logger.info("database", "SchemaManager starting database schema checks...");
    
    // 1. Run migrations
    await migrationManager.migrate(db);

    // 2. Validate structural integrity
    const health = await db.healthCheck();
    if (!health.healthy) {
      throw new Error(`Database integrity failure: ${health.details}`);
    }

    // 3. Seed defaults
    await this.seedDefaults(db);
    logger.info("database", "Database schemas validation and initialization checks completed.");
  }

  private static async seedDefaults(db: DatabaseAdapter): Promise<void> {
    // Seed default settings if empty
    const settings = await db.query("SELECT COUNT(*) AS count FROM settings");
    if (settings[0]?.count === 0) {
      logger.info("database", "Seeding default settings table...");
      const defaultSettings = [
        { key: "branchId", value: JSON.stringify("MAIN_BRANCH") },
        { key: "restaurant", value: JSON.stringify({ name: "Paakashala", phone: "080-2345678", email: "info@paakashala.in" }) },
        { key: "taxes", value: JSON.stringify({ gstRate: 5, serviceCharge: 2.5 }) },
        { key: "printerSettings", value: JSON.stringify({}) }
      ];
      for (const s of defaultSettings) {
        await db.execute("INSERT OR REPLACE INTO settings (key, value, branchId) VALUES (?, ?, ?)", [s.key, s.value, "MAIN_BRANCH"]);
      }
    }

    // Seed default tables if empty
    const tablesCount = await db.query("SELECT COUNT(*) AS count FROM tables");
    if (tablesCount[0]?.count === 0) {
      logger.info("database", "Seeding default restaurant dining tables...");
      const defaultTables = [
        { id: "t1", name: "Table 1", status: "vacant", capacity: 4 },
        { id: "t2", name: "Table 2", status: "vacant", capacity: 4 },
        { id: "t3", name: "Table 3", status: "vacant", capacity: 2 },
        { id: "t4", name: "Table 4", status: "vacant", capacity: 6 },
        { id: "t5", name: "Table 5", status: "vacant", capacity: 4 }
      ];
      for (const t of defaultTables) {
        await db.execute(
          "INSERT OR REPLACE INTO tables (id, name, status, capacity, branchId) VALUES (?, ?, ?, ?, ?)",
          [t.id, t.name, t.status, t.capacity, "MAIN_BRANCH"]
        );
      }
    }

    // Seed default staff if empty
    const staffCount = await db.query("SELECT COUNT(*) AS count FROM staff");
    if (staffCount[0]?.count === 0) {
      logger.info("database", "Seeding initial cashier profiles...");
      const defaultStaff = [
        { id: "staff_admin", name: "Ramesh Kumar", role: "admin", pin: "1234", enabled: 1 },
        { id: "staff_cashier1", name: "Suresh P.", role: "cashier", pin: "0000", enabled: 1 }
      ];
      for (const s of defaultStaff) {
        await db.execute(
          "INSERT OR REPLACE INTO staff (id, name, role, pin, enabled, branchId) VALUES (?, ?, ?, ?, ?, ?)",
          [s.id, s.name, s.role, s.pin, s.enabled, "MAIN_BRANCH"]
        );
      }
    }
  }
}

export default SchemaManager;
