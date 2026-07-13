import logger from "@/services/logger/Logger";

export interface SyncConflict {
  entityId: string;
  table: string;
  localState: any;
  remoteState: any;
}

export class CloudConflictResolver {
  public async resolveConflict(conflict: SyncConflict): Promise<any> {
    logger.warn("cloud", `Conflict detected in table ${conflict.table} for item ${conflict.entityId}`);
    
    // Default LWW (Last Write Wins) strategy
    const localTime = conflict.localState?.updatedAt || 0;
    const remoteTime = conflict.remoteState?.updatedAt || 0;

    if (localTime >= remoteTime) {
      logger.info("cloud", `Resolved conflict using Local state (LWW) for ${conflict.entityId}`);
      return conflict.localState;
    }

    logger.info("cloud", `Resolved conflict using Remote state (LWW) for ${conflict.entityId}`);
    return conflict.remoteState;
  }
}

export const cloudConflictResolver = new CloudConflictResolver();
export default cloudConflictResolver;
