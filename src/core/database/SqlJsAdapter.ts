import initSqlJs, { Database } from "sql.js";
import { DatabaseAdapter } from "./DatabaseAdapter";
import logger from "@/services/logger/Logger";

export class SqlJsAdapter implements DatabaseAdapter {
  private db: Database | null = null;
  private SQL: any = null;
  private storageKey = "paakashala_wasm_db";

  public async initialize(): Promise<void> {
    try {
      logger.info("database", "Initializing WebAssembly sql.js database adapter...");
      // Initialize sql.js. In browser environment, load WASM from cdn.jsdelivr.net fallback for simple config
      this.SQL = await initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`
      });

      // Load saved binary state from LocalStorage if present
      const savedDb = localStorage.getItem(this.storageKey);
      if (savedDb) {
        try {
          const binary = this.base64ToBytes(savedDb);
          this.db = new this.SQL.Database(binary);
          logger.info("database", "sql.js loaded database state from LocalStorage.");
        } catch (err) {
          logger.error("database", "Failed parsing saved database. Initializing new database.", err);
          this.db = new this.SQL.Database();
        }
      } else {
        this.db = new this.SQL.Database();
        logger.info("database", "sql.js initialized empty in-memory database.");
      }
    } catch (err: any) {
      logger.error("database", "Failed initializing sql.js adapter", err);
      throw err;
    }
  }

  public async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number | string }> {
    this.ensureDb();
    try {
      this.db!.run(sql, params);
      
      // Save state changes asynchronously to localStorage
      this.saveToStorage();

      // Retrieve last insert ID and changes
      const changesRes = this.db!.exec("SELECT changes() AS ch, last_insert_rowid() AS id");
      const changes = (changesRes[0]?.values[0]?.[0] as number) || 0;
      const lastInsertRowid = (changesRes[0]?.values[0]?.[1] as number | string) || 0;

      return { changes, lastInsertRowid };
    } catch (err: any) {
      logger.error("database", `Execution query failed: ${sql}`, err);
      throw err;
    }
  }

  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.ensureDb();
    try {
      const stmt = this.db!.prepare(sql);
      stmt.bind(params);
      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
      }
      stmt.free();
      return results;
    } catch (err: any) {
      logger.error("database", `Query lookup failed: ${sql}`, err);
      throw err;
    }
  }

  public async transaction(queries: Array<{ sql: string; params?: any[] }>): Promise<void> {
    this.ensureDb();
    try {
      this.db!.run("BEGIN TRANSACTION;");
      for (const q of queries) {
        this.db!.run(q.sql, q.params || []);
      }
      this.db!.run("COMMIT;");
      this.saveToStorage();
    } catch (err: any) {
      this.db!.run("ROLLBACK;");
      logger.error("database", "WASM transaction failed, changes rolled back", err);
      throw err;
    }
  }

  public async backup(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      this.ensureDb();
      const binary = this.db!.export();
      const base64 = this.bytesToBase64(binary);
      // Simulate file backup by keeping a snapshot key in localStorage
      localStorage.setItem(`${this.storageKey}_backup`, base64);
      return { success: true, filePath: "localStorage/backup" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async restore(backupPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const base64 = localStorage.getItem(`${this.storageKey}_backup`);
      if (!base64) {
        return { success: false, error: "No mock backup found in LocalStorage" };
      }
      const binary = this.base64ToBytes(base64);
      this.db = new this.SQL.Database(binary);
      this.saveToStorage();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async vacuum(): Promise<void> {
    // WASM does not strictly require VACUUM command, but we execute for compatibility
    this.ensureDb();
    this.db!.run("VACUUM;");
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  public async healthCheck(): Promise<{ healthy: boolean; details?: string }> {
    try {
      this.ensureDb();
      const res = this.db!.exec("PRAGMA integrity_check;");
      const ok = res[0]?.values[0]?.[0] === "ok";
      return { healthy: ok, details: ok ? "Integrity check OK" : "Database corruption detected" };
    } catch (err: any) {
      return { healthy: false, details: err.message };
    }
  }

  // --- Helpers ---

  private ensureDb() {
    if (!this.db) throw new Error("Database not initialized. Call initialize() first.");
  }

  private saveToStorage() {
    if (!this.db) return;
    try {
      const binary = this.db.export();
      const base64 = this.bytesToBase64(binary);
      localStorage.setItem(this.storageKey, base64);
    } catch (err) {
      console.error("Failed saving WASM SQLite state to LocalStorage", err);
    }
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToBytes(base64: string): Uint8Array {
    const binaryStr = window.atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }
}

export default SqlJsAdapter;
