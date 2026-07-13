import { BaseRepository } from "./BaseRepository";
import { MenuItem } from "@/lib/paakashala-menu";
import { MENU } from "@/lib/paakashala-menu";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";
import logger from "@/services/logger/Logger";

export class MenuRepository extends BaseRepository {
  private mapRowToModel(row: any): MenuItem {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      price: row.price !== null ? row.price : null,
      mrp: row.mrp !== null ? row.mrp : null,
      type: row.type as any,
      image: row.image,
      description: row.description || undefined,
      available: row.available === 1
    };
  }

  public async getAll(): Promise<MenuItem[]> {
    const rows = await this.db.query("SELECT * FROM menu");
    if (rows.length === 0) {
      await this.seedMenu();
      return this.getAll();
    }
    return rows.map(r => this.mapRowToModel(r));
  }

  public async getByCategory(category: string): Promise<MenuItem[]> {
    const rows = await this.db.query("SELECT * FROM menu WHERE category = ?", [category]);
    return rows.map(r => this.mapRowToModel(r));
  }

  public async findById(id: string): Promise<MenuItem | null> {
    const rows = await this.db.query("SELECT * FROM menu WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return this.mapRowToModel(rows[0]);
  }

  public async saveItem(item: MenuItem): Promise<void> {
    const now = Date.now();
    await this.db.execute(
      `INSERT OR REPLACE INTO menu (
        id, name, category, price, mrp, type, image, description, available, syncStatus, updatedAt, branchId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.name,
        item.category,
        item.price,
        item.mrp || item.price,
        item.type,
        item.image,
        item.description || null,
        item.available !== false ? 1 : 0,
        "pending",
        now,
        "MAIN_BRANCH"
      ]
    );

    // Schedule sync instruction (Server wins conflict, but we still queue local additions)
    const syncJobId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      "INSERT INTO syncQueue (id, entity, operation, entityId, status, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [syncJobId, "menu", "update", item.id, "pending", now, "MAIN_BRANCH"]
    );

    dbEventBus.emit("menu.updated", item);
  }

  public async deleteItem(id: string): Promise<void> {
    await this.db.execute("DELETE FROM menu WHERE id = ?", [id]);
    
    const now = Date.now();
    const syncJobId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.execute(
      "INSERT INTO syncQueue (id, entity, operation, entityId, status, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [syncJobId, "menu", "delete", id, "pending", now, "MAIN_BRANCH"]
    );

    dbEventBus.emit("menu.deleted", { id });
  }

  /**
   * Seeds the database with default items configured in paakashala-menu.ts
   */
  public async seedMenu(): Promise<void> {
    logger.info("database", "Seeding menu table from local config file...");
    
    // Create menu table if missing
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS menu (
        id TEXT PRIMARY KEY,
        name TEXT,
        category TEXT,
        price REAL,
        mrp REAL,
        type TEXT,
        image TEXT,
        description TEXT,
        available INTEGER DEFAULT 1,
        syncStatus TEXT DEFAULT 'pending',
        updatedAt INTEGER,
        branchId TEXT
      );
    `);

    for (const item of MENU) {
      await this.db.execute(
        `INSERT OR REPLACE INTO menu (
          id, name, category, price, mrp, type, image, description, available, syncStatus, updatedAt, branchId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.category,
          item.price,
          item.mrp || item.price,
          item.type,
          item.image,
          item.description || null,
          1,
          "pending",
          Date.now(),
          "MAIN_BRANCH"
        ]
      );
    }
    logger.info("database", `Seeded ${MENU.length} menu items successfully.`);
  }
}

export const menuRepository = new MenuRepository();
export default menuRepository;
