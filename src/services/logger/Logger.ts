import { ref, push, set } from "firebase/database";
import { db } from "@/lib/firebase";
import eventBus from "../event-bus/eventBus";

export interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error";
  category: "printer" | "payment" | "firebase" | "pos" | "database" | "general";
  message: string;
  metadata?: any;
}

class Logger {
  private localLogs: LogEntry[] = [];
  private maxLocalLogs = 1000;

  private saveLocal(entry: LogEntry) {
    this.localLogs.push(entry);
    if (this.localLogs.length > this.maxLocalLogs) {
      this.localLogs.shift();
    }
    
    // Save to local storage for persistent diagnostics
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("paakashala_diagnostic_logs", JSON.stringify(this.localLogs));
      }
    } catch (e) {
      console.warn("Failed to write diagnostic logs to LocalStorage", e);
    }
  }

  public async log(
    level: "info" | "warn" | "error",
    category: LogEntry["category"],
    message: string,
    metadata?: any
  ) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      metadata: metadata || null,
    };

    // Print to developer console
    const color = level === "error" ? "red" : level === "warn" ? "orange" : "green";
    console.log(
      `%c[${category.toUpperCase()}] [${level.toUpperCase()}] ${message}`, 
      `color: ${color}; font-weight: bold;`, 
      metadata || ""
    );

    // Save to memory cache
    this.saveLocal(entry);

    // Emit event for UI logs listener
    eventBus.emit("log.added", { level, message: `[${category}] ${message}` });

    // Sync errors and warnings to Firebase
    if (level === "error" || level === "warn") {
      try {
        const logRef = ref(db, "restaurant/logs");
        const newLogRef = push(logRef);
        await set(newLogRef, {
          ...entry,
          branchId: typeof window !== "undefined" ? window.localStorage.getItem("paakashala_branch_id") || "MAIN_BRANCH" : "MAIN_BRANCH"
        });
      } catch (err) {
        // Silently capture firebase writing errors
        console.warn("Failed to upload diagnostic log to Firebase:", err);
      }
    }
  }

  public info(category: LogEntry["category"], message: string, metadata?: any) {
    this.log("info", category, message, metadata);
  }

  public warn(category: LogEntry["category"], message: string, metadata?: any) {
    this.log("warn", category, message, metadata);
  }

  public error(category: LogEntry["category"], message: string, metadata?: any) {
    this.log("error", category, message, metadata);
  }

  public getLogs(): LogEntry[] {
    if (this.localLogs.length === 0 && typeof window !== "undefined") {
      try {
        const cached = window.localStorage.getItem("paakashala_diagnostic_logs");
        if (cached) {
          this.localLogs = JSON.parse(cached);
        }
      } catch {
        this.localLogs = [];
      }
    }
    return this.localLogs;
  }
}

export const logger = new Logger();
export default logger;
