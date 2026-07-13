import logger from "@/services/logger/Logger";

export class CrashReporter {
  private localLogs: string[] = [];

  public initialize(): void {
    if (typeof window !== "undefined") {
      window.onerror = (message, source, lineno, colno, error) => {
        const detail = `Error: ${message} at ${source}:${lineno}:${colno}`;
        this.logCrash(detail);
      };

      window.onunhandledrejection = (event) => {
        const detail = `Promise Rejected: ${event.reason}`;
        this.logCrash(detail);
      };
    }
  }

  public logCrash(detail: string): void {
    logger.error("crash", `Renderer Exception: ${detail}`);
    this.localLogs.push(`[${new Date().toISOString()}] ${detail}`);
  }

  public getLogs(): string[] {
    return this.localLogs;
  }

  public async exportDiagnostics(): Promise<string> {
    const header = "PAAKASHALA OS DIAGNOSTICS REPORT\n===============================\n\n";
    const body = this.localLogs.join("\n") || "No crash exceptions recorded.";
    return header + body;
  }
}

export const crashReporter = new CrashReporter();
export default crashReporter;
