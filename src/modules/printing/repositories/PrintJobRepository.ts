import dbService from "../../../core/database/DatabaseService";

export interface PrintJob {
  id: string;
  printerId: string;
  jobType: string;
  entityType: string;
  entityId: string;
  copies?: number;
  priority?: number;
  status: "pending" | "completed" | "failed";
  retryCount?: number;
  errorMessage?: string;
}

export class PrintJobRepository {
  private get db() {
    return dbService.getAdapter();
  }

  public async getPendingJobs(): Promise<PrintJob[]> {
    return this.db.query("SELECT * FROM print_jobs WHERE status = 'pending' ORDER BY priority DESC, createdAt ASC");
  }

  public async updateJobStatus(id: string, status: string, error?: string): Promise<void> {
    if (status === "completed") {
      await this.db.execute(
        "UPDATE print_jobs SET status = ?, completedAt = ? WHERE id = ?",
        [status, Date.now(), id]
      );
    } else {
      await this.db.execute(
        "UPDATE print_jobs SET status = ?, errorMessage = ?, retryCount = retryCount + 1 WHERE id = ?",
        [status, error || null, id]
      );
    }
  }
}

export const printJobRepository = new PrintJobRepository();
export default printJobRepository;
