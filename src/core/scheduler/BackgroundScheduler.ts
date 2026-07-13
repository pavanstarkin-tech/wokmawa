import { databaseBackup } from "../database/DatabaseBackup";
import { databaseHealth } from "../database/DatabaseHealth";
import { syncEngine } from "../sync/SyncEngine";
import { printerMonitor } from "@/modules/printer/services/PrinterMonitor";
import logger from "@/services/logger/Logger";

export class BackgroundScheduler {
  private active = false;
  private schedulerInterval: any = null;
  private lastBackupTime = 0;
  private lastHealthCheckTime = 0;

  public start() {
    if (this.active) return;
    this.active = true;
    logger.info("system", "Starting Background Scheduler service...");

    // Main loop running every 10 seconds to coordinate tasks
    this.schedulerInterval = setInterval(() => {
      this.tick();
    }, 10000);

    // Initial check
    this.tick();
  }

  public stop() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      this.active = false;
      logger.info("system", "Stopped Background Scheduler service.");
    }
  }

  private async tick() {
    const now = Date.now();

    // 1. Run database backups every 24 hours (simulated check)
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (now - this.lastBackupTime > twentyFourHours) {
      this.lastBackupTime = now;
      logger.info("system", "Scheduler: Running automated nightly database backup...");
      databaseBackup.createBackup().catch(err => {
        logger.error("system", "Scheduled backup failed", err);
      });
    }

    // 2. Run Database Health integrity audits every 6 hours
    const sixHours = 6 * 60 * 60 * 1000;
    if (now - this.lastHealthCheckTime > sixHours) {
      this.lastHealthCheckTime = now;
      logger.info("system", "Scheduler: Running database integrity check...");
      databaseHealth.getHealthReport().then(report => {
        if (!report.healthy) {
          logger.error("system", "Scheduled database health check reported issues!", report);
        }
      }).catch(err => {
        logger.error("system", "Scheduled health check failed", err);
      });
    }

    // 3. Fallback sync trigger
    syncEngine.triggerSync().catch(() => {});

    // 4. Fallback printer health checks pinger
    printerMonitor.checkAllPrinters().catch(() => {});
  }
}

export const backgroundScheduler = new BackgroundScheduler();
export default backgroundScheduler;
