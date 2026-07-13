import { DatabaseAdapter } from "./DatabaseAdapter";
import { IPCDatabaseAdapter } from "./IPCDatabaseAdapter";
import { SqlJsAdapter } from "./SqlJsAdapter";
import logger from "@/services/logger/Logger";

class DatabaseService {
  private adapter: DatabaseAdapter | null = null;
  private initializingPromise: Promise<DatabaseAdapter> | null = null;

  public async initialize(): Promise<DatabaseAdapter> {
    if (this.adapter) return this.adapter;
    if (this.initializingPromise) return this.initializingPromise;

    this.initializingPromise = (async () => {
      try {
        if (typeof window !== "undefined" && (window as any).databaseAPI) {
          logger.info("database", "Electron environment detected. Loading IPCDatabaseAdapter (better-sqlite3).");
          this.adapter = new IPCDatabaseAdapter();
        } else {
          logger.warn("database", "Web browser environment detected. Loading SqlJsAdapter (sql.js WebAssembly fallback).");
          const wasmAdapter = new SqlJsAdapter();
          await wasmAdapter.initialize();
          this.adapter = wasmAdapter;
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
