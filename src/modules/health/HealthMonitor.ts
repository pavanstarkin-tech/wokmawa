export interface SystemMetric {
  name: string;
  value: string;
  status: "green" | "yellow" | "red";
}

export class HealthMonitor {
  public async diagnoseSystem(): Promise<SystemMetric[]> {
    // Generate mock diagnostics statuses
    return [
      { name: "Printers Status", value: "Online (KOT + Bills)", status: "green" },
      { name: "Internet Connection", value: "LAN connected, Latency 14ms", status: "green" },
      { name: "Firebase Realtime DB", value: "Synced", status: "green" },
      { name: "SQLite Size", value: "48.2 MB", status: "green" },
      { name: "Sync Queue", value: "0 pending updates", status: "green" },
      { name: "KDS Screen Connectivity", value: "Online (Kitchen Terminal)", status: "green" }
    ];
  }
}

export const healthMonitor = new HealthMonitor();
export default healthMonitor;
