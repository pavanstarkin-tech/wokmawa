import localDb from "@/services/database/localDb";
import logger from "@/services/logger/Logger";
import eventBus from "@/services/event-bus/eventBus";
import { PrintJob, PrinterConfig, PrintHistoryEntry } from "../types/types";
import { printerRepository } from "../repository/PrinterRepository";
import { driverManager } from "../drivers/DriverManager";

class PrinterQueue {
  private processingPrinters: Record<string, boolean> = {};
  private pausedPrinters: Record<string, boolean> = {};

  constructor() {
    // Postpone boot recovery until repository and localDb are initialized
    setTimeout(() => {
      this.restoreQueue();
    }, 100);
  }

  /**
   * Generates a simple checksum hash for a string/Uint8Array to prevent duplicates
   */
  private generateHash(data: string | Uint8Array): string {
    const str = typeof data === "string" ? data : new TextDecoder().decode(data.slice(0, 1000));
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return `h_${hash}_${str.length}`;
  }

  /**
   * Restores pending jobs on boot
   */
  public async restoreQueue(): Promise<void> {
    try {
      logger.info("printer", "Initializing print queue boot recovery...");
      const jobs: PrintJob[] = localDb.getTable("printJobs") || [];
      
      // Reset any stuck "processing" jobs back to "pending"
      let recoveredCount = 0;
      jobs.forEach(job => {
        if (job.status === "processing") {
          job.status = "pending";
          job.updatedAt = Date.now();
          localDb.updateRecord("printJobs", job.id, { status: "pending" });
          recoveredCount++;
        }
      });

      if (recoveredCount > 0) {
        logger.info("printer", `Recovered ${recoveredCount} print jobs from crash state.`);
      }

      // Start workers for all active printers
      const printers = printerRepository.getPrinters();
      printers.forEach(pr => {
        if (pr.enabled && !this.pausedPrinters[pr.id]) {
          this.processQueue(pr.id);
        }
      });
    } catch (err: any) {
      logger.error("printer", "Failed in print queue boot recovery", err);
    }
  }

  /**
   * Enqueues a print job
   */
  public async enqueueJob(
    printerId: string,
    type: PrintJob["type"],
    payloadBytes: Uint8Array,
    priority: number = 2
  ): Promise<string> {
    const payloadBase64 = this.base64Encode(payloadBytes);
    const jobHash = this.generateHash(payloadBytes);

    // 1. Idempotency Check (Check history to see if already printed)
    const history: PrintHistoryEntry[] = localDb.getTable("printHistory") || [];
    const duplicate = history.find(h => h.jobHash === jobHash && h.status === "success");
    if (duplicate) {
      logger.warn("printer", `Duplicate print job detected. Hash matching: ${jobHash}. Skipping print execution.`);
      
      // Add skipped history entry
      localDb.insertRecord("printHistory", {
        jobId: `skipped_${Date.now()}`,
        printerId,
        printerName: printerRepository.getPrinter(printerId)?.name || "Unknown",
        type,
        status: "skipped",
        retries: 0,
        jobHash,
        timestamp: Date.now()
      });

      return "skipped";
    }

    // 2. Insert into queue database
    const jobRecord = {
      printerId,
      type,
      priority,
      payload: payloadBase64,
      retries: 0,
      status: "pending" as const,
      jobHash,
      createdAt: Date.now()
    };

    const savedJob = localDb.insertRecord("printJobs", jobRecord) as PrintJob;
    logger.info("printer", `Enqueued print job ${savedJob.id} on printer ${printerId} (Priority: ${priority})`);

    // 3. Trigger worker
    if (!this.pausedPrinters[printerId]) {
      this.processQueue(printerId);
    }

    return savedJob.id;
  }

