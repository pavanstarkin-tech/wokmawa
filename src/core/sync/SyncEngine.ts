import { connectivityMonitor } from "./ConnectivityMonitor";
import { syncWorker } from "./SyncWorker";
import { dbEventBus } from "../database/DatabaseEventBus";
import logger from "@/services/logger/Logger";

export class SyncEngine {
  private active = false;
  private syncInProgress = false;
  private backoffDelay = 2000; // Start with 2 seconds

  public start() {
    if (this.active) return;
    this.active = true;
    logger.info("sync", "Starting Offline Sync Engine...");

    // 1. Listen to connectivity state changes
    connectivityMonitor.onChange((online) => {
      if (online) {
        this.triggerSync();
      }
    });

    // 2. Listen to database mutations enqueued
    dbEventBus.on("syncQueue.changed", () => {
      this.triggerSync();
    });

    // Run initial sync on startup
    if (connectivityMonitor.isOnline()) {
      this.triggerSync();
    }
  }

  public async triggerSync(): Promise<void> {
    if (this.syncInProgress || !connectivityMonitor.isOnline()) {
      return;
    }

    this.syncInProgress = true;
    try {
      while (connectivityMonitor.isOnline()) {
        const processed = await syncWorker.processNextBatch();
        if (processed === 0) {
          // No more pending sync jobs
          break;
        }
        
        // Reset backoff delay on successful processing
        this.backoffDelay = 2000;
        
        // Small delay between batches to yield thread
        await new Promise(r => setTimeout(r, 100));
      }
    } catch (err) {
      logger.error("sync", "SyncEngine batch iteration failed. Rescheduling with backoff.", err);
      
      // Implement Exponential Backoff delay
      this.backoffDelay = Math.min(60000, this.backoffDelay * 2); // Max 60 seconds
      setTimeout(() => {
        this.triggerSync();
      }, this.backoffDelay);
    } finally {
      this.syncInProgress = false;
    }
  }
}

export const syncEngine = new SyncEngine();
export default syncEngine;
