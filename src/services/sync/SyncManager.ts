import { ref, set, update, get } from "firebase/database";
import { db } from "@/lib/firebase";
import queueManager, { type SyncItem } from "./QueueManager";
import conflictResolver from "./ConflictResolver";
import logger from "../logger/Logger";
import eventBus from "../event-bus/eventBus";

class SyncManager {
  private isOnline = true;
  private syncing = false;
  private checkInterval: any = null;

  constructor() {
    this.setupListeners();
    this.startAutoSync();
  }

  private setupListeners() {
    if (typeof window === "undefined") return;

    this.isOnline = window.navigator.onLine;

    window.addEventListener("online", () => {
      this.isOnline = true;
      logger.info("sync", "System back online. Triggering synchronization...");
      eventBus.emit("network.status", { online: true });
      this.sync();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      logger.warn("sync", "System went offline. Shift operations will compile locally.");
      eventBus.emit("network.status", { online: false });
    });
  }

  private startAutoSync() {
    // Check network and flush queue every 15 seconds
    this.checkInterval = setInterval(() => {
      if (this.isOnline && !this.syncing) {
        this.sync();
      }
    }, 15000);
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public async sync(): Promise<void> {
    if (this.syncing) return;
    const queue = queueManager.getQueue();
    if (queue.length === 0) return;

    this.syncing = true;
    logger.info("sync", `Synchronizing ${queue.length} pending offline transactions...`);

    for (const item of queue) {
      const success = await this.processSyncItem(item);
      if (success) {
        queueManager.dequeue(item.id);
      } else {
        // Stop batch if we hit a blocking connection error
        logger.warn("sync", `Sync item failed, pausing queue processing: ${item.action}`);
        break;
      }
    }

    this.syncing = false;
  }

  private async processSyncItem(item: SyncItem): Promise<boolean> {
    try {
      const payload = item.payload;

      switch (item.action) {
        case "create-order": {
          const orderRef = ref(db, `restaurant/orders/${payload.id}`);
          
          // Check for conflicts
          const remoteSnap = await get(orderRef);
          if (remoteSnap.exists()) {
            const remoteOrder = remoteSnap.val();
            const resolved = conflictResolver.resolve(payload, remoteOrder);
            await set(orderRef, resolved);
          } else {
            await set(orderRef, payload);
          }
          eventBus.emit("order.synced", { orderId: payload.id, firebaseId: payload.id });
          break;
        }

        case "update-order-status": {
          const orderRef = ref(db, `restaurant/orders/${payload.id}`);
          const snap = await get(orderRef);
          if (snap.exists()) {
            const remoteOrder = snap.val();
            const updatedOrder = { ...remoteOrder, status: payload.status, updatedAt: Date.now() };
            await set(orderRef, updatedOrder);
          } else {
            // Push anyway if remote doesn't exist
            await update(ref(db, `restaurant/orders`), { [payload.id]: { id: payload.id, status: payload.status, updatedAt: Date.now() } });
          }
          break;
        }

        case "update-menu": {
          await set(ref(db, `restaurant/menu`), payload);
          break;
        }

        case "update-settings": {
          await set(ref(db, `restaurant/settings`), payload);
          break;
        }

        default:
          logger.warn("sync", `Unknown sync action type: ${item.action}`);
          return true; // Skip
      }

      logger.info("sync", `Successfully synchronized sync item: ${item.id} (${item.action})`);
      return true;
    } catch (err: any) {
      logger.error("sync", `Failed to sync item ${item.id}`, err);
      return false; // Connection failure or firebase lock
    }
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

export const syncManager = new SyncManager();
export default syncManager;
