import dbService from "../../core/database/DatabaseService";

export class CategoryRouting {
  private get db() {
    return dbService.getAdapter();
  }

  public async setRoute(categoryId: string, printerId: string): Promise<void> {
    const id = `route_${Date.now()}`;
    await this.db.execute(
      `INSERT INTO printer_routes (id, categoryId, printerId)
       VALUES (?, ?, ?)
       ON CONFLICT(id) 
       DO UPDATE SET printerId = ?`,
      [id, categoryId, printerId, printerId]
    );
  }

  public async getRoutePrinter(categoryId: string): Promise<string | null> {
    const rows = await this.db.query("SELECT printerId FROM printer_routes WHERE categoryId = ?", [categoryId]);
    if (rows.length === 0) return null;
    return rows[0].printerId;
  }
}

export const categoryRouting = new CategoryRouting();
export default categoryRouting;
