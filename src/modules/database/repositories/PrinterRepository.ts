import { BaseRepository } from "./BaseRepository";
import { PrinterConfig, CategoryPrinterMap, DiscoveryCacheEntry } from "@/modules/printer/types/types";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";

export class PrinterRepository extends BaseRepository {
  /**
   * Fetch all configured printers. Seeds defaults if table is empty.
   */
  public async getPrinters(): Promise<PrinterConfig[]> {
    const rows = await this.db.query("SELECT * FROM printers");
    if (rows.length === 0) {
      return this.seedDefaults();
    }
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type as any,
      ip: r.ip || undefined,
      port: r.port || undefined,
      role: r.role as any,
      enabled: r.enabled === 1,
      status: r.status as any,
      latencyMs: r.latencyMs || undefined,
      profile: JSON.parse(r.profile),
      uptimeStats: r.uptimeStats ? JSON.parse(r.uptimeStats) : undefined
    }));
  }

  private async seedDefaults(): Promise<PrinterConfig[]> {
    const defaults: PrinterConfig[] = [
      {
        id: "billing_printer_default",
        name: "Main Billing Printer",
        type: "mock",
        role: "billing",
        enabled: true,
        status: "online",
        profile: {
          paperWidth: "80mm",
          charactersPerLine: 48,
          font: "A",
          density: 8,
          cutType: "full",
          logoEnabled: false,
          marginTop: 0,
          marginBottom: 0,
          capabilities: {
            supportsQR: true,
            supportsImage: true,
            supportsBarcode: true,
            supportsCut: true,
            supportsCashDrawer: true
          }
        },
        uptimeStats: { totalJobs: 0, failedJobs: 0, uptimePercentage: 100 }
      },
      {
        id: "kitchen_printer_default",
        name: "Kitchen KOT Printer",
        type: "lan",
        ip: "192.168.1.150",
        port: 9100,
        role: "kitchen",
        enabled: true,
        status: "offline",
        profile: {
          paperWidth: "80mm",
          charactersPerLine: 48,
          font: "A",
          density: 8,
          cutType: "full",
          logoEnabled: false,
          marginTop: 0,
          marginBottom: 0,
          capabilities: {
            supportsQR: false,
            supportsImage: false,
            supportsBarcode: false,
            supportsCut: true,
            supportsCashDrawer: false
          }
        },
        uptimeStats: { totalJobs: 0, failedJobs: 0, uptimePercentage: 100 }
      }
    ];

    for (const pr of defaults) {
      await this.savePrinter(pr);
    }
    return defaults;
  }

  public async getPrinter(id: string): Promise<PrinterConfig | null> {
    const rows = await this.db.query("SELECT * FROM printers WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      type: r.type as any,
      ip: r.ip || undefined,
      port: r.port || undefined,
      role: r.role as any,
      enabled: r.enabled === 1,
      status: r.status as any,
      latencyMs: r.latencyMs || undefined,
      profile: JSON.parse(r.profile),
      uptimeStats: r.uptimeStats ? JSON.parse(r.uptimeStats) : undefined
    };
  }

  public async savePrinter(printer: PrinterConfig): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO printers (
        id, name, type, ip, port, role, enabled, profile, status, latencyMs, uptimeStats, branchId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        printer.id,
        printer.name,
        printer.type,
        printer.ip || null,
        printer.port || null,
        printer.role,
        printer.enabled ? 1 : 0,
        JSON.stringify(printer.profile),
        printer.status,
        printer.latencyMs || null,
        printer.uptimeStats ? JSON.stringify(printer.uptimeStats) : null,
        "MAIN_BRANCH"
      ]
    );

    // Emit event
    dbEventBus.emit("printer.updated", printer);
  }

  public async deletePrinter(id: string): Promise<boolean> {
    const res = await this.db.execute("DELETE FROM printers WHERE id = ?", [id]);
    dbEventBus.emit("printer.deleted", { id });
    return res.changes > 0;
  }

  /**
   * Category printer mappings.
   */
  public async getCategoryMappings(): Promise<Record<string, string[]>> {
    const rows = await this.db.query("SELECT value FROM settings WHERE key = 'printerSettings'");
    if (rows.length === 0) return {};
    try {
      return JSON.parse(rows[0].value);
    } catch {
      return {};
    }
  }

  public async saveCategoryMappings(mappings: Record<string, string[]>): Promise<void> {
    await this.db.execute(
      "INSERT OR REPLACE INTO settings (key, value, branchId) VALUES (?, ?, ?)",
      ["printerSettings", JSON.stringify(mappings), "MAIN_BRANCH"]
    );
  }

  /**
   * Network discovery cache tables.
   */
  public async getDiscoveryCache(): Promise<DiscoveryCacheEntry[]> {
    const rows = await this.db.query("SELECT * FROM discoveryCache");
    return rows.map(r => ({
      ip: r.ip,
      port: r.port,
      hostname: r.hostname || undefined,
      lastSeen: r.lastSeen,
      status: r.status as any,
      latencyMs: r.latencyMs || undefined
    }));
  }

  public async saveDiscoveryCache(entries: DiscoveryCacheEntry[]): Promise<void> {
    await this.db.execute("DELETE FROM discoveryCache");
    for (const e of entries) {
      await this.db.execute(
        "INSERT INTO discoveryCache (ip, port, hostname, lastSeen, status, latencyMs) VALUES (?, ?, ?, ?, ?, ?)",
        [e.ip, e.port, e.hostname || null, e.lastSeen, e.status, e.latencyMs || null]
      );
    }
  }

  public async updateDiscoveryEntry(ip: string, updates: Partial<DiscoveryCacheEntry>): Promise<void> {
    const now = Date.now();
    const rows = await this.db.query("SELECT * FROM discoveryCache WHERE ip = ?", [ip]);
    if (rows.length > 0) {
      await this.db.execute(
        "UPDATE discoveryCache SET port = ?, hostname = ?, lastSeen = ?, status = ?, latencyMs = ? WHERE ip = ?",
        [
          updates.port || rows[0].port,
          updates.hostname || rows[0].hostname || null,
          now,
          updates.status || rows[0].status,
          updates.latencyMs !== undefined ? updates.latencyMs : rows[0].latencyMs || null,
          ip
        ]
      );
    } else {
      await this.db.execute(
        "INSERT INTO discoveryCache (ip, port, hostname, lastSeen, status, latencyMs) VALUES (?, ?, ?, ?, ?, ?)",
        [ip, updates.port || 9100, updates.hostname || null, now, updates.status || "online", updates.latencyMs || null]
      );
    }
  }
}

export const printerRepository = new PrinterRepository();
export default printerRepository;
