export interface HardwareDevice {
  id: string;
  name: string;
  type: "printer" | "scanner" | "scale" | "display";
  status: "online" | "offline";
  latency: number;
  driverVersion: string;
  lastHeartbeat: number;
}

export class DeviceManager {
  private devices: HardwareDevice[] = [
    { id: "prn-01", name: "Main KOT Printer", type: "printer", status: "online", latency: 5, driverVersion: "1.4.2", lastHeartbeat: Date.now() },
    { id: "prn-02", name: "Billing LAN Printer", type: "printer", status: "online", latency: 12, driverVersion: "1.4.2", lastHeartbeat: Date.now() },
    { id: "scan-01", name: "USB Barcode Reader", type: "scanner", status: "online", latency: 1, driverVersion: "2.0.1", lastHeartbeat: Date.now() },
    { id: "scale-01", name: "Ingreds Weighing Scale", type: "scale", status: "offline", latency: 0, driverVersion: "1.0.0", lastHeartbeat: 0 }
  ];

  public async getConnectedDevices(): Promise<HardwareDevice[]> {
    // Dynamic heartbeat check Simulation
    return this.devices.map(d => {
      if (d.status === "online") {
        return {
          ...d,
          latency: Math.floor(Math.random() * 15) + 1,
          lastHeartbeat: Date.now()
        };
      }
      return d;
    });
  }

  public async testDevice(deviceId: string): Promise<boolean> {
    const dev = this.devices.find(d => d.id === deviceId);
    if (!dev) return false;
    return dev.status === "online";
  }

  public async reconnectDevice(deviceId: string): Promise<boolean> {
    const idx = this.devices.findIndex(d => d.id === deviceId);
    if (idx === -1) return false;
    
    // Simulate reconnect success
    this.devices[idx].status = "online";
    this.devices[idx].lastHeartbeat = Date.now();
    return true;
  }
}

export const deviceManager = new DeviceManager();
export default deviceManager;
