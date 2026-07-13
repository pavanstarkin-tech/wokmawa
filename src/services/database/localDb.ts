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

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;
    try {
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("paakashala_local_database");
        if (stored) {
          this.dbCache = { ...FALLBACK_DB, ...JSON.parse(stored) };
        } else {
          this.dbCache = { ...FALLBACK_DB };
          this.save();
        }
      }
      this.initialized = true;
    } catch (err: any) {
      logger.error("database", "Failed to initialize local database", err);
      this.dbCache = { ...FALLBACK_DB };
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

  // --- Generic Database Actions ---

  public getTable<K extends keyof DatabaseTables>(table: K): DatabaseTables[K] {
    this.init();
    return this.dbCache[table];
  }

  public setTable<K extends keyof DatabaseTables>(table: K, value: DatabaseTables[K]) {
    this.init();
    this.dbCache[table] = value;
    this.save();
  }

  public insertRecord<K extends keyof Omit<DatabaseTables, "settings">>(
    table: K,
    record: any
  ): any {
    this.init();
    const data = this.dbCache[table] as any[];
    const id = record.id || `rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newRecord = { ...record, id, createdAt: record.createdAt || Date.now() };
    
    // Push and save
    data.push(newRecord);
    this.save();
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
    logger.info("database", `Deleted record from table "${table}"`, { id });
    return true;
  }

  public clearTable<K extends keyof Omit<DatabaseTables, "settings">>(table: K) {
    this.init();
    this.dbCache[table] = [] as any;
    this.save();
    logger.info("database", `Cleared table "${table}"`);
  }

  // --- Specialized Setting Actions ---
  
  public getSettings() {
    this.init();
    return this.dbCache.settings;
  }

  public updateSettings(updates: any) {
    this.init();
    this.dbCache.settings = { ...this.dbCache.settings, ...updates, version: 2 };
    this.save();
    logger.info("database", "Updated system settings", updates);
  }
}

export const localDb = new LocalDb();
export default localDb;
