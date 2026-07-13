import logger from "@/services/logger/Logger";

export class KioskManager {
  private isKioskActive = false;

  public async enterKioskMode(): Promise<void> {
    try {
      logger.info("desktop", "Enabling borderless fullscreen Kiosk safety lock.");
      if (typeof window !== "undefined" && (window as any).systemAPI?.setKioskMode) {
        await (window as any).systemAPI.setKioskMode(true);
        this.isKioskActive = true;
      }
    } catch (err) {
      logger.error("desktop", "Failed entering Kiosk mode", err);
    }
  }

  public async exitKioskMode(managerPin: string): Promise<boolean> {
    // Override PIN verification check
    if (managerPin !== "9999") {
      logger.warn("desktop", "Failed manager Kiosk override attempt.");
      return false;
    }

    try {
      logger.info("desktop", "Authorized manager Kiosk exit requested.");
      if (typeof window !== "undefined" && (window as any).systemAPI?.setKioskMode) {
        await (window as any).systemAPI.setKioskMode(false);
        this.isKioskActive = false;
        return true;
      }
    } catch (err) {
      logger.error("desktop", "Failed exiting Kiosk mode", err);
    }
    return false;
  }

  public isActive(): boolean {
    return this.isKioskActive;
  }
}

export const kioskManager = new KioskManager();
export default kioskManager;
