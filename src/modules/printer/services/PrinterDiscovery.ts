import logger from "@/services/logger/Logger";
import { printerRepository } from "../repository/PrinterRepository";
import { DiscoveryCacheEntry } from "../types/types";

class PrinterDiscovery {
  private scanning = false;

  public isScanning(): boolean {
    return this.scanning;
  }

  /**
   * Sweeps the active subnet prefix for open raw socket ports (9100, 9101, 515).
   * Updates the local discovery cache.
   */
  public async scanSubnet(subnetPrefix?: string): Promise<DiscoveryCacheEntry[]> {
    if (this.scanning) {
      logger.warn("printer", "LAN scan already in progress. Skipping duplicate scan request.");
      return printerRepository.getDiscoveryCache();
    }

    this.scanning = true;
    logger.info("printer", `Starting LAN subnet scanning: ${subnetPrefix || "auto-detected"}`);

    const printerAPI = (window as any).printerAPI;
    let foundDevices: Array<{ ip: string; port: number }> = [];

    try {
      if (printerAPI && typeof printerAPI.scanLAN === "function") {
        // Retrieve prefix if none is passed
        let prefix = subnetPrefix;
        if (!prefix && typeof printerAPI.getActiveSubnet === "function") {
          prefix = await printerAPI.getActiveSubnet();
        }
        prefix = prefix || "192.168.1";

        foundDevices = await printerAPI.scanLAN(prefix);
      } else {
        // Browser development mock discovery simulation
        logger.warn("printer", "Running LAN discovery inside browser environment. Simulating scan endpoints.");
        await new Promise(r => setTimeout(r, 1000));
        foundDevices = [
          { ip: "192.168.1.150", port: 9100 },
          { ip: "192.168.1.200", port: 9101 }
        ];
      }

      // Update discovery cache entries
      const now = Date.now();
      const currentCache = printerRepository.getDiscoveryCache();
      
      // Mark existing cached devices as offline first, then refresh active ones
      const updatedCache: DiscoveryCacheEntry[] = currentCache.map(c => ({
        ...c,
        status: "offline"
      }));

      foundDevices.forEach(dev => {
        const idx = updatedCache.findIndex(c => c.ip === dev.ip && c.port === dev.port);
        if (idx > -1) {
          updatedCache[idx] = {
            ...updatedCache[idx],
            lastSeen: now,
            status: "online"
          };
        } else {
          updatedCache.push({
            ip: dev.ip,
            port: dev.port,
            lastSeen: now,
            status: "online",
            hostname: `Discovered ESC/POS Device`
          });
        }
      });

      printerRepository.saveDiscoveryCache(updatedCache);
      logger.info("printer", `LAN scan completed. Discovered ${foundDevices.length} print endpoints.`);
      return updatedCache.filter(c => c.status === "online");
    } catch (err: any) {
      logger.error("printer", "Subnet scanning execution failed", err);
      return [];
    } finally {
      this.scanning = false;
    }
  }

  /**
   * Pings only the cached and configured printers first.
   * Avoids running full 254 IP network scans if current printers respond.
   */
  public async verifyConfiguredPrinters(): Promise<boolean> {
    logger.info("printer", "Verifying active configured printer endpoints first...");
    const printers = printerRepository.getPrinters();
    const printerAPI = (window as any).printerAPI;

    if (!printerAPI) return true;

    let allHealthy = true;
    for (const pr of printers) {
      if (pr.enabled && pr.type === "lan" && pr.ip) {
        try {
          const checkCmd = new Uint8Array([0x1b, 0x40]);
          const res = await printerAPI.printNetwork(pr.ip, pr.port || 9100, checkCmd);
          if (!res.success) {
            allHealthy = false;
          }
        } catch {
          allHealthy = false;
        }
      }
    }
    return allHealthy;
  }
}

export const printerDiscovery = new PrinterDiscovery();
export default printerDiscovery;
