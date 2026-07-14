import localDb from "@/services/database/localDb";
import { PrinterConfig, DiscoveryCacheEntry } from "@/modules/printer/types/types";
import { dbEventBus } from "../../../core/database/DatabaseEventBus";

export class PrinterRepository {
  /**
   * Fetch all configured printers.
   */
  public getPrinters(): PrinterConfig[] {
    const settings = localDb.getSettings() || {};
    const list: PrinterConfig[] = [];

    if (settings.counterPrinter) {
      list.push({
        id: "counter-printer-id",
        name: settings.counterPrinter,
        type: "os" as any,
        role: "billing",
        enabled: true,
        status: "online",
        profile: {
          paperWidth: "80mm",
          charactersPerLine: 48,
          font: "A",
          density: 8,
          cutType: "full",
          logoEnabled: true,
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
      });
    }

    if (settings.kitchenPrinter) {
      list.push({
        id: "kitchen-printer-id",
        name: settings.kitchenPrinter,
        type: "os" as any,
        role: "kitchen",
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
            supportsQR: false,
            supportsImage: false,
            supportsBarcode: false,
            supportsCut: true,
            supportsCashDrawer: false
          }
        },
        uptimeStats: { totalJobs: 0, failedJobs: 0, uptimePercentage: 100 }
      });
    }

    return list;
  }

  private seedDefaults(): PrinterConfig[] {
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

    defaults.forEach(pr => this.savePrinter(pr));
    return defaults;
  }

  public getPrinter(id: string): PrinterConfig | null {
    const list = this.getPrinters();
    return list.find(p => p.id === id) || null;
  }

  public savePrinter(printer: PrinterConfig): void {
    const list = localDb.getTable("printers") || [];
    const exists = list.some(p => p.id === printer.id);
    if (exists) {
      localDb.updateRecord("printers", printer.id, printer);
    } else {
      localDb.insertRecord("printers", printer);
    }
    dbEventBus.emit("printer.updated", printer);
  }

  public deletePrinter(id: string): boolean {
    const deleted = localDb.deleteRecord("printers", id);
    if (deleted) {
      dbEventBus.emit("printer.deleted", { id });
    }
    return deleted;
  }

  /**
   * Category printer mappings.
   */
  public getCategoryMappings(): Record<string, string[]> {
    const settings = localDb.getSettings();
    return settings.printerSettings || {};
  }

  public saveCategoryMappings(mappings: Record<string, string[]>): void {
    localDb.updateSettings({ printerSettings: mappings });
  }

  /**
   * Network discovery cache tables.
   */
  public getDiscoveryCache(): DiscoveryCacheEntry[] {
    return localDb.getTable("discoveryCache") || [];
  }

  public saveDiscoveryCache(entries: DiscoveryCacheEntry[]): void {
    localDb.setTable("discoveryCache", entries);
  }

  public updateDiscoveryEntry(ip: string, updates: Partial<DiscoveryCacheEntry>): void {
    const cache = this.getDiscoveryCache();
    const entry = cache.find(e => e.ip === ip);
    const now = Date.now();

    if (entry) {
      localDb.updateRecord("discoveryCache", ip, { ...updates, lastSeen: now });
    } else {
      localDb.insertRecord("discoveryCache", {
        ip,
        port: updates.port || 9100,
        hostname: updates.hostname || null,
        lastSeen: now,
        status: updates.status || "online",
        latencyMs: updates.latencyMs || null
      });
    }
  }
}

export const printerRepository = new PrinterRepository();
export default printerRepository;
