import dbService from "@/core/database/DatabaseService";
import logger from "../logger/Logger";

export interface DatabaseTables {
  bills: any[];
  shifts: any[];
  printers: any[];
  syncQueue: any[];
  inventory: any[];
  printJobs: any[];
  printHistory: any[];
  printerLogs: any[];
  discoveryCache: any[];
  settings: any;
}

const FALLBACK_DB: DatabaseTables = {
  bills: [],
  shifts: [],
  printers: [],
  syncQueue: [],
  inventory: [],
  printJobs: [],
  printHistory: [],
  printerLogs: [],
  discoveryCache: [],
  settings: {
    version: 3,
    branchId: "MAIN_BRANCH",
    restaurant: { name: "Paakashala", address: "Bengaluru", phone: "918639122823" },
    taxes: { gstRate: 5, serviceCharge: 2.5 },
    kitchen: { autoAccept: true, prepTimeMinutes: 15 },
    printers: []
  }
};

class LocalDb {
  private dbCache: DatabaseTables = { ...FALLBACK_DB };
  private initialized = false;
  private usingSqlite = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      // 1. Initial load from LocalStorage for immediate synchronous UI render
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("paakashala_local_database");
        if (stored) {
          this.dbCache = { ...FALLBACK_DB, ...JSON.parse(stored) };
        } else {
          this.dbCache = { ...FALLBACK_DB };
          this.save();
        }
      }

      // 2. Load from SQLite in background if running inside Electron or Sql.js WebAssembly
      setTimeout(async () => {
        try {
          const db = dbService.getAdapter();
          if (db) {
            this.usingSqlite = true;
            await this.loadFromSqlite(db);
            logger.info("database", "localDb synced memory-cache with local SQLite database.");
          }
        } catch (e) {
          logger.warn("database", "SQLite connection not initialized yet (WASM loading or browser mode). Keeping LocalStorage cache.");
        }
      }, 500);
    } catch (err: any) {
      logger.error("database", "Failed to initialize local database", err);
      this.dbCache = { ...FALLBACK_DB };
    }
  }

  private async loadFromSqlite(db: any) {
    try {
      // Load settings
      const settingsRows = await db.query("SELECT * FROM settings");
      settingsRows.forEach((row: any) => {
        try {
          this.dbCache.settings[row.key] = JSON.parse(row.value);
        } catch {
          this.dbCache.settings[row.key] = row.value;
        }
      });

      // Load other tables
      const tablesMap: Record<string, string> = {
        bills: "bills",
        shifts: "cashSessions",
        printers: "printers",
        syncQueue: "syncQueue",
        inventory: "inventory",
        printJobs: "printJobs",
        printHistory: "printHistory",
        printerLogs: "printerLogs",
        discoveryCache: "discoveryCache"
      };

      for (const [cacheKey, sqlTable] of Object.entries(tablesMap)) {
        const rows = await db.query(`SELECT * FROM ${sqlTable}`);
        this.dbCache[cacheKey as keyof DatabaseTables] = rows.map((r: any) => {
          if (r.profile) {
            try { r.profile = JSON.parse(r.profile); } catch {}
          }
          if (r.uptimeStats) {
            try { r.uptimeStats = JSON.parse(r.uptimeStats); } catch {}
          }
          return r;
        });
      }
    } catch (err) {
      logger.error("database", "Failed loading tables from SQLite", err);
    }
  }

  private save() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("paakashala_local_database", JSON.stringify(this.dbCache));
      }
    } catch (err: any) {
      logger.error("database", "Failed to save local database state", err);
    }
  }

  private async executeSqlWrite(sql: string, params: any[]) {
    if (!this.usingSqlite) return;
    try {
      const db = dbService.getAdapter();
      await db.execute(sql, params);
    } catch (err) {
      logger.error("database", `Background SQLite write failed: ${sql}`, err);
    }
  }

  private async insertToSqlite(table: string, record: any) {
    try {
      const db = dbService.getAdapter();
      if (table === "bills") {
        await db.execute(
          `INSERT OR REPLACE INTO bills (
            id, orderId, billNumber, paymentMethod, amountPaid, subtotal, discount, tax, grandTotal, cashierName, syncStatus, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [record.id, record.orderId, record.billNumber, record.paymentMethod, record.amountPaid, record.subtotal, record.discount, record.tax, record.grandTotal, record.cashierName, record.syncStatus || 'pending', record.createdAt]
        );
      } else if (table === "shifts") {
        await db.execute(
          `INSERT OR REPLACE INTO cashSessions (
            id, shiftId, cashierName, openedAt, closedAt, openingBalance, expectedBalance, actualBalance, discrepancy, status, salesCash, salesCard, salesUpi, salesRazorpay, syncStatus
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [record.id, record.shiftId, record.cashierName, record.openedAt, record.closedAt || null, record.openingBalance, record.expectedBalance, record.actualBalance || null, record.discrepancy || null, record.status, record.salesCash || 0, record.salesCard || 0, record.salesUpi || 0, record.salesRazorpay || 0, record.syncStatus || 'pending']
        );
      } else if (table === "printJobs") {
        await db.execute(
          `INSERT OR REPLACE INTO printJobs (
            id, printerId, type, priority, payload, retries, status, error, jobHash, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [record.id, record.printerId, record.type, record.priority, record.payload, record.retries || 0, record.status, record.error || null, record.jobHash, record.createdAt, record.updatedAt || null]
        );
      } else if (table === "printHistory") {
        await db.execute(
          `INSERT OR REPLACE INTO printHistory (
            id, jobId, printerId, printerName, type, status, retries, jobHash, timestamp, printTimeMs, error
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [record.id, record.jobId, record.printerId, record.printerName, record.type, record.status, record.retries, record.jobHash, record.timestamp, record.printTimeMs || null, record.error || null]
        );
      } else if (table === "printerLogs") {
        await db.execute(
          `INSERT OR REPLACE INTO printerLogs (
            id, timestamp, printerId, level, event, message
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [record.id, record.timestamp, record.printerId, record.level, record.event, record.message]
        );
      } else if (table === "discoveryCache") {
        await db.execute(
          `INSERT OR REPLACE INTO discoveryCache (
            ip, port, hostname, lastSeen, status, latencyMs
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [record.ip, record.port, record.hostname || null, record.lastSeen, record.status, record.latencyMs || null]
        );
      } else if (table === "printers") {
        await db.execute(
          `INSERT OR REPLACE INTO printers (
            id, name, type, ip, port, role, enabled, profile, status, latencyMs, uptimeStats
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [record.id, record.name, record.type, record.ip || null, record.port || null, record.role, record.enabled ? 1 : 0, JSON.stringify(record.profile), record.status, record.latencyMs || null, JSON.stringify(record.uptimeStats || {})]
        );
      } else if (table === "inventory") {
        await db.execute(
          `INSERT OR REPLACE INTO inventory (
            id, name, sku, category, stockQty, unit, minStock, syncStatus, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [record.id, record.name, record.sku, record.category, record.stockQty, record.unit, record.minStock, record.syncStatus || 'pending', record.updatedAt || Date.now()]
        );
      } else if (table === "syncQueue") {
        await db.execute(
          `INSERT OR REPLACE INTO syncQueue (
            id, entity, operation, entityId, status, retryCount, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [record.id, record.entity, record.operation, record.entityId, record.status || 'pending', record.retryCount || 0, record.createdAt]
        );
      }
    } catch (err) {
      logger.error("database", `Background SQLite insert failed on table "${table}"`, err);
    }
  }

  // --- Generic Database Actions ---

  public getTable<K extends keyof DatabaseTables>(table: K): DatabaseTables[K] {
    this.init();
    return this.dbCache[table];
  }

  public setTable<K extends keyof DatabaseTables>(table: K, value: DatabaseTables[K]) {
    this.init();
    this.dbCache[table] = value;
    this.save();
    
    if (this.usingSqlite) {
      // Overwrite full table
      const sqlTable = table === "shifts" ? "cashSessions" : (table === "syncQueue" ? "syncQueue" : table);
      this.executeSqlWrite(`DELETE FROM ${sqlTable}`, []).then(() => {
        value.forEach((record: any) => {
          this.insertToSqlite(table as string, record);
        });
      });
    }
  }

  public insertRecord<K extends keyof Omit<DatabaseTables, "settings">>(
    table: K,
    record: any
  ): any {
    this.init();
    const data = this.dbCache[table] as any[];
    const id = record.id || `rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newRecord = { ...record, id, createdAt: record.createdAt || Date.now() };
    
    data.push(newRecord);
    this.save();

    if (this.usingSqlite) {
      this.insertToSqlite(table as string, newRecord);
    }

    logger.info("database", `Inserted record into table "${table}"`, { id });
    return newRecord;
  }

  public updateRecord<K extends keyof Omit<DatabaseTables, "settings">>(
    table: K,
    id: string,
    updates: any
  ): boolean {
    this.init();
    const data = this.dbCache[table] as any[];
    const index = data.findIndex((r) => r.id === id);
    if (index === -1) return false;

    data[index] = { ...data[index], ...updates, updatedAt: Date.now() };
    this.save();

    if (this.usingSqlite) {
      this.insertToSqlite(table as string, data[index]);
    }

    logger.info("database", `Updated record in table "${table}"`, { id });
    return true;
  }

  public deleteRecord<K extends keyof Omit<DatabaseTables, "settings">>(
    table: K,
    id: string
  ): boolean {
    this.init();
    const data = this.dbCache[table] as any[];
    const filtered = data.filter((r) => r.id !== id);
    if (filtered.length === data.length) return false;

    this.dbCache[table] = filtered as any;
    this.save();

    if (this.usingSqlite) {
      const sqlTable = table === "shifts" ? "cashSessions" : (table === "syncQueue" ? "syncQueue" : table);
      this.executeSqlWrite(`DELETE FROM ${sqlTable} WHERE id = ?`, [id]);
    }

    logger.info("database", `Deleted record from table "${table}"`, { id });
    return true;
  }

  public clearTable<K extends keyof Omit<DatabaseTables, "settings">>(table: K) {
    this.init();
    this.dbCache[table] = [] as any;
    this.save();

    if (this.usingSqlite) {
      const sqlTable = table === "shifts" ? "cashSessions" : (table === "syncQueue" ? "syncQueue" : table);
      this.executeSqlWrite(`DELETE FROM ${sqlTable}`, []);
    }

    logger.info("database", `Cleared table "${table}"`);
  }

  // --- Specialized Setting Actions ---
  
  public getSettings() {
    this.init();
    return this.dbCache.settings;
  }

  public updateSettings(updates: any) {
    this.init();
    this.dbCache.settings = { ...this.dbCache.settings, ...updates };
    this.save();

    if (this.usingSqlite) {
      Object.entries(updates).forEach(([key, val]) => {
        const valStr = typeof val === "string" ? val : JSON.stringify(val);
        this.executeSqlWrite(
          "INSERT OR REPLACE INTO settings (key, value, branchId) VALUES (?, ?, ?)",
          [key, valStr, "MAIN_BRANCH"]
        );
      });
    }

    logger.info("database", "Updated system settings", updates);
  }
}

export const localDb = new LocalDb();
export default localDb;
