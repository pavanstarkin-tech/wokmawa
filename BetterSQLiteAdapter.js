const path = require("path");
const fs = require("fs");
const { app } = require("electron");

class BetterSQLiteAdapter {
  constructor() {
    this.db = null;
  }

  initialize() {
    if (this.db) return;
    try {
      // Lazy load better-sqlite3 to prevent loading issues in browser environment bundlers
      const Database = require("better-sqlite3");
      const dbPath = path.join(app.getPath("userData"), "restaurant.db");
      
      console.log(`[SQLITE] Loading production database file at: ${dbPath}`);
      this.db = new Database(dbPath, { verbose: console.log });
      
      // Enable Write-Ahead Logging (WAL) for concurrent read/write operations
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("synchronous = NORMAL");
      
      console.log("[SQLITE] native database connection established with WAL enabled.");
    } catch (err) {
      console.error("[SQLITE] Failed to load native better-sqlite3 engine:", err.message);
      throw err;
    }
  }

  async execute(sql, params = []) {
    this.ensureDb();
    try {
      const stmt = this.db.prepare(sql);
      const info = stmt.run(params);
      return {
        changes: info.changes,
        lastInsertRowid: info.lastInsertRowid
      };
    } catch (err) {
      console.error(`[SQLITE] Execute error: ${sql}`, err.message);
      throw err;
    }
  }

  async query(sql, params = []) {
    this.ensureDb();
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(params);
    } catch (err) {
      console.error(`[SQLITE] Query error: ${sql}`, err.message);
      throw err;
    }
  }

  async transaction(queries) {
    this.ensureDb();
    const executeMany = this.db.transaction((queriesList) => {
      for (const q of queriesList) {
        this.db.prepare(q.sql).run(q.params || []);
      }
    });

    try {
      executeMany(queries);
    } catch (err) {
      console.error("[SQLITE] Transaction aborted and rolled back:", err.message);
      throw err;
    }
  }

  async backup() {
    try {
      this.ensureDb();
      const backupsDir = path.join(app.getPath("userData"), "backups");
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      const backupFile = path.join(backupsDir, `db-backup-${Date.now()}.sqlite`);
      await this.db.backup(backupFile);
      
      console.log(`[SQLITE] Database backup written: ${backupFile}`);
      return { success: true, filePath: backupFile };
    } catch (err) {
      console.error("[SQLITE] Backup failed:", err.message);
      return { success: false, error: err.message };
    }
  }

  async restore(backupPath) {
    try {
      this.ensureDb();
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: "Backup file not found" };
      }

      // Close database connection before overwrite
      this.db.close();
      this.db = null;

      const dbPath = path.join(app.getPath("userData"), "restaurant.db");
      fs.copyFileSync(backupPath, dbPath);
      
      // Re-initialize database
      this.initialize();
      return { success: true };
    } catch (err) {
      console.error("[SQLITE] Restore failed:", err.message);
      return { success: false, error: err.message };
    }
  }

  async vacuum() {
    this.ensureDb();
    this.db.prepare("VACUUM").run();
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async healthCheck() {
    try {
      this.ensureDb();
      const result = this.db.prepare("PRAGMA integrity_check").get();
      const ok = result.integrity_check === "ok";
      return { healthy: ok, details: ok ? "Integrity check OK" : "Corrupt tables discovered" };
    } catch (err) {
      return { healthy: false, details: err.message };
    }
  }

  ensureDb() {
    if (!this.db) {
      this.initialize();
    }
  }
}

module.exports = new BetterSQLiteAdapter();