  /**
   * Active worker loop for a printer queue
   */
  private async processQueue(printerId: string): Promise<void> {
    if (this.processingPrinters[printerId] || this.pausedPrinters[printerId]) return;
    this.processingPrinters[printerId] = true;

    try {
      while (true) {
        if (this.pausedPrinters[printerId]) break;

        const jobs: PrintJob[] = localDb.getTable("printJobs") || [];
        // Filter pending/failed jobs for this printer, sorted by priority (1 is high) and age (oldest first)
        const activeJobs = jobs
          .filter(j => j.printerId === printerId && (j.status === "pending" || j.status === "failed"))
          .sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.createdAt - b.createdAt;
          });

        if (activeJobs.length === 0) {
          eventBus.emit("printer.queue.empty", { printerId });
          break;
        }

        const job = activeJobs[0];
        const success = await this.executeJob(job);
        if (!success) {
          // Pause queue for this printer upon failure
          this.pauseQueue(printerId);
          break;
        }
      }
    } finally {
      this.processingPrinters[printerId] = false;
    }
  }

  private async executeJob(job: PrintJob): Promise<boolean> {
    const printer = printerRepository.getPrinter(job.printerId);
    if (!printer || !printer.enabled) {
      logger.error("printer", `Job execution failed: Printer ${job.printerId} not found or disabled.`);
      this.updateJobStatus(job.id, "failed", "Printer not configured or disabled");
      return false;
    }

    this.updateJobStatus(job.id, "processing");
    eventBus.emit("printer.job.started", { jobId: job.id, printerId: job.printerId });
    const startTime = Date.now();

    try {
      const payloadBytes = this.base64Decode(job.payload);
      const driver = driverManager.getDriver(printer);
      const res = await driver.send(payloadBytes);

      if (res.success) {
        const printTime = Date.now() - startTime;
        this.updateJobStatus(job.id, "printed");
        
        // Remove from active queue
        localDb.deleteRecord("printJobs", job.id);

        // Record history
        localDb.insertRecord("printHistory", {
          jobId: job.id,
          printerId: job.printerId,
          printerName: printer.name,
          type: job.type,
          status: "success",
          retries: job.retries,
          jobHash: job.jobHash,
          timestamp: Date.now(),
          printTimeMs: printTime
        });

        // Update stats
        this.updateUptimeStats(job.printerId, true);

        eventBus.emit("printer.job.completed", {
          jobId: job.id,
          printerId: job.printerId,
          printTimeMs: printTime
        });
        
        // Log event
        this.logEvent(job.printerId, "info", "Queue Finished", `Job ${job.id} printed successfully in ${printTime}ms.`);
        return true;
      } else {
        throw new Error(res.error || "Driver send failed");
      }
    } catch (err: any) {
      const errorMsg = err.message || "Unknown printing error";
      const retries = job.retries + 1;
      this.updateUptimeStats(job.printerId, false);
      this.logEvent(job.printerId, "warn", "Retry", `Job ${job.id} failed (Attempt ${retries}): ${errorMsg}`);

      if (retries <= 3) {
        localDb.updateRecord("printJobs", job.id, { retries, status: "failed" });
        // Retry delay
        await new Promise(r => setTimeout(r, 1000));
        return this.executeJob({ ...job, retries, status: "failed" });
      }

      // Check for backup printer failover routing
      if (printer.backupPrinterId) {
        logger.warn("printer", `Printer ${printer.name} failed. Routing job ${job.id} to backup: ${printer.backupPrinterId}`);
        this.logEvent(job.printerId, "warn", "Failover Triggered", `Rerouting print job to backup printer ${printer.backupPrinterId}`);
        
        // Create duplicate job on backup printer
        localDb.deleteRecord("printJobs", job.id);
        await this.enqueueJob(printer.backupPrinterId, job.type, this.base64Decode(job.payload), job.priority);
        return true; // Return true as the queue has dealt with the job
      }

      // No failover backup: Mark job failed and log
      this.updateJobStatus(job.id, "failed", errorMsg);
      eventBus.emit("printer.job.failed", { jobId: job.id, printerId: job.printerId, error: errorMsg });
      this.logEvent(job.printerId, "error", "Driver Error", `Job ${job.id} aborted: ${errorMsg}`);
      return false;
    }
  }

  // --- Queue Actions ---

  public pauseQueue(printerId: string): void {
    this.pausedPrinters[printerId] = true;
    eventBus.emit("printer.queue.paused", { printerId });
    this.logEvent(printerId, "warn", "Queue Finished", "Print queue paused due to connectivity issues.");
  }

  public resumeQueue(printerId: string): void {
    if (!this.pausedPrinters[printerId]) return;
    this.pausedPrinters[printerId] = false;
    eventBus.emit("printer.queue.resumed", { printerId });
    this.logEvent(printerId, "info", "Queue Started", "Resuming print queue.");
    this.processQueue(printerId);
  }

  public cancelJob(jobId: string): void {
    const jobs: PrintJob[] = localDb.getTable("printJobs") || [];
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      localDb.deleteRecord("printJobs", jobId);
      logger.warn("printer", `Cancelled print job ${jobId} in queue.`);
      
      // Record aborted history
      localDb.insertRecord("printHistory", {
        jobId,
        printerId: job.printerId,
        printerName: printerRepository.getPrinter(job.printerId)?.name || "Unknown",
        type: job.type,
        status: "failed",
        retries: job.retries,
        jobHash: job.jobHash,
        timestamp: Date.now(),
        error: "Cancelled by manager"
      });
    }
  }

  // --- Helpers ---

  private updateJobStatus(id: string, status: PrintJob["status"], error?: string) {
    localDb.updateRecord("printJobs", id, { status, error, updatedAt: Date.now() });
  }

  private updateUptimeStats(printerId: string, isSuccess: boolean) {
    const pr = printerRepository.getPrinter(printerId);
    if (!pr) return;
    const stats = pr.uptimeStats || { totalJobs: 0, failedJobs: 0, uptimePercentage: 100 };
    stats.totalJobs += 1;
    if (!isSuccess) stats.failedJobs += 1;
    stats.uptimePercentage = Math.round(
      ((stats.totalJobs - stats.failedJobs) / stats.totalJobs) * 100
    );
    printerRepository.savePrinter({ ...pr, uptimeStats: stats });
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

  private base64Encode(bytes: Uint8Array): string {
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64Decode(base64: string): Uint8Array {
    const binaryStr = window.atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }
}

export const printerQueue = new PrinterQueue();
export default printerQueue;
