import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { deviceManager, HardwareDevice } from "@/modules/desktop/DeviceManager";
import { crashReporter } from "@/modules/desktop/CrashReporter";
import dbService from "@/core/database/DatabaseService";
import { 
  Cpu, RefreshCw, Smartphone, Laptop, AlertOctagon, HelpCircle 
} from "lucide-react";
import logger from "@/services/logger/Logger";

export const Route = createFileRoute("/admin/devices")({
  component: DevicesPage,
});

function DevicesPage() {
  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [diagnosticLog, setDiagnosticLog] = useState("");

  const loadDevices = async () => {
    setLoading(true);
    try {
      const list = await deviceManager.getConnectedDevices();
      setDevices(list);

      const db = dbService.getAdapter();
      const prns = await db.query("SELECT * FROM printers");
      setPrinters(prns);
    } catch (err) {
      logger.error("devices", "Failed querying hardware heartbeats list", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleReconnect = async (id: string) => {
    const success = await deviceManager.reconnectDevice(id);
    if (success) {
      alert("Device reconnected successfully.");
      await loadDevices();
    }
  };

  const handleTest = async (id: string) => {
    const online = await deviceManager.testDevice(id);
    if (online) {
      alert("Hardware heartbeat test signal returned OK.");
    } else {
      alert("Device connection failed. Please trigger reconnect.");
    }
  };

  const handleExportLogs = async () => {
    const report = await crashReporter.exportDiagnostics();
    setDiagnosticLog(report);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6 animate-fade-in text-brown-deep">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-brown-deep flex items-center gap-2">
            <Cpu className="h-6 w-6 text-gold" />
            Device Diagnostics Center
          </h2>
          <p className="text-xs text-muted-foreground">Monitor real-time heartbeats and network latency for physical restaurant hardware.</p>
        </div>
        <button
          onClick={loadDevices}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold/15 text-brown-deep text-xs font-bold rounded-lg border hover:bg-gold/20"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-bold text-sm">Active Hardware Registry</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {devices.map(d => (
              <div key={d.id} className="p-4 bg-card/65 border border-border/50 rounded-2xl flex flex-col justify-between space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-brown-deep text-xs">{d.name}</h4>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">{d.type}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                    d.status === "online" ? "bg-green-50 text-green-700 border" : "bg-destructive/10 text-destructive border"
                  }`}>
                    {d.status}
                  </span>
                </div>
                <div className="border-t border-border/20 pt-2 text-[10px] text-muted-foreground space-y-1">
                  <div>Driver Version: <span className="font-mono">{d.driverVersion}</span></div>
                  {d.status === "online" && <div>Latency: <span className="font-bold text-gold">{d.latency} ms</span></div>}
                </div>
                <div className="flex gap-2 text-[10px] pt-1">
                  <button
                    onClick={() => handleReconnect(d.id)}
                    className="flex-1 py-1 bg-muted hover:bg-muted/80 font-bold border rounded-lg"
                  >
                    Reconnect
                  </button>
                  <button
                    onClick={() => handleTest(d.id)}
                    className="flex-1 py-1 bg-brown-deep text-gold font-bold rounded-lg"
                  >
                    Test Ping
                  </button>
                </div>
              </div>
            ))}
            {devices.length === 0 && (
              <div className="col-span-2 text-center py-6 bg-card/40 border border-dashed rounded-2xl text-muted-foreground text-[11px] font-medium">
                No external POS peripherals detected. Configured network routes are listed below.
              </div>
            )}
          </div>

          {/* Configured printers section */}
          {printers.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-bold text-sm">Configured Dual Routing Printers</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {printers.map(p => (
                  <div key={p.id} className="p-4 bg-card/65 border border-border/50 rounded-2xl flex flex-col justify-between space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-brown-deep text-xs">{p.name}</h4>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground">{p.printerType} ({p.connectionType})</span>
                      </div>
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded uppercase bg-green-50 text-green-700 border">
                        {p.status}
                      </span>
                    </div>
                    <div className="border-t border-border/20 pt-2 text-[10px] text-muted-foreground space-y-1">
                      {p.ipAddress && <div>IP: <span className="font-mono">{p.ipAddress}:{p.port}</span></div>}
                      {p.usbDevice && <div>USB Dev: <span className="font-mono">{p.usbDevice}</span></div>}
                      <div>Paper Width: <span className="font-bold">{p.paperWidth}mm</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-1 space-y-4">
          <h3 className="font-bold text-sm">System Diagnostics Exporter</h3>
          <div className="bg-card/65 border p-4 rounded-2xl space-y-3 flex flex-col">
            <p className="text-[10px] text-muted-foreground">Export crash logs, SQLite database locks, and printer queue diagnostics information.</p>
            <button
              onClick={handleExportLogs}
              className="py-2 bg-brown-deep text-gold font-bold rounded-xl text-xs uppercase"
            >
              Export Local Logs
            </button>
            {diagnosticLog && (
              <pre className="p-3 bg-muted font-mono text-[9px] max-h-48 overflow-y-auto border rounded-xl mt-2 select-all">
                {diagnosticLog}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
