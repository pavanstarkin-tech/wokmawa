import { DatabaseAdapter } from "./DatabaseAdapter";
import { IPCDatabaseAdapter } from "./IPCDatabaseAdapter";
import { SqlJsAdapter } from "./SqlJsAdapter";
import logger from "@/services/logger/Logger";

class ServerMockAdapter implements DatabaseAdapter {
  async execute() { return { changes: 0, lastInsertRowid: 0 }; }
  async query() { return []; }
  async transaction() {}
  async backup() { return { success: false, error: "Not supported in SSR" }; }
  async restore() { return { success: false, error: "Not supported in SSR" }; }
  async vacuum() {}
  async close() {}
  async healthCheck() { return { healthy: true, details: "SSR Mock Adapter" }; }
}

class DatabaseService {
  private adapter: DatabaseAdapter | null = null;
  private initializingPromise: Promise<DatabaseAdapter> | null = null;

  public async initialize(): Promise<DatabaseAdapter> {
    if (this.adapter) return this.adapter;
    if (this.initializingPromise) return this.initializingPromise;

    this.initializingPromise = (async () => {
      try {
        if (typeof window === "undefined") {
          logger.info("database", "Server-side rendering (SSR) environment detected. Loading ServerMockAdapter.");
          this.adapter = new ServerMockAdapter();
        } else if ((window as any).databaseAPI) {
          logger.info("database", "Electron environment detected. Loading IPCDatabaseAdapter (better-sqlite3).");
          this.adapter = new IPCDatabaseAdapter();
          // Run database migrations and schema checks prior to resolving the adapter
          const SchemaManager = (await import("./SchemaManager")).default;
          await SchemaManager.initialize(this.adapter);
        } else {
          logger.warn("database", "Web browser environment detected. Loading SqlJsAdapter (sql.js WebAssembly fallback).");
          try {
            const wasmAdapter = new SqlJsAdapter();
            await wasmAdapter.initialize();
            this.adapter = wasmAdapter;
            // Run database migrations and schema checks prior to resolving the adapter
            const SchemaManager = (await import("./SchemaManager")).default;
            await SchemaManager.initialize(this.adapter);
          } catch (wasmErr) {
            logger.warn("database", "SqlJsAdapter init failed, using fallback in-memory adapter:", wasmErr);
            this.adapter = new ServerMockAdapter();
          }
        }
        return this.adapter;
      } catch (err: any) {
        logger.error("database", "Failed to initialize active database adapter service.", err);
        this.initializingPromise = null;
        throw err;
      }
    })();

    return this.initializingPromise;
  }

  public getAdapter(): DatabaseAdapter {
    if (!this.adapter) {
      throw new Error("DatabaseAdapter not initialized. Ensure dbService.initialize() is called and awaited.");
    }
    return this.adapter;
  }
}

export const dbService = new DatabaseService();
export default dbService;
