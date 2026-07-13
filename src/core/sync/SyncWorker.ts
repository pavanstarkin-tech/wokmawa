import { ref, get, set, update, remove } from "firebase/database";
import { db as firebaseDb } from "@/lib/firebase";
import { syncQueue, SyncJob } from "./SyncQueue";
import dbService from "../database/DatabaseService";
import { ConflictResolver } from "./ConflictResolver";
import logger from "@/services/logger/Logger";

export class SyncWorker {
  private get sqlite() {
    return dbService.getAdapter();
  }

  /**
   * Processes a batch of pending synchronization jobs.
   */
  public async processNextBatch(): Promise<number> {
    const rawJobs = await syncQueue.getPending();
    if (rawJobs.length === 0) return 0;

    // 1. Sort jobs by dependencies (e.g. Orders first)
    const sortedJobs = syncQueue.sortPendingByDependency(rawJobs);

    // 2. Batch up to 10 matching entity insertions/updates to optimize network traffic
    const batchSize = 10;
    const activeJobs = sortedJobs.slice(0, batchSize);

    // Group jobs by entity to see if we can run a batch update
    const batchUpdates: Record<string, any> = {};
    const jobsToRemove: string[] = [];

    for (const job of activeJobs) {
      await syncQueue.updateStatus(job.id, "uploading");
      
      try {
        const success = await this.syncSingleJob(job, batchUpdates);
        if (success) {
          jobsToRemove.push(job.id);
        }
      } catch (err: any) {
        logger.error("sync", `Sync job ${job.id} failed. Rescheduling.`, err);
        await syncQueue.incrementVisibleRetry(job.id);
      }
    }

    // 3. Commit the batched updates to Firebase in one network sweep
    if (Object.keys(batchUpdates).length > 0) {
      try {
        const rootRef = ref(firebaseDb);
        await update(rootRef, batchUpdates);
        logger.info("sync", `Committed batch of ${Object.keys(batchUpdates).length} path updates to Firebase.`);
      } catch (err: any) {
        logger.error("sync", "Failed committing batch updates to Firebase", err);
        throw err;
      }
    }

    // 4. Clean up SQLite sync queue
    for (const jobId of jobsToRemove) {
      await syncQueue.remove(jobId);
    }

    return activeJobs.length;
  }

  private async syncSingleJob(job: SyncJob, batchUpdates: Record<string, any>): Promise<boolean> {
    const sqlTable = job.entity === "shifts" ? "cashSessions" : (job.entity === "syncQueue" ? "syncQueue" : job.entity);
    const fbPath = `restaurant/${job.entity}/${job.entityId}`;

    if (job.operation === "delete") {
      // Direct deletion from Firebase
      batchUpdates[fbPath] = null;
      return true;
    }

    // Fetch the absolute freshest state from local SQLite (prevents stale payload uploads)
    const localRows = await this.sqlite.query(`SELECT * FROM ${sqlTable} WHERE id = ?`, [job.entityId]);
    if (localRows.length === 0) {
      // Local row has been deleted, drop the sync job
      return true;
    }
    const localRecord = localRows[0];

    // Conflict Check
    const fbRef = ref(firebaseDb, fbPath);
    let remoteRecord: any = null;
    try {
      const snap = await get(fbRef);
      if (snap.exists()) {
        remoteRecord = snap.val();
      }
    } catch (err) {
      // Network fetch error, abort and retry later
      throw err;
    }

    const { resolved, action } = ConflictResolver.resolve(job.entity, localRecord, remoteRecord);

    if (action === "upload" && resolved) {
      // Map properties for Firebase (e.g. serialize parsed fields if required)
      const uploadPayload = { ...resolved };
      // Strip database properties
      delete uploadPayload.syncStatus;
      
      batchUpdates[fbPath] = uploadPayload;
      return true;
    } else if (action === "download" && resolved) {
      // Server wins: Write remote record back to local SQLite database
      const columns = Object.keys(resolved).join(", ");
      const placeholders = Object.keys(resolved).map(() => "?").join(", ");
      const values = Object.values(resolved);

      await this.sqlite.execute(`INSERT OR REPLACE INTO ${sqlTable} (${columns}) VALUES (${placeholders})`, values);
      return true;
    }

    return true; // No action required
  }
}

// Add incrementVisibleRetry helper
(syncQueue as any).incrementVisibleRetry = async function(id: string) {
  await this.incrementRetry(id);
};

export const syncWorker = new SyncWorker();
export default syncWorker;
