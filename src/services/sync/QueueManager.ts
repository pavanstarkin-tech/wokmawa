import localDb from "../database/localDb";
import logger from "../logger/Logger";

export interface SyncItem {
  id: string;
  action: "create-order" | "update-order-status" | "update-menu" | "update-settings";
  payload: any;
  createdAt: number;
}

class QueueManager {
  public getQueue(): SyncItem[] {
    return localDb.getTable("syncQueue") || [];
  }

  public enqueue(action: SyncItem["action"], payload: any): SyncItem {
    const newItem: Omit<SyncItem, "id"> = {
      action,
      payload,
      createdAt: Date.now()
    };
    const saved = localDb.insertRecord("syncQueue", newItem) as SyncItem;
    logger.info("sync", `Enqueued sync item [${action}]`, { id: saved.id });
    return saved;
  }

  public dequeue(id: string) {
    localDb.deleteRecord("syncQueue", id);
    logger.info("sync", `Dequeued sync item`, { id });
  }

  public clearQueue() {
    localDb.clearTable("syncQueue");
    logger.warn("sync", "Sync queue cleared manually.");
  }
}

export const queueManager = new QueueManager();
export default queueManager;
