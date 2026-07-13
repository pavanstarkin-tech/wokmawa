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
  private devices: HardwareDevice[] = [];

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
