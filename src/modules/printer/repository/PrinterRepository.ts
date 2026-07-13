import localDb from "@/services/database/localDb";
import logger from "@/services/logger/Logger";
import { PrinterConfig, CategoryPrinterMap, DiscoveryCacheEntry } from "../types/types";

class PrinterRepository {
  /**
   * Fetch all configured printers. Seeds defaults if table is empty.
   */
  public getPrinters(): PrinterConfig[] {
    try {
      let printers = localDb.getTable("printers") || [];
      if (printers.length === 0) {
        printers = this.seedDefaults();
      }
      return printers;
    } catch (err: any) {
      logger.error("database", "Failed retrieving printers from repository", err);
      return [];
    }
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
    localDb.setTable("printers", defaults);
    return defaults;
  }

  public getPrinter(id: string): PrinterConfig | undefined {
    return this.getPrinters().find(p => p.id === id);
  }

  public savePrinter(printer: PrinterConfig): void {
    const printers = this.getPrinters();
    const existingIdx = printers.findIndex(p => p.id === printer.id);
    
    if (existingIdx > -1) {
      localDb.updateRecord("printers", printer.id, printer);
    } else {
      localDb.insertRecord("printers", printer);
    }
    logger.info("database", `Saved printer config: ${printer.name} (${printer.id})`);
  }

  public deletePrinter(id: string): boolean {
    const res = localDb.deleteRecord("printers", id);
    logger.warn("database", `Removed printer config: ${id}`);
    return res;
  }

  /**
   * Category printer mappings. Each category maps to string[] of printerIds.
   */
  public getCategoryMappings(): Record<string, string[]> {
    const settings = localDb.getSettings();
    return settings.printerSettings || {};
  }

  public saveCategoryMappings(mappings: Record<string, string[]>): void {
    localDb.updateSettings({ printerSettings: mappings });
    logger.info("database", "Updated printer category routing mappings", mappings);
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
    const idx = cache.findIndex(c => c.ip === ip);
    if (idx > -1) {
      cache[idx] = { ...cache[idx], ...updates, lastSeen: Date.now() };
      this.saveDiscoveryCache(cache);
    } else {
      const newEntry: DiscoveryCacheEntry = {
        ip,
        port: updates.port || 9100,
        lastSeen: Date.now(),
        status: "online",
        ...updates
      };
      cache.push(newEntry);
      this.saveDiscoveryCache(cache);
    }
  }
}

export const printerRepository = new PrinterRepository();
export default printerRepository;
