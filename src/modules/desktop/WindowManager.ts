import logger from "../../../services/logger/Logger";

export interface WindowConfig {
  id: string;
  title: string;
  route: string;
  width: number;
  height: number;
  monitor?: number;
}

export class WindowManager {
  /**
   * Spawns a secondary window in the Electron main process via exposed IPC channel API.
   */
  public async openWindow(config: WindowConfig): Promise<void> {
    try {
      logger.info("desktop", `Spawning window: ${config.title} at route ${config.route}`);
      if (typeof window !== "undefined" && (window as any).systemAPI?.openWindow) {
        await (window as any).systemAPI.openWindow(config);
      } else {
        logger.warn("desktop", "systemAPI.openWindow not available in this shell environment.");
      }
    } catch (err) {
      logger.error("desktop", "Failed spawning desktop window config", err);
    }
  }

  public async closeWindow(windowId: string): Promise<void> {
    try {
      logger.info("desktop", `Closing window: ${windowId}`);
      if (typeof window !== "undefined" && (window as any).systemAPI?.closeWindow) {
        await (window as any).systemAPI.closeWindow(windowId);
      }
    } catch (err) {
      logger.error("desktop", "Failed closing window", err);
    }
  }
}

export const windowManager = new WindowManager();
export default windowManager;
