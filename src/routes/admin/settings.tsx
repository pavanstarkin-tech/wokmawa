import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Trash2, Printer, RefreshCw, AlertCircle, Wifi, Cpu, Settings } from "lucide-react";
import printerManager from "@/modules/printer/services/PrinterManager";
import { PrinterConfig, ConnectionType, PaperWidth, PrinterRole } from "@/modules/printer/types";
import logger from "@/services/logger/Logger";

export const Route = createFileRoute("/admin/settings")({
  component: PrintersSettingsPage,
});

function PrintersSettingsPage() {
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState<ConnectionType>("lan");
  const [ip, setIp] = useState("192.168.1.100");
  const [role, setRole] = useState<PrinterRole>("billing");
  const [paperWidth, setPaperWidth] = useState<PaperWidth>("80mm");
  const [autoCut, setAutoCut] = useState(true);

  // LAN scanner states
  const [subnet, setSubnet] = useState("192.168.1");
  const [scanning, setScanning] = useState(false);
  const [foundIps, setFoundIps] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadPrinters();
  }, []);

  const loadPrinters = () => {
    setLoading(true);
    const data = printerManager.getPrinters();
    setPrinters(data);
    setLoading(false);
  };

  const handleAddPrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      printerManager.addPrinter({
        name,
        type,
        ip: type === "lan" ? ip : undefined,
        port: type === "lan" ? 9100 : undefined,
        role,
        paperWidth,
        autoCut,
        branchId: "MAIN_BRANCH"
      });

      setStatusMsg({ type: "success", text: `Printer "${name}" added.` });
      setName("");
      loadPrinters();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Failed adding printer configuration." });
    }
  };

  const handleDeletePrinter = (id: string) => {
    try {
      printerManager.deletePrinter(id);
      setStatusMsg({ type: "success", text: "Printer configuration removed." });
      loadPrinters();
    } catch {
      setStatusMsg({ type: "error", text: "Failed removing printer configuration." });
    }
  };

  const handleTestPrint = async (id: string) => {
    setStatusMsg(null);
    try {
      const res = await printerManager.printTest(id);
      if (res.success) {
        setStatusMsg({ type: "success", text: "Test print job dispatched successfully!" });
      } else {
        setStatusMsg({ type: "error", text: `Test print failed: ${res.error || "Driver error"}` });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Test print error: ${err.message}` });
    }
  };

  const handleLANScan = async () => {
    setScanning(true);
    setFoundIps([]);
    setStatusMsg(null);
    logger.info("printer", `Triggering local network scan on subnet: ${subnet}.x`);

    const printerAPI = (window as any).printerAPI;
    if (printerAPI && typeof printerAPI.scanLAN === "function") {
      try {
        const ips = await printerAPI.scanLAN(subnet);
        setFoundIps(ips);
        setStatusMsg({
          type: "success",
          text: `Scan finished. Found ${ips.length} active printer(s) on network.`
        });
      } catch (err: any) {
        setStatusMsg({ type: "error", text: `Scan error: ${err.message}` });
      }
    } else {
      // Browser Mock scan simulation
      setTimeout(() => {
        const mockIps = [`${subnet}.100`, `${subnet}.200`];
        setFoundIps(mockIps);
        setStatusMsg({
          type: "success",
          text: `[BROWSER SIMULATION] Found ${mockIps.length} active printer(s) on network.`
        });
      }, 1500);
    }
    setScanning(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-brown-deep tracking-tight">Printer Configuration Manager</h1>
        <p className="text-muted-foreground mt-1">Configure and diagnostics receipts and kitchen KOT thermal printers.</p>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl text-sm border font-medium flex items-center gap-2 ${
          statusMsg.type === "success" 
            ? "bg-green-50 border-green-200/50 text-green-700" 
            : "bg-red-50 border-red-200/50 text-red-700"
        }`}>
          <AlertCircle className="h-5 w-5" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: Add Printer Config Form */}
        <div className="bg-card border border-border/60 p-6 rounded-3xl shadow-sm space-y-4">
          <h3 className="text-base font-bold text-brown-deep flex items-center gap-2">
            <Plus className="h-5 w-5 text-gold" /> Add New Printer
          </h3>

          <form onSubmit={handleAddPrinter} className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1.5">Printer Label Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Counter Thermal, Kitchen 1"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 focus:border-gold focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1.5">Connection Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 focus:border-gold"
                >
                  <option value="lan">LAN (Network IP)</option>
                  <option value="usb">USB Port</option>
                  <option value="bluetooth">Bluetooth</option>
                  <option value="mock">Virtual Mock</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1.5">Printer Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 focus:border-gold"
                >
                  <option value="billing">Customer Billing</option>
                  <option value="kitchen">Kitchen KOT</option>
                  <option value="bar">Bar Orders</option>
                </select>
              </div>
            </div>

            {type === "lan" && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1.5">IP Address (Port 9100)</label>
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="e.g. 192.168.1.150"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 focus:border-gold focus:outline-none"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1.5">Paper Roll Width</label>
                <select
                  value={paperWidth}
                  onChange={(e) => setPaperWidth(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 focus:border-gold"
                >
                  <option value="80mm">80mm (Standard)</option>
                  <option value="58mm">58mm (Narrow)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1.5">Options</label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="autoCut"
                    checked={autoCut}
                    onChange={(e) => setAutoCut(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-gold focus:ring-gold"
                  />
                  <label htmlFor="autoCut" className="font-semibold text-brown-deep cursor-pointer">Auto Cut Paper</label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-brown-gradient py-3 text-cream font-bold uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Add Printer Configuration
            </button>
          </form>
        </div>

        {/* CENTER: Printer Lists */}
        <div className="lg:col-span-2 bg-card border border-border/60 p-6 rounded-3xl shadow-sm space-y-4">
          <h3 className="text-base font-bold text-brown-deep flex items-center gap-2">
            <Printer className="h-5 w-5 text-gold" /> Registered Hardware Devices
          </h3>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading printers...</div>
          ) : printers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs">No hardware configurations registered.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs text-left">
                <thead>
                  <tr className="border-b border-border/60 text-[10px] uppercase font-bold text-muted-foreground">
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Connection</th>
                    <th className="pb-3 font-semibold">IP / Port</th>
                    <th className="pb-3 font-semibold">Role</th>
                    <th className="pb-3 font-semibold">Width</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {printers.map((pr) => (
                    <tr key={pr.id} className="group">
                      <td className="py-3.5 font-bold text-brown-deep">{pr.name}</td>
                      <td className="py-3.5">
                        <span className="bg-muted px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold text-muted-foreground border border-border/40">
                          {pr.type}
                        </span>
                      </td>
                      <td className="py-3.5 text-muted-foreground font-semibold">{pr.ip || "N/A"}</td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                          pr.role === "billing" 
                            ? "bg-green-50 border-green-200/50 text-green-700" 
                            : "bg-gold/10 border-gold/20 text-gold"
                        }`}>
                          {pr.role}
                        </span>
                      </td>
                      <td className="py-3.5 text-muted-foreground font-semibold">{pr.paperWidth}</td>
                      <td className="py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleTestPrint(pr.id)}
                          className="bg-cream hover:bg-gold/10 text-brown-deep border border-gold/40 px-3 py-1.5 rounded-lg font-bold hover:text-gold active:scale-95 transition-all cursor-pointer"
                        >
                          Test Print
                        </button>
                        <button
                          onClick={() => handleDeletePrinter(pr.id)}
                          className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-red-500/10 active:scale-95 transition-all"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Scanner LAN Block */}
          <div className="border-t border-border/40 pt-6 space-y-4">
            <h4 className="text-sm font-bold text-brown-deep flex items-center gap-1.5">
              <Cpu className="h-4.5 w-4.5 text-gold" /> Scan Local Subnet for ESC/POS Sockets
            </h4>
            <p className="text-xs text-muted-foreground leading-snug">
              Automatically discovers open thermal printers streaming on TCP Port 9100 within your local network.
            </p>
            
            <div className="flex gap-3 text-xs">
              <input
                type="text"
                value={subnet}
                onChange={(e) => setSubnet(e.target.value)}
                placeholder="Subnet prefix e.g. 192.168.1"
                className="flex-1 max-w-[200px] rounded-xl border border-border bg-background px-3.5 py-2.5 focus:border-gold focus:outline-none"
              />
              <button
                onClick={handleLANScan}
                disabled={scanning}
                className="bg-brown-gradient text-cream px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
                {scanning ? "Scanning Subnet..." : "Scan LAN"}
              </button>
            </div>

            {foundIps.length > 0 && (
              <div className="bg-background border border-border/60 rounded-2xl p-4 space-y-2 animate-in fade-in duration-200">
                <h5 className="text-xs font-bold text-brown-deep">Found IP Endpoints:</h5>
                <ul className="flex flex-wrap gap-2 text-xs">
                  {foundIps.map((ipAddress) => (
                    <li 
                      key={ipAddress} 
                      onClick={() => {
                        setIp(ipAddress);
                        setType("lan");
                        setStatusMsg({ type: "success", text: `Selected scanned IP: ${ipAddress}` });
                      }}
                      className="bg-cream hover:bg-gold/10 border border-gold/40 text-brown-deep px-3 py-1.5 rounded-xl cursor-pointer hover:border-gold transition-colors font-bold flex items-center gap-1"
                    >
                      <Wifi className="h-3.5 w-3.5 text-gold" /> {ipAddress}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default PrintersSettingsPage;
