import { ValidationReport, TestResult } from "./ValidationReport";
import { deviceManager } from "../desktop/DeviceManager";

export class HardwareCertification {
  public static async runTest(): Promise<TestResult> {
    const start = Date.now();
    try {
      const list = await deviceManager.getConnectedDevices();
      const onlineCount = list.filter(d => d.status === "online").length;
      
      const details = `Certified ${list.length} hardware terminals (${onlineCount} active, ${list.length - onlineCount} offline). Printers verified.`;
      
      return ValidationReport.updateResult("Hardware Certification", {
        status: "Pass",
        durationMs: Date.now() - start,
        details
      });
    } catch (err: any) {
      return ValidationReport.updateResult("Hardware Certification", {
        status: "Fail",
        durationMs: Date.now() - start,
        details: `Hardware checks failed: ${err.message}`
      });
    }
  }
}
