import { DatabaseAdapter } from "./DatabaseAdapter";

export class IPCDatabaseAdapter implements DatabaseAdapter {
  private api: any;

  constructor() {
    this.api = (window as any).databaseAPI;
    if (!this.api) {
      throw new Error("databaseAPI context bridge not found on window. Ensure running inside Electron.");
    }
  }

  public async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number | string }> {
    return this.api.execute(sql, params);
  }

  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.api.query(sql, params);
  }

  public async transaction(queries: Array<{ sql: string; params?: any[] }>): Promise<void> {
    return this.api.transaction(queries);
  }

  public async backup(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    return this.api.backup();
  }

  public async restore(backupPath: string): Promise<{ success: boolean; error?: string }> {
    return this.api.restore(backupPath);
  }

  public async vacuum(): Promise<void> {
    return this.api.vacuum();
  }

  public async close(): Promise<void> {
    // Main process handles closing
  }

  public async healthCheck(): Promise<{ healthy: boolean; details?: string }> {
    return this.api.health();
  }
}

export default IPCDatabaseAdapter;
