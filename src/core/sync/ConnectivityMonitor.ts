import logger from "@/services/logger/Logger";

type ConnectivityCallback = (online: boolean) => void;

export class ConnectivityMonitor {
  private online = typeof navigator !== "undefined" ? navigator.onLine : true;
  private listeners: ConnectivityCallback[] = [];
  private checkInterval: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.start();
    }
  }

  public start() {
    if (typeof window === "undefined") return;

    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    // Regular active ping checks to verify actual internet access
    this.checkInterval = setInterval(() => {
      this.verifyInternetAccess();
    }, 15000);

    this.verifyInternetAccess();
  }

  public stop() {
    if (typeof window === "undefined") return;
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  public isOnline(): boolean {
    return this.online;
  }

  public onChange(callback: ConnectivityCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private handleOnline = () => {
    logger.info("sync", "Local network reports interface is online. Checking internet access...");
    this.verifyInternetAccess();
  };

  private handleOffline = () => {
    logger.warn("sync", "Local network interface is disconnected.");
    this.updateStatus(false);
  };

  private async verifyInternetAccess() {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.updateStatus(false);
      return;
    }

    try {
      // Fetch a tiny image or perform a lightweight HEAD ping request
      const response = await fetch("https://clients3.google.com/generate_204", {
        mode: "no-cors",
        cache: "no-store",
        method: "HEAD"
      });
      this.updateStatus(true);
    } catch {
      logger.warn("sync", "Interface is connected but internet ping test failed (Captive portal or router failure).");
      this.updateStatus(false);
    }
  }

  private updateStatus(newStatus: boolean) {
    if (this.online !== newStatus) {
      this.online = newStatus;
      logger.info("sync", `Internet connectivity changed: ${newStatus ? "ONLINE" : "OFFLINE"}`);
      this.listeners.forEach(cb => cb(newStatus));
    }
  }
}

export const connectivityMonitor = new ConnectivityMonitor();
export default connectivityMonitor;
