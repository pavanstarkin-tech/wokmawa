import dbService from "../../core/database/DatabaseService";
import { dbEventBus } from "../../core/database/DatabaseEventBus";
import logger from "@/services/logger/Logger";

export class MenuPublisher {
  private get db() {
    return dbService.getAdapter();
  }

  public async publishMenuToBranch(branchId: string, items: Array<{ id: string; price: number }>): Promise<void> {
    try {
      logger.info("franchise", `Publishing price matrix adjustments to branch: ${branchId}`);
      
      // Seed default override log
      const auditId = `aud_${Date.now()}`;
      await this.db.execute(
        `INSERT INTO branch_audit_logs (id, branchId, eventType, details, userId, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [auditId, branchId, "price_sync", `Published ${items.length} price matrix items override centrally.`, "central_admin", Date.now()]
      );

      dbEventBus.emit("menu.published", { branchId, count: items.length });
    } catch (err) {
      logger.error("franchise", "Failed publishing menu to branches", err);
      throw err;
    }
  }

  public async getBranchesList(): Promise<any[]> {
    return this.db.query("SELECT * FROM branches ORDER BY name ASC");
  }

  public async registerBranch(id: string, name: string, region: string, address: string): Promise<void> {
    await this.db.execute(
      "INSERT INTO branches (id, name, region, address, status) VALUES (?, ?, ?, ?, 'active')",
      [id, name, region, address]
    );
  }
}

export const menuPublisher = new MenuPublisher();
export default menuPublisher;
