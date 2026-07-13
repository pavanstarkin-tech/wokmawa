import logger from "@/services/logger/Logger";

export class ConflictResolver {
  /**
   * Resolves a synchronization conflict between a local SQLite record and a remote Firebase record.
   * Rules:
   *  - Orders / Bills: Local wins (overwrites server)
   *  - Menu: Server wins (overwrites local)
   *  - Settings: Latest version number wins
   */
  public static resolve<T = any>(
    entity: string,
    local: T | null,
    remote: T | null
  ): { resolved: T | null; action: "upload" | "download" | "none" } {
    if (!local && !remote) return { resolved: null, action: "none" };
    if (!local) return { resolved: remote, action: "download" };
    if (!remote) return { resolved: local, action: "upload" };

    // If both exist:
    switch (entity) {
      case "orders":
      case "bills":
      case "cashSessions":
        logger.info("sync", `Conflict resolved for ${entity}: Local Wins.`);
        return { resolved: local, action: "upload" };

      case "menu":
        logger.info("sync", `Conflict resolved for menu: Server Wins.`);
        return { resolved: remote, action: "download" };

      case "settings": {
        const lVer = (local as any).version || 0;
        const rVer = (remote as any).version || 0;
        
        if (lVer >= rVer) {
          logger.info("sync", `Conflict resolved for settings: Local version (${lVer}) wins.`);
          return { resolved: local, action: "upload" };
        } else {
          logger.info("sync", `Conflict resolved for settings: Remote version (${rVer}) wins.`);
          return { resolved: remote, action: "download" };
        }
      }

      default:
        // Fallback: Latest timestamp wins
        const lTime = (local as any).updatedAt || (local as any).createdAt || 0;
        const rTime = (remote as any).updatedAt || (remote as any).createdAt || 0;
        
        if (lTime >= rTime) {
          return { resolved: local, action: "upload" };
        } else {
          return { resolved: remote, action: "download" };
        }
    }
  }
}

export default ConflictResolver;
