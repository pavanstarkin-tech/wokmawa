import { PrinterConfig } from "../types/types";
import { PrinterDriver } from "./PrinterDriver";
import { NetworkPrinter } from "./NetworkPrinter";
import { USBPrinter } from "./USBPrinter";
import { BluetoothPrinter } from "./BluetoothPrinter";
import { MockPrinter } from "./MockPrinter";
import { OSPrinter } from "./OSPrinter";

class DriverManager {
  private driverCache: Record<string, { driver: PrinterDriver; ip?: string; port?: number; type: string }> = {};

  /**
   * Retrieves or instantiates the appropriate printer driver.
   * If configuration changes (e.g. IP or Port), the driver is re-created.
   */
  public getDriver(config: PrinterConfig): PrinterDriver {
    const cached = this.driverCache[config.id];
    
    if (
      cached &&
      cached.type === config.type &&
      cached.ip === config.ip &&
      cached.port === config.port
    ) {
      return cached.driver;
    }

    // Otherwise, create a new driver and cache it
    let driver: PrinterDriver;

    switch (config.type) {
      case "os":
        driver = new OSPrinter(config.name, config.name); // Using printer config name as Windows printer name
        break;
      case "lan":
        driver = new NetworkPrinter(config.name, config.ip || "127.0.0.1", config.port || 9100);
        break;
      case "usb":
        driver = new USBPrinter(config.name);
        break;
      case "bluetooth":
        driver = new BluetoothPrinter(config.name);
        break;
      case "mock":
      default:
        driver = new MockPrinter(config.name);
        break;
    }

    this.driverCache[config.id] = {
      driver,
      ip: config.ip,
      port: config.port,
      type: config.type
    };

    return driver;
  }

  /**
   * Invalidates and clears a driver from the cache.
   */
  public clearDriver(printerId: string): void {
    delete this.driverCache[printerId];
  }
}

export const driverManager = new DriverManager();
export default driverManager;
