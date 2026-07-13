import dbService from "../../core/database/DatabaseService";
import logger from "@/services/logger/Logger";

export interface PrintRequest {
  jobType: "receipt" | "kot" | "kot_update" | "kot_cancel" | "report";
  entityId: string;
  entityType: string;
  categoryId?: string;
}

export class PrinterDispatcher {
  private get db() {
    return dbService.getAdapter();
  }

  public async dispatchJob(req: PrintRequest): Promise<string> {
    const jobId = `job_${Date.now()}`;
    logger.info("printer", `Dispatching print job: ${req.jobType} for entity ${req.entityId}`);

    try {
      // 1. Determine destination printer based on type
      let printerType = "counter";
      if (req.jobType.startsWith("kot")) {
        printerType = "kitchen";
      }

      const printers = await this.db.query(
        "SELECT id FROM printers WHERE printerType = ? LIMIT 1",
        [printerType]
      );

      const printerId = printers.length > 0 ? printers[0].id : `mock_${printerType}_printer`;

      // 2. Insert into print_jobs queue table
      await this.db.execute(
        `INSERT INTO print_jobs (id, printerId, jobType, entityType, entityId, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [jobId, printerId, req.jobType, req.entityType, req.entityId, "pending", Date.now()]
      );

      // 3. Trigger mock print completion
      await this.db.execute(
        "UPDATE print_jobs SET status = 'completed', completedAt = ? WHERE id = ?",
        [Date.now(), jobId]
      );

      // 4. Log print history log
      const histId = `hist_${Date.now()}`;
      await this.db.execute(
        `INSERT INTO print_history (id, jobId, printerId, result, duration, printedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [histId, jobId, printerId, "success", 45, Date.now()]
      );

      return jobId;
    } catch (err: any) {
      logger.error("printer", "Failed dispatching job print queues", err);
      throw err;
    }
  }
}

export const printerDispatcher = new PrinterDispatcher();
export default printerDispatcher;
