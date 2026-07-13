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

    // Migration Version 2: Phase 4 Sprint 1 - Inventory Foundation Schemas
    this.migrations.push({
      version: 2,
      up: async (db: DatabaseAdapter) => {
        logger.info("database", "Executing schema upgrade to Version 2 (Inventory Foundation)...");

        // 1. Create Tables
        await db.execute(`
          CREATE TABLE IF NOT EXISTS ingredient_categories (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE,
            branchId TEXT
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS units (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE,
            symbol TEXT UNIQUE
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS ingredients (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE,
            sku TEXT UNIQUE,
            categoryId TEXT,
            unitId TEXT,
            stockQty REAL DEFAULT 0,
            minStock REAL DEFAULT 0,
            costPrice REAL DEFAULT 0,
            updatedAt INTEGER,
            branchId TEXT,
            FOREIGN KEY(categoryId) REFERENCES ingredient_categories(id),
            FOREIGN KEY(unitId) REFERENCES units(id)
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS stock_movements (
            id TEXT PRIMARY KEY,
            ingredientId TEXT,
            type TEXT,
            quantity REAL,
            source TEXT,
            referenceId TEXT,
            timestamp INTEGER,
            branchId TEXT,
            FOREIGN KEY(ingredientId) REFERENCES ingredients(id) ON DELETE CASCADE
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS stock_adjustments (
            id TEXT PRIMARY KEY,
            ingredientId TEXT,
            adjustQty REAL,
            reason TEXT,
            timestamp INTEGER,
            branchId TEXT,
            FOREIGN KEY(ingredientId) REFERENCES ingredients(id) ON DELETE CASCADE
          );
        `);

        // 2. Indexes
        await db.execute("CREATE INDEX IF NOT EXISTS idx_ingredients_sku ON ingredients(sku);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_stock_movements_ing ON stock_movements(ingredientId);");

        logger.info("database", "Successfully applied Version 2 schema migrations.");
      }
    });

    // Migration Version 3: Phase 4 Sprint 2 - Recipe & Costing Engine
    this.migrations.push({
      version: 3,
      up: async (db: DatabaseAdapter) => {
        logger.info("database", "Executing schema upgrade to Version 3 (Recipe & Costing Engine)...");

        // 1. Create Tables
        await db.execute(`
          CREATE TABLE IF NOT EXISTS recipes (
            id TEXT PRIMARY KEY,
            menuItemId TEXT,
            variantId TEXT,
            recipeName TEXT,
            yieldQuantity REAL DEFAULT 1,
            yieldUnitId TEXT,
            yieldPercent REAL DEFAULT 100,
            costPrice REAL DEFAULT 0,
            packagingCost REAL DEFAULT 0,
            labourCost REAL DEFAULT 0,
            overheadCost REAL DEFAULT 0,
            totalCost REAL DEFAULT 0,
            status TEXT DEFAULT 'active',
            version INTEGER DEFAULT 1,
            approvedBy TEXT,
            approvedAt INTEGER,
            createdAt INTEGER,
            updatedAt INTEGER,
            branchId TEXT,
            FOREIGN KEY(menuItemId) REFERENCES menu(id) ON DELETE CASCADE,
            FOREIGN KEY(yieldUnitId) REFERENCES units(id),
            UNIQUE(menuItemId, variantId)
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS recipe_items (
            id TEXT PRIMARY KEY,
            recipeId TEXT,
            ingredientId TEXT,
            quantity REAL,
            wastagePercent REAL DEFAULT 0,
            sortOrder INTEGER,
            FOREIGN KEY(recipeId) REFERENCES recipes(id) ON DELETE CASCADE,
            FOREIGN KEY(ingredientId) REFERENCES ingredients(id) ON DELETE CASCADE
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS recipe_item_alternatives (
            id TEXT PRIMARY KEY,
            recipeItemId TEXT,
            ingredientId TEXT,
            priority INTEGER DEFAULT 1,
            FOREIGN KEY(recipeItemId) REFERENCES recipe_items(id) ON DELETE CASCADE,
            FOREIGN KEY(ingredientId) REFERENCES ingredients(id) ON DELETE CASCADE
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS recipe_history (
            id TEXT PRIMARY KEY,
            recipeId TEXT,
            version INTEGER,
            snapshot TEXT,
            createdAt INTEGER
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS recipe_wastage (
            id TEXT PRIMARY KEY,
            recipeItemId TEXT,
            expectedQty REAL,
            actualQty REAL,
            variance REAL,
            timestamp INTEGER,
            branchId TEXT,
            FOREIGN KEY(recipeItemId) REFERENCES recipe_items(id) ON DELETE CASCADE
          );
        `);

        await db.execute(`
          CREATE TABLE IF NOT EXISTS consumption_ledger (
            id TEXT PRIMARY KEY,
            billId TEXT,
            recipeId TEXT,
            ingredientId TEXT,
            quantity REAL,
            timestamp INTEGER,
            branchId TEXT,
            FOREIGN KEY(ingredientId) REFERENCES ingredients(id)
          );
        `);

        // 2. Indexes
        await db.execute("CREATE INDEX IF NOT EXISTS idx_recipes_menu_variant ON recipes(menuItemId, variantId);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON recipe_items(recipeId);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_consumption_bill ON consumption_ledger(billId);");

        logger.info("database", "Successfully applied Version 3 schema migrations.");
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
