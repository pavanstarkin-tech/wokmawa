import { DatabaseAdapter } from "./DatabaseAdapter";
import logger from "@/services/logger/Logger";

interface Migration {
  version: number;
  up: (db: DatabaseAdapter) => Promise<void>;
}

export class MigrationManager {
  private migrations: Migration[] = [];

  constructor() {
    this.registerMigrations();
  }

  private registerMigrations() {
    // Migration Version 1: Core POS Schema and Database Indexes
    this.migrations.push({
      version: 1,
      up: async (db: DatabaseAdapter) => {
        logger.info("database", "Executing schema upgrade to Version 1...");

        // 1. Create Tables
        await db.execute(`
          CREATE TABLE IF NOT EXISTS database_info (
            version INTEGER PRIMARY KEY,
            branchId TEXT,
            createdAt INTEGER,
            updatedAt INTEGER
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            billNumber TEXT UNIQUE,
            tableId TEXT,
            customerName TEXT,
            customerPhone TEXT,
            items TEXT,
            subtotal REAL,
            discount REAL,
            tax REAL,
            grandTotal REAL,
            status TEXT,
            cashierName TEXT,
            orderType TEXT,
            instructions TEXT,
            version INTEGER DEFAULT 1,
            syncStatus TEXT DEFAULT 'pending',
            firebaseId TEXT,
            createdAt INTEGER,
            updatedAt INTEGER,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS bills (
            id TEXT PRIMARY KEY,
            orderId TEXT,
            billNumber TEXT,
            paymentMethod TEXT,
            amountPaid REAL,
            subtotal REAL,
            discount REAL,
            tax REAL,
            grandTotal REAL,
            cashierName TEXT,
            syncStatus TEXT DEFAULT 'pending',
            createdAt INTEGER,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            name TEXT,
            phone TEXT UNIQUE,
            email TEXT,
            loyaltyPoints REAL DEFAULT 0,
            syncStatus TEXT DEFAULT 'pending',
            createdAt INTEGER,
            updatedAt INTEGER,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS tables (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE,
            status TEXT,
            currentOrderId TEXT,
            capacity INTEGER,
            syncStatus TEXT DEFAULT 'pending',
            updatedAt INTEGER,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS staff (
            id TEXT PRIMARY KEY,
            name TEXT,
            role TEXT,
            pin TEXT,
            enabled INTEGER DEFAULT 1,
            syncStatus TEXT DEFAULT 'pending',
            createdAt INTEGER,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS printers (
            id TEXT PRIMARY KEY,
            name TEXT,
            type TEXT,
            ip TEXT,
            port INTEGER,
            role TEXT,
            enabled INTEGER DEFAULT 1,
            profile TEXT,
            status TEXT,
            latencyMs INTEGER,
            uptimeStats TEXT,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS printJobs (
            id TEXT PRIMARY KEY,
            printerId TEXT,
            type TEXT,
            priority INTEGER,
            payload TEXT,
            retries INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            error TEXT,
            jobHash TEXT,
            createdAt INTEGER,
            updatedAt INTEGER,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS printHistory (
            id TEXT PRIMARY KEY,
            jobId TEXT,
            printerId TEXT,
            printerName TEXT,
            type TEXT,
            status TEXT,
            retries INTEGER,
            jobHash TEXT,
            timestamp INTEGER,
            printTimeMs INTEGER,
            error TEXT,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS printerLogs (
            id TEXT PRIMARY KEY,
            timestamp INTEGER,
            printerId TEXT,
            level TEXT,
            event TEXT,
            message TEXT,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS discoveryCache (
            ip TEXT PRIMARY KEY,
            port INTEGER,
            hostname TEXT,
            lastSeen INTEGER,
            status TEXT,
            latencyMs INTEGER,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS inventory (
            id TEXT PRIMARY KEY,
            name TEXT,
            sku TEXT,
            category TEXT,
            stockQty REAL DEFAULT 0,
            unit TEXT,
            minStock REAL DEFAULT 0,
            syncStatus TEXT DEFAULT 'pending',
            updatedAt INTEGER,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            voucherId TEXT,
            category TEXT,
            amount REAL,
            description TEXT,
            cashierName TEXT,
            recipientName TEXT,
            syncStatus TEXT DEFAULT 'pending',
            createdAt INTEGER,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS cashSessions (
            id TEXT PRIMARY KEY,
            shiftId TEXT,
            cashierName TEXT,
            openedAt INTEGER,
            closedAt INTEGER,
            openingBalance REAL,
            expectedBalance REAL,
            actualBalance REAL,
            discrepancy REAL,
            status TEXT,
            salesCash REAL DEFAULT 0,
            salesCard REAL DEFAULT 0,
            salesUpi REAL DEFAULT 0,
            salesRazorpay REAL DEFAULT 0,
            syncStatus TEXT DEFAULT 'pending',
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS cashMovements (
            id TEXT PRIMARY KEY,
            sessionId TEXT,
            type TEXT,
            amount REAL,
            reason TEXT,
            timestamp INTEGER,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS auditLogs (
            id TEXT PRIMARY KEY,
            timestamp INTEGER,
            action TEXT,
            entity TEXT,
            entityId TEXT,
            details TEXT,
            cashierName TEXT,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS syncQueue (
            id TEXT PRIMARY KEY,
            entity TEXT,
            operation TEXT,
            entityId TEXT,
            status TEXT DEFAULT 'pending',
            retryCount INTEGER DEFAULT 0,
            createdAt INTEGER,
            branchId TEXT,
            createdBy TEXT,
            updatedBy TEXT
          );
        `);

        // 2. Create Relational Indexes
        await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_billNumber ON orders(billNumber);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_syncStatus ON orders(syncStatus);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_tableId ON orders(tableId);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders(createdAt);");

        await db.execute("CREATE INDEX IF NOT EXISTS idx_bills_billNumber ON bills(billNumber);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_bills_createdAt ON bills(createdAt);");

        await db.execute("CREATE INDEX IF NOT EXISTS idx_syncQueue_status_createdAt ON syncQueue(status, createdAt);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_printJobs_status_printerId ON printJobs(status, printerId);");

        // 3. Set Version in database_info
        await db.execute(
          `INSERT INTO database_info (version, branchId, createdAt, updatedAt) VALUES (?, ?, ?, ?)`,
          [1, "MAIN_BRANCH", Date.now(), Date.now()]
        );

        logger.info("database", "Successfully initialized Version 1 schema and indexes.");
      }
    });
  }

  /**
   * Run all pending migrations
   */
  public async migrate(db: DatabaseAdapter): Promise<void> {
    try {
      let currentVersion = 0;

      // Check if database_info table exists
      try {
        const info = await db.query("SELECT version FROM database_info LIMIT 1");
        if (info.length > 0) {
          currentVersion = info[0].version;
        }
      } catch {
        // database_info doesn't exist, currentVersion is 0
      }

      logger.info("database", `Current database schema version: ${currentVersion}`);

      const pending = this.migrations.filter(m => m.version > currentVersion).sort((a, b) => a.version - b.version);

      if (pending.length === 0) {
        logger.info("database", "Database schema is up to date. No migrations pending.");
        return;
      }

      for (const migration of pending) {
        await migration.up(db);
        // Verify database_info version gets updated
        await db.execute("UPDATE database_info SET version = ?, updatedAt = ?", [migration.version, Date.now()]);
      }

      logger.info("database", "All schema migrations successfully applied.");
    } catch (err: any) {
      logger.error("database", "Database migration failed", err);
      throw err;
    }
  }
}

export const migrationManager = new MigrationManager();
export default migrationManager;
