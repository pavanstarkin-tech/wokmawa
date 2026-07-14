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

    // Migration Version 4: Phase 4 Sprint 3 - Procurement Engine
    this.migrations.push({
      version: 4,
      up: async (db: DatabaseAdapter) => {
        logger.info("database", "Executing schema upgrade to Version 4 (Procurement)...");

        // 1. Vendors
        await db.execute(`
          CREATE TABLE IF NOT EXISTS vendors (
            id TEXT PRIMARY KEY,
            vendorCode TEXT UNIQUE,
            name TEXT,
            phone TEXT,
            email TEXT,
            gst TEXT,
            pan TEXT,
            address TEXT,
            paymentTerms INTEGER,
            status TEXT DEFAULT 'active',
            branchId TEXT,
            createdAt INTEGER,
            updatedAt INTEGER
          );
        `);

        // 2. Purchase Orders
        await db.execute(`
          CREATE TABLE IF NOT EXISTS purchase_orders (
            id TEXT PRIMARY KEY,
            poNumber TEXT UNIQUE,
            vendorId TEXT,
            status TEXT,
            orderDate INTEGER,
            expectedDate INTEGER,
            subtotal REAL,
            cgst REAL DEFAULT 0,
            sgst REAL DEFAULT 0,
            igst REAL DEFAULT 0,
            cess REAL DEFAULT 0,
            discount REAL DEFAULT 0,
            grandTotal REAL,
            notes TEXT,
            branchId TEXT,
            invoiceNumber TEXT,
            invoiceDate INTEGER,
            invoiceImage TEXT,
            FOREIGN KEY(vendorId) REFERENCES vendors(id)
          );
        `);

        // 3. PO Line Items
        await db.execute(`
          CREATE TABLE IF NOT EXISTS purchase_order_items (
            id TEXT PRIMARY KEY,
            purchaseOrderId TEXT,
            ingredientId TEXT,
            quantity REAL,
            receivedQty REAL DEFAULT 0,
            unitPrice REAL,
            tax REAL DEFAULT 0,
            total REAL,
            FOREIGN KEY(purchaseOrderId) REFERENCES purchase_orders(id) ON DELETE CASCADE,
            FOREIGN KEY(ingredientId) REFERENCES ingredients(id)
          );
        `);

        // 4. Goods Receipt Notes
        await db.execute(`
          CREATE TABLE IF NOT EXISTS goods_receipts (
            id TEXT PRIMARY KEY,
            grnNumber TEXT UNIQUE,
            purchaseOrderId TEXT,
            receivedDate INTEGER,
            status TEXT,
            total REAL,
            branchId TEXT,
            FOREIGN KEY(purchaseOrderId) REFERENCES purchase_orders(id)
          );
        `);

        // 5. GRN Line Items
        await db.execute(`
          CREATE TABLE IF NOT EXISTS goods_receipt_items (
            id TEXT PRIMARY KEY,
            goodsReceiptId TEXT,
            ingredientId TEXT,
            acceptedQty REAL,
            rejectedQty REAL DEFAULT 0,
            damagedQty REAL DEFAULT 0,
            returnedQty REAL DEFAULT 0,
            remarks TEXT,
            expiryDate INTEGER,
            batchNumber TEXT,
            unitCost REAL,
            FOREIGN KEY(goodsReceiptId) REFERENCES goods_receipts(id) ON DELETE CASCADE,
            FOREIGN KEY(ingredientId) REFERENCES ingredients(id)
          );
        `);

        // 6. Inventory Batches (FIFO tracking)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS inventory_batches (
            id TEXT PRIMARY KEY,
            ingredientId TEXT,
            batchNumber TEXT,
            expiryDate INTEGER,
            receivedQty REAL,
            availableQty REAL,
            unitCost REAL,
            grnId TEXT,
            branchId TEXT,
            FOREIGN KEY(ingredientId) REFERENCES ingredients(id) ON DELETE CASCADE,
            FOREIGN KEY(grnId) REFERENCES goods_receipts(id) ON DELETE SET NULL
          );
        `);

        // 7. Purchase Returns
        await db.execute(`
          CREATE TABLE IF NOT EXISTS purchase_returns (
            id TEXT PRIMARY KEY,
            returnNumber TEXT UNIQUE,
            vendorId TEXT,
            returnDate INTEGER,
            totalRefund REAL,
            notes TEXT,
            branchId TEXT,
            FOREIGN KEY(vendorId) REFERENCES vendors(id)
          );
        `);

        // 8. Purchase Return Line Items
        await db.execute(`
          CREATE TABLE IF NOT EXISTS purchase_return_items (
            id TEXT PRIMARY KEY,
            returnId TEXT,
            ingredientId TEXT,
            batchId TEXT,
            quantity REAL,
            unitCost REAL,
            FOREIGN KEY(returnId) REFERENCES purchase_returns(id) ON DELETE CASCADE,
            FOREIGN KEY(ingredientId) REFERENCES ingredients(id),
            FOREIGN KEY(batchId) REFERENCES inventory_batches(id)
          );
        `);

        // 9. Vendor Ledger
        await db.execute(`
          CREATE TABLE IF NOT EXISTS vendor_ledger (
            id TEXT PRIMARY KEY,
            vendorId TEXT,
            referenceType TEXT,
            referenceId TEXT,
            debit REAL DEFAULT 0,
            credit REAL DEFAULT 0,
            balance REAL,
            timestamp INTEGER,
            FOREIGN KEY(vendorId) REFERENCES vendors(id) ON DELETE CASCADE
          );
        `);

        // 10. Vendor Payments
        await db.execute(`
          CREATE TABLE IF NOT EXISTS vendor_payments (
            id TEXT PRIMARY KEY,
            vendorId TEXT,
            amount REAL,
            paymentMode TEXT,
            transactionNumber TEXT,
            paymentDate INTEGER,
            notes TEXT,
            FOREIGN KEY(vendorId) REFERENCES vendors(id)
          );
        `);

        // 11. Indexes
        await db.execute("CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON purchase_orders(vendorId);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON goods_receipts(purchaseOrderId);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_vendor_ledger_vendor ON vendor_ledger(vendorId);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_inventory_batches_ing ON inventory_batches(ingredientId);");

        logger.info("database", "Successfully applied Version 4 schema migrations.");
      }
    });

    // Migration Version 5: Phase 4 Sprint 4 - Operations Engine
    this.migrations.push({
      version: 5,
      up: async (db: DatabaseAdapter) => {
        logger.info("database", "Executing schema upgrade to Version 5 (Operations)...");

        // 1. Rename old v1 legacy tables to prevent data collision conflicts
        // Wrap in try-catch in case table renaming isn't required (e.g. fresh installation)
        try {
          await db.execute("ALTER TABLE expenses RENAME TO expenses_v1;");
        } catch { /* Table may not exist or already renamed */ }
        try {
          await db.execute("ALTER TABLE cashSessions RENAME TO cashSessions_v1;");
        } catch { /* Table may not exist or already renamed */ }
        try {
          await db.execute("ALTER TABLE cashMovements RENAME TO cashMovements_v1;");
        } catch { /* Table may not exist or already renamed */ }

        // 2. Staff Attendance Header
        await db.execute(`
          CREATE TABLE IF NOT EXISTS attendance (
            id TEXT PRIMARY KEY,
            staffId TEXT,
            shiftId TEXT,
            checkIn INTEGER,
            checkOut INTEGER,
            attendanceStatus TEXT,
            lateMinutes INTEGER DEFAULT 0,
            overtimeMinutes INTEGER DEFAULT 0,
            notes TEXT,
            branchId TEXT,
            FOREIGN KEY(staffId) REFERENCES staff(id)
          );
        `);

        // 3. Attendance Session Events
        await db.execute(`
          CREATE TABLE IF NOT EXISTS attendance_events (
            id TEXT PRIMARY KEY,
            attendanceId TEXT,
            type TEXT,
            timestamp INTEGER,
            FOREIGN KEY(attendanceId) REFERENCES attendance(id) ON DELETE CASCADE
          );
        `);

        // 4. Shift Sessions
        await db.execute(`
          CREATE TABLE IF NOT EXISTS shifts (
            id TEXT PRIMARY KEY,
            shiftName TEXT,
            openedBy TEXT,
            closedBy TEXT,
            openingTime INTEGER,
            closingTime INTEGER,
            openingFloat REAL,
            expectedClosing REAL,
            actualClosing REAL,
            variance REAL,
            status TEXT,
            managerId TEXT,
            terminalId TEXT,
            openingNotes TEXT,
            closingNotes TEXT,
            branchId TEXT
          );
        `);

        // 5. Cash Drawer Movements
        await db.execute(`
          CREATE TABLE IF NOT EXISTS cash_movements (
            id TEXT PRIMARY KEY,
            shiftId TEXT,
            movementType TEXT,
            amount REAL,
            reason TEXT,
            referenceType TEXT,
            referenceId TEXT,
            performedBy TEXT,
            timestamp INTEGER,
            branchId TEXT,
            FOREIGN KEY(shiftId) REFERENCES shifts(id) ON DELETE CASCADE
          );
        `);

        // 6. Expenses Category
        await db.execute(`
          CREATE TABLE IF NOT EXISTS expense_categories (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE,
            budget REAL,
            branchId TEXT
          );
        `);

        // 7. Expenses Ledger
        await db.execute(`
          CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            category TEXT,
            description TEXT,
            amount REAL,
            paymentMode TEXT,
            vendorId TEXT,
            shiftId TEXT,
            status TEXT DEFAULT 'approved',
            approvedBy TEXT,
            receiptFile TEXT,
            timestamp INTEGER,
            branchId TEXT,
            FOREIGN KEY(shiftId) REFERENCES shifts(id),
            FOREIGN KEY(vendorId) REFERENCES vendors(id)
          );
        `);

        // 8. Cash Denominations Audit Count
        await db.execute(`
          CREATE TABLE IF NOT EXISTS cash_denominations (
            id TEXT PRIMARY KEY,
            shiftId TEXT,
            denomination INTEGER,
            expectedQuantity INTEGER DEFAULT 0,
            actualQuantity INTEGER DEFAULT 0,
            variance INTEGER DEFAULT 0,
            total REAL,
            FOREIGN KEY(shiftId) REFERENCES shifts(id) ON DELETE CASCADE
          );
        `);

        // 9. Actionable Notifications
        await db.execute(`
          CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            type TEXT,
            priority TEXT,
            title TEXT,
            message TEXT,
            status TEXT DEFAULT 'unread',
            entityType TEXT,
            entityId TEXT,
            actionUrl TEXT,
            createdAt INTEGER,
            acknowledgedBy TEXT
          );
        `);

        // 10. Daily Closing Reports
        await db.execute(`
          CREATE TABLE IF NOT EXISTS daily_closing (
            id TEXT PRIMARY KEY,
            shiftId TEXT UNIQUE,
            grossSales REAL,
            cashSales REAL,
            cardSales REAL,
            upiSales REAL,
            expenses REAL,
            refunds REAL,
            vendorPayments REAL,
            expectedCash REAL,
            actualCash REAL,
            variance REAL,
            summaryJson TEXT,
            generatedAt INTEGER,
            generatedBy TEXT,
            FOREIGN KEY(shiftId) REFERENCES shifts(id)
          );
        `);

        // 11. Indexes
        await db.execute("CREATE INDEX IF NOT EXISTS idx_attendance_staff ON attendance(staffId);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_attendance_events_hdr ON attendance_events(attendanceId);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_cash_movements_shift ON cash_movements(shiftId);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_expenses_shift ON expenses(shiftId);");

        logger.info("database", "Successfully applied Version 5 schema migrations.");
      }
    });

    // Migration Version 6: Phase 4.5 - Commercial Business Modules
    this.migrations.push({
      version: 6,
      up: async (db: DatabaseAdapter) => {
        logger.info("database", "Executing schema upgrade to Version 6 (Business Modules)...");

        // 1. Customers CRM (with tiers & wallet points)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            phone TEXT UNIQUE,
            name TEXT,
            email TEXT,
            points INTEGER DEFAULT 0,
            walletBalance REAL DEFAULT 0,
            tier TEXT DEFAULT 'bronze',
            birthday INTEGER,
            anniversary INTEGER,
            notes TEXT,
            branchId TEXT
          );
        `);

        // 2. Customer Delivery Addresses
        await db.execute(`
          CREATE TABLE IF NOT EXISTS customer_addresses (
            id TEXT PRIMARY KEY,
            customerId TEXT,
            addressLine1 TEXT,
            addressLine2 TEXT,
            city TEXT,
            pincode TEXT,
            isDefault INTEGER DEFAULT 0,
            FOREIGN KEY(customerId) REFERENCES customers(id) ON DELETE CASCADE
          );
        `);

        // 3. Table Reservations & Auto-Allocation
        await db.execute(`
          CREATE TABLE IF NOT EXISTS reservations (
            id TEXT PRIMARY KEY,
            customerName TEXT,
            customerPhone TEXT,
            partySize INTEGER,
            reservationTime INTEGER,
            tableId TEXT,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            branchId TEXT
          );
        `);

        // 4. Central Audit & Override Log Trail
        await db.execute(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            eventType TEXT,
            details TEXT,
            userId TEXT,
            timestamp INTEGER,
            branchId TEXT
          );
        `);

        // 5. Indexes
        await db.execute("CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_reservations_time ON reservations(reservationTime);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);");

        logger.info("database", "Successfully applied Version 6 schema migrations.");
      }
    });

    // Migration Version 7: Phase 6 - Enterprise & Cloud Platform
    this.migrations.push({
      version: 7,
      up: async (db: DatabaseAdapter) => {
        logger.info("database", "Executing schema upgrade to Version 7 (Enterprise)...");

        // 1. Region & Branch Profiles
        await db.execute(`
          CREATE TABLE IF NOT EXISTS branches (
            id TEXT PRIMARY KEY,
            name TEXT,
            region TEXT,
            address TEXT,
            phone TEXT,
            gst TEXT,
            status TEXT DEFAULT 'active'
          );
        `);

        // 2. Branch Settings Overrides
        await db.execute(`
          CREATE TABLE IF NOT EXISTS branch_settings (
            branchId TEXT PRIMARY KEY,
            taxRate REAL DEFAULT 5,
            allowLocalPrices INTEGER DEFAULT 0,
            themeConfig TEXT,
            FOREIGN KEY(branchId) REFERENCES branches(id) ON DELETE CASCADE
          );
        `);

        // 3. Branch Inventory Allocation & Stock
        await db.execute(`
          CREATE TABLE IF NOT EXISTS branch_inventory (
            branchId TEXT,
            ingredientId TEXT,
            stockQty REAL DEFAULT 0,
            minStock REAL DEFAULT 10,
            PRIMARY KEY (branchId, ingredientId),
            FOREIGN KEY(branchId) REFERENCES branches(id),
            FOREIGN KEY(ingredientId) REFERENCES ingredients(id)
          );
        `);

        // 4. Branch Stock Transfers (Outlays & Deliveries)
        await db.execute(`
          CREATE TABLE IF NOT EXISTS branch_transfers (
            id TEXT PRIMARY KEY,
            sourceBranchId TEXT,
            destBranchId TEXT,
            status TEXT DEFAULT 'pending',
            shippedDate INTEGER,
            receivedDate INTEGER,
            notes TEXT,
            FOREIGN KEY(sourceBranchId) REFERENCES branches(id),
            FOREIGN KEY(destBranchId) REFERENCES branches(id)
          );
        `);

        // 5. Transfer Line Items
        await db.execute(`
          CREATE TABLE IF NOT EXISTS branch_transfer_items (
            id TEXT PRIMARY KEY,
            transferId TEXT,
            ingredientId TEXT,
            shippedQty REAL,
            receivedQty REAL DEFAULT 0,
            FOREIGN KEY(transferId) REFERENCES branch_transfers(id) ON DELETE CASCADE,
            FOREIGN KEY(ingredientId) REFERENCES ingredients(id)
          );
        `);

        // 6. Central Audit & Override Security logs
        await db.execute(`
          CREATE TABLE IF NOT EXISTS branch_audit_logs (
            id TEXT PRIMARY KEY,
            branchId TEXT,
            eventType TEXT,
            details TEXT,
            userId TEXT,
            timestamp INTEGER,
            FOREIGN KEY(branchId) REFERENCES branches(id)
          );
        `);

        // 7. Indexes
        await db.execute("CREATE INDEX IF NOT EXISTS idx_branch_inventory_ing ON branch_inventory(ingredientId);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_branch_transfers_src ON branch_transfers(sourceBranchId);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_branch_transfers_dst ON branch_transfers(destBranchId);");

        logger.info("database", "Successfully applied Version 7 schema migrations.");
      }
    });

    // Migration Version 8: Phase 7 - Production Readiness & Release Engineering
    this.migrations.push({
      version: 8,
      up: async (db: DatabaseAdapter) => {
        logger.info("database", "Executing schema upgrade to Version 8 (Production Readiness)...");

        // 1. Detailed Audit Override Trails
        await db.execute(`
          CREATE TABLE IF NOT EXISTS global_audit_logs (
            id TEXT PRIMARY KEY,
            actionType TEXT NOT NULL,
            tableName TEXT,
            recordId TEXT,
            oldValues TEXT,
            newValues TEXT,
            userId TEXT,
            terminalId TEXT,
            timestamp INTEGER
          );
        `);

        // 2. User Roles & Permission Overrides
        await db.execute(`
          CREATE TABLE IF NOT EXISTS user_roles (
            userId TEXT PRIMARY KEY,
            roleName TEXT NOT NULL,
            permissionsList TEXT
          );
        `);

        // 3. System Logs Store
        await db.execute(`
          CREATE TABLE IF NOT EXISTS system_logs (
            id TEXT PRIMARY KEY,
            category TEXT,
            level TEXT,
            message TEXT,
            timestamp INTEGER
          );
        `);

        // 4. Indexes
        await db.execute("CREATE INDEX IF NOT EXISTS idx_global_audit_action ON global_audit_logs(actionType);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_system_logs_cat ON system_logs(category);");

        logger.info("database", "Successfully applied Version 8 schema migrations.");
      }
    });

    // Migration Version 9: Phase 8 - Dual Printer Routing & Production Printing
    this.migrations.push({
      version: 9,
      up: async (db: DatabaseAdapter) => {
        logger.info("database", "Executing schema upgrade to Version 9 (Production Printing)...");

        // 1. Printers Master Registry
        await db.execute(`
          CREATE TABLE IF NOT EXISTS printers (
            id TEXT PRIMARY KEY,
            name TEXT,
            printerType TEXT,
            connectionType TEXT,
            ipAddress TEXT,
            port INTEGER,
            usbDevice TEXT,
            paperWidth INTEGER DEFAULT 80,
            isDefault INTEGER DEFAULT 0,
            status TEXT DEFAULT 'online',
            createdAt INTEGER,
            updatedAt INTEGER
          );
        `);

        // 2. Category Routing Overrides
        await db.execute(`
          CREATE TABLE IF NOT EXISTS printer_routes (
            id TEXT PRIMARY KEY,
            categoryId TEXT,
            printerId TEXT,
            priority INTEGER DEFAULT 1,
            FOREIGN KEY(printerId) REFERENCES printers(id)
          );
        `);

        // 3. Print Jobs Queue
        await db.execute(`
          CREATE TABLE IF NOT EXISTS print_jobs (
            id TEXT PRIMARY KEY,
            printerId TEXT,
            jobType TEXT,
            entityType TEXT,
            entityId TEXT,
            copies INTEGER DEFAULT 1,
            priority INTEGER DEFAULT 1,
            status TEXT DEFAULT 'pending',
            retryCount INTEGER DEFAULT 0,
            errorMessage TEXT,
            createdAt INTEGER,
            completedAt INTEGER
          );
        `);

        // 4. Print Log History
        await db.execute(`
          CREATE TABLE IF NOT EXISTS print_history (
            id TEXT PRIMARY KEY,
            jobId TEXT,
            printerId TEXT,
            result TEXT,
            duration INTEGER,
            printedAt INTEGER
          );
        `);

        // 5. Heartbeat Status Checks
        await db.execute(`
          CREATE TABLE IF NOT EXISTS printer_heartbeat (
            printerId TEXT PRIMARY KEY,
            lastSeen INTEGER,
            latency INTEGER,
            paperStatus TEXT,
            cutterStatus TEXT,
            connectionStatus TEXT,
            FOREIGN KEY(printerId) REFERENCES printers(id)
          );
        `);

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
