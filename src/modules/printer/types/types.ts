export type ConnectionType = "lan" | "usb" | "bluetooth" | "mock";
export type PrinterRole = "billing" | "kitchen" | "bar";
export type PaperWidth = "58mm" | "80mm";

export interface PrinterCapabilities {
  supportsQR: boolean;
  supportsImage: boolean;
  supportsBarcode: boolean;
  supportsCut: boolean;
  supportsCashDrawer: boolean;
}

export interface PrinterProfile {
  paperWidth: PaperWidth;
  charactersPerLine: number; // e.g. 32 or 48
  font: "A" | "B";
  density: number; // 0-8
  cutType: "full" | "partial" | "none";
  logoEnabled: boolean;
  logoPath?: string; // Absolute path to unique logo image file
  marginTop: number;
  marginBottom: number;
  capabilities: PrinterCapabilities;
}

export interface PrinterConfig {
  id: string;
  name: string;
  type: ConnectionType;
  ip?: string;
  port?: number;
  role: PrinterRole;
  profile: PrinterProfile;
  enabled: boolean;
  backupPrinterId?: string; // Failover printer reference
  status: "online" | "offline" | "connecting";
  latencyMs?: number;
  uptimeStats?: {
    totalJobs: number;
    failedJobs: number;
    uptimePercentage: number;
  };
}

export interface PrintJob {
  id: string;
  printerId: string;
  type: "receipt" | "kot" | "duplicate" | "refund" | "closing" | "gst" | "expense" | "test";
  priority: number; // Priority 1 (Billing) to 4 (Diagnostics)
  payload: string; // Base64 encoded EscPos commands payload
  retries: number;
  status: "pending" | "processing" | "printed" | "failed" | "archived";
  error?: string;
  jobHash: string; // Payload checksum hash to prevent duplicates
  createdAt: number;
  updatedAt?: number;
}

export interface PrintHistoryEntry {
  id: string;
  jobId: string;
  printerId: string;
  printerName: string;
  type: string;
  status: "success" | "failed" | "skipped";
  retries: number;
  jobHash: string;
  timestamp: number;
  printTimeMs?: number;
  error?: string;
}

export interface PrinterLogEntry {
  id: string;
  timestamp: number;
  printerId: string;
  level: "info" | "warn" | "error";
  event: "Connected" | "Disconnected" | "Queue Started" | "Queue Finished" | "Retry" | "Timeout" | "Paper Width Changed" | "Test Printed" | "Driver Error" | "Failover Triggered";
  message: string;
}

export interface DiscoveryCacheEntry {
  ip: string;
  port: number;
  macAddress?: string;
  hostname?: string;
  lastSeen: number;
  latencyMs?: number;
  status: "online" | "offline";
}

export interface CategoryPrinterMap {
  category: string;
  printerIds: string[]; // Supports multiple target printers
}
