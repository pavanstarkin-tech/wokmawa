import logger from "../logger/Logger";

class ConflictResolver {
  /**
   * Resolves conflicts between a local record and a remote server record.
   * Employs standard "Last Write Wins" (LWW) based on updatedAt timestamps,
   * with custom overrides for specific statuses.
   */
  public resolve<T extends { id: string; updatedAt?: number; createdAt?: number; status?: string }>(
    local: T,
    remote: T
  ): T {
    const localTime = local.updatedAt || local.createdAt || 0;
    const remoteTime = remote.updatedAt || remote.createdAt || 0;

    // Special Rule: For order statuses, "preparing" / "ready" / "served" takes precedence over "pending".
    if (local.status && remote.status && local.status !== remote.status) {
      const statusPriority: Record<string, number> = {
        pending: 1,
        preparing: 2,
        ready: 3,
        served: 4,
        completed: 4,
        cancelled: 5,
      };

      const localPriority = statusPriority[local.status] || 0;
      const remotePriority = statusPriority[remote.status] || 0;

      if (localPriority > remotePriority) {
        logger.info("sync", `Resolved order status conflict for ${local.id} -> locally wins (${local.status} over ${remote.status})`);
        return local;
      } else if (remotePriority > localPriority) {
        logger.info("sync", `Resolved order status conflict for ${local.id} -> remotely wins (${remote.status} over ${local.status})`);
        return remote;
      }
    }

    // Default LWW (Last Write Wins)
    if (localTime >= remoteTime) {
      logger.info("sync", `Resolved conflict for ${local.id} using Last-Write-Wins -> local wins.`);
      return local;
    }

    logger.info("sync", `Resolved conflict for ${local.id} using Last-Write-Wins -> remote wins.`);
    return remote;
  }
}

export const conflictResolver = new ConflictResolver();
export default conflictResolver;
