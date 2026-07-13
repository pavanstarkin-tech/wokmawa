import localDb from "@/services/database/localDb";
import logger from "@/services/logger/Logger";
import eventBus from "@/services/event-bus/eventBus";
import { printerRepository } from "../repository/PrinterRepository";
import { PrinterConfig } from "../types/types";

class PrinterMonitor {
  private monitorInterval: any = null;
  private isChecking = false;

  constructor() {
    this.start();
  }

  public start() {
    if (this.monitorInterval) return;
    logger.info("printer", "Starting Printer Monitor service.");
    
    // Check health every 30 seconds
    this.monitorInterval = setInterval(() => {
      this.checkAllPrinters();
    }, 30000);

    // Run first check immediately on boot
    setTimeout(() => {
      this.checkAllPrinters();
    }, 2000);
  }

  public stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      logger.info("printer", "Stopped Printer Monitor service.");
    }
  }

  /**
   * Run health checks on all active printers.
   * Suspends pings if the queue is currently busy printing to avoid connection clashes.
   */
  public async checkAllPrinters(force = false): Promise<void> {
    if (this.isChecking) return;
    
    // Check if queue has active jobs
    const activeJobs = localDb.getTable("printJobs") || [];
    const isBusy = activeJobs.some(j => j.status === "processing" || j.status === "pending");

    if (isBusy && !force) {
      // Skip health check to keep printer connection clean for real print jobs
      return;
    }

    this.isChecking = true;
    const printers = printerRepository.getPrinters();
    
    const promises = printers.map(async pr => {
      if (!pr.enabled) return;

      if (pr.type === "lan" && pr.ip) {
        await this.checkLANPrinter(pr);
      } else if (pr.type === "mock") {
        this.updateHealthState(pr.id, "online", 1);
      }
    });

    await Promise.all(promises);
    this.isChecking = false;
  }

  private async checkLANPrinter(printer: PrinterConfig): Promise<void> {
    const start = Date.now();
    const printerAPI = (window as any).printerAPI;

    if (!printerAPI || typeof printerAPI.printNetwork !== "function") {
      // Running inside browser context fallback
      this.updateHealthState(printer.id, "online", 5);
      return;
    }

    try {
      // ESC @ (Initialize) is a safe, non-printing command to test port 9100 reachability
      const initializeCmd = new Uint8Array([0x1b, 0x40]);
      const res = await printerAPI.printNetwork(printer.ip, printer.port || 9100, initializeCmd);
      const latency = Date.now() - start;

      if (res.success) {
        this.updateHealthState(printer.id, "online", latency);
      } else {
        this.updateHealthState(printer.id, "offline", undefined, res.error || "Connection timed out");
      }
    } catch (err: any) {
      this.updateHealthState(printer.id, "offline", undefined, err.message);
    }
  }

  private updateHealthState(
    printerId: string,
    status: "online" | "offline",
    latencyMs?: number,
    error?: string
  ): void {
    const pr = printerRepository.getPrinter(printerId);
    if (!pr) return;

    const oldStatus = pr.status;
    if (oldStatus !== status || pr.latencyMs !== latencyMs) {
      // Update database config
      printerRepository.savePrinter({
        ...pr,
        status,
        latencyMs
      });

      // Emit events on the Event Bus
      eventBus.emit("printer.health.changed", { printerId, status, latencyMs });
      
      if (status === "online" && oldStatus !== "online") {
        eventBus.emit("printer.connected", { printerId, latencyMs: latencyMs || 0 });
        this.logEvent(printerId, "info", "Connected", `Printer ${pr.name} detected online.`);
      } else if (status === "offline" && oldStatus === "online") {
        eventBus.emit("printer.disconnected", { printerId, error });
        this.logEvent(printerId, "error", "Disconnected", `Printer ${pr.name} went offline: ${error || "Unreachable"}`);
      }
    }
  }

  private logEvent(printerId: string, level: "info" | "warn" | "error", event: any, message: string) {
    localDb.insertRecord("printerLogs", {
      printerId,
      level,
      event,
      message,
      timestamp: Date.now()
    });
  }
}

export const printerMonitor = new PrinterMonitor();
export default printerMonitor;
