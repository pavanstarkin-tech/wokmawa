import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Printer, Plus, RefreshCw, AlertCircle, Trash2, Wifi, 
  Settings, Check, Play, Pause, XCircle, FileSpreadsheet, 
  HelpCircle, ShieldAlert, Cpu
} from "lucide-react";
import { printerRepository } from "../../modules/printer/repository/PrinterRepository";
import { printerRepository as sqlitePrinterRepo } from "@/modules/printing/repositories/PrinterRepository";
import dbService from "@/core/database/DatabaseService";
import { printerQueue } from "../../modules/printer/services/PrinterQueue";
import { printerMonitor } from "../../modules/printer/services/PrinterMonitor";
import { printerDiscovery } from "../../modules/printer/services/PrinterDiscovery";
import { PrinterConfig, PrintJob, PrinterLogEntry, CategoryPrinterMap } from "../../modules/printer/types/types";
import { PrinterWizard } from "../../modules/printer/components/PrinterWizard";
import localDb from "@/services/database/localDb";
import logger from "@/services/logger/Logger";
import eventBus from "@/services/event-bus/eventBus";
import { CATEGORIES } from "@/lib/paakashala-menu";

export const Route = createFileRoute("/admin/printers")({
  component: PrinterManagementPage,
});

function PrinterManagementPage() {
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [activeQueue, setActiveQueue] = useState<PrintJob[]>([]);
  const [logs, setLogs] = useState<PrinterLogEntry[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string[]>>({});
  
  // Modals / Wizard states
  const [showWizard, setShowWizard] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSyncingHealth, setIsSyncingHealth] = useState(false);

  useEffect(() => {
    loadData();

    // Subscribe to printer monitoring events for real-time reactivity
    const unsubHealth = eventBus.on("printer.health.changed", () => {
      loadPrintersData();
    });
    const unsubJobCompleted = eventBus.on("printer.job.completed", () => {
      loadQueueData();
    });
    const unsubJobFailed = eventBus.on("printer.job.failed", () => {
      loadQueueData();
      loadLogsData();
    });
    const unsubQueueEmpty = eventBus.on("printer.queue.empty", () => {
      loadQueueData();
    });

    return () => {
      unsubHealth();
      unsubJobCompleted();
      unsubJobFailed();
      unsubQueueEmpty();
    };
  }, []);

  const loadData = () => {
    loadPrintersData();
    loadQueueData();
    loadLogsData();
    loadCategoryMaps();
  };

  const loadPrintersData = () => {
    setPrinters(printerRepository.getPrinters());
  };

  const loadQueueData = () => {
    setActiveQueue(localDb.getTable("printJobs") || []);
  };

  const loadLogsData = () => {
    const fetchedLogs: PrinterLogEntry[] = localDb.getTable("printerLogs") || [];
    // Sort latest first
    const sorted = [...fetchedLogs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);
    setLogs(sorted);
  };

  const loadCategoryMaps = () => {
    setCategoryMap(printerRepository.getCategoryMappings());
  };

  const handleHealthCheckAll = async () => {
    setIsSyncingHealth(true);
    setStatusMsg(null);
    try {
      await printerMonitor.checkAllPrinters(true);
      loadPrintersData();
      setStatusMsg({ type: "success", text: "Printer health status metrics refreshed." });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Health ping diagnostics check failed." });
    } finally {
      setIsSyncingHealth(false);
    }
  };

  const handleDeletePrinter = async (id: string) => {
    setStatusMsg(null);
    try {
      printerRepository.deletePrinter(id);
      loadPrintersData();
      setStatusMsg({ type: "success", text: "Printer configuration removed." });
    } catch (err: any) {
      console.warn("Failed deleting printer config from local storage:", err);
    }

    try {
      await dbService.initialize();
      await sqlitePrinterRepo.deletePrinter(id);
    } catch (err: any) {
      console.warn("SQLite database delete failed (WASM loading or offline):", err.message);
    }
  };

  const handleTogglePrinter = async (config: PrinterConfig) => {
    try {
      printerRepository.savePrinter({
        ...config,
        enabled: !config.enabled
      });
      loadPrintersData();
    } catch (err: any) {
      console.warn("Failed saving printer toggle locally:", err);
    }

    try {
      await dbService.initialize();
      await sqlitePrinterRepo.savePrinter({
        id: config.id,
        name: config.name,
        printerType: config.role === "billing" ? "counter" : "kitchen",
        connectionType: config.type as any,
        ipAddress: config.ip,
        port: config.port,
        usbDevice: (config as any).usbDevice,
        paperWidth: config.profile.paperWidth === "58mm" ? 58 : 80,
        isDefault: !config.enabled ? 1 : 0,
        status: config.status
      });
    } catch (err: any) {
      console.warn("SQLite database toggle sync failed:", err.message);
    }
  };

  const handleSaveWizard = async (config: PrinterConfig) => {
    try {
      printerRepository.savePrinter(config);
      setShowWizard(false);
      loadPrintersData();
      setStatusMsg({ type: "success", text: `Printer "${config.name}" configured and saved.` });
    } catch (err: any) {
      console.warn("Failed saving printer config locally:", err);
    }

    try {
      await dbService.initialize();
      await sqlitePrinterRepo.savePrinter({
        id: config.id,
        name: config.name,
        printerType: config.role === "billing" ? "counter" : "kitchen",
        connectionType: config.type as any,
        ipAddress: config.ip,
        port: config.port,
        usbDevice: (config as any).usbDevice,
        paperWidth: config.profile.paperWidth === "58mm" ? 58 : 80,
        isDefault: config.enabled ? 1 : 0,
        status: config.status
      });
    } catch (err: any) {
      console.warn("SQLite database wizard sync failed:", err.message);
    }
  };

  const handleCategoryPrinterToggle = (category: string, printerId: string) => {
    const currentList = categoryMap[category] || [];
    let newList: string[];

    if (currentList.includes(printerId)) {
      newList = currentList.filter(id => id !== printerId);
    } else {
      newList = [...currentList, printerId];
    }

    const nextMap = { ...categoryMap, [category]: newList };
    setCategoryMap(nextMap);
    printerRepository.saveCategoryMappings(nextMap);
  };

  const handleCancelQueueJob = (jobId: string) => {
    printerQueue.cancelJob(jobId);
    loadQueueData();
    loadLogsData();
  };

  const handleExportDiagnostics = async () => {
    const diagnosticsData = {
      timestamp: Date.now(),
      schemaVersion: 3,
      printers: printerRepository.getPrinters(),
      queue: localDb.getTable("printJobs") || [],
      history: localDb.getTable("printHistory") || [],
      logs: localDb.getTable("printerLogs") || [],
      settings: localDb.getSettings()
    };

    const printerAPI = (window as any).printerAPI;
    if (printerAPI && typeof printerAPI.exportDiagnostics === "function") {
      try {
        const res = await printerAPI.exportDiagnostics(diagnosticsData);
        if (res.success) {
          setStatusMsg({ type: "success", text: `Diagnostics exported successfully to: ${res.filePath}` });
        }
      } catch (err: any) {
        setStatusMsg({ type: "error", text: `Failed exporting diagnostics: ${err.message}` });
      }
    } else {
      // Browser simulated download fallback
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(diagnosticsData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `printer-diagnostics-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setStatusMsg({ type: "success", text: "[BROWSER MOCK] Diagnostics JSON file downloaded successfully." });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-brown-deep tracking-tight">Printer Operations Center</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage print queues, category mappings, discovery pings, and hardware logs.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleHealthCheckAll}
            disabled={isSyncingHealth}
            className="flex items-center gap-1.5 bg-cream border border-gold/40 text-brown-deep hover:text-gold px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncingHealth ? "animate-spin" : ""}`} />
            {isSyncingHealth ? "Checking status..." : "Ping Devices"}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs border font-bold flex items-center gap-2 ${
          statusMsg.type === "success" 
            ? "bg-green-50 border-green-200/50 text-green-700" 
            : "bg-red-50 border-red-200/50 text-red-700"
        }`}>
          <AlertCircle className="h-4.5 w-4.5" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Grid Panels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Printer configs listing (Span 2) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Active Hardware Registry */}
          <div className="bg-card border border-border/60 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-black text-brown-deep flex items-center gap-2">
              <Printer className="h-5 w-5 text-gold" /> Device Dashboard
            </h3>

            {printers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">No active printers configured. Go to Settings &rarr; Printers to configure them.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {printers.map((pr) => {
                  const isOnline = pr.status === "online";
                  const pendingCount = activeQueue.filter(j => j.printerId === pr.id).length;
                  return (
                    <div 
                      key={pr.id} 
                      className="border border-border/60 bg-background rounded-2xl p-5 flex flex-col justify-between min-h-[160px] shadow-sm hover:border-gold/30 transition-all"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-black uppercase text-gold tracking-wider">
                            {pr.role === "billing" ? "Counter Printer" : "Kitchen Printer"}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 border ${
                            isOnline 
                              ? "bg-green-50 border-green-200/50 text-green-700" 
                              : "bg-red-50 border-red-200/50 text-red-600"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></span>
                            {isOnline ? "Online" : "Offline"}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-xs font-black text-brown-deep">
                            <span className="text-muted-foreground font-medium block text-[10px] uppercase tracking-wider mb-0.5">Name</span>
                            {pr.name}
                          </div>
                          <div className="text-xs font-bold text-brown-deep">
                            <span className="text-muted-foreground font-medium block text-[10px] uppercase tracking-wider mb-0.5">Queue</span>
                            {pendingCount} Pending
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-border/40 pt-3 mt-4 flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground font-bold">
                          Last Seen
                        </span>
                        <strong className="text-green-700 bg-green-50 border border-green-200/30 px-2 py-0.5 rounded font-black uppercase tracking-wider text-[9px]">
                          Just Now
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active print queue grid */}
          <div className="bg-card border border-border/60 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-black text-brown-deep flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-gold" /> Live Print Queue Worker
            </h3>

            {activeQueue.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">No active print jobs in queue.</div>
            ) : (
              <div className="overflow-x-auto border border-border/40 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border/60">
                    <tr className="text-[10px] uppercase font-black text-muted-foreground">
                      <th className="p-3">Job ID</th>
                      <th className="p-3">Target Printer</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Retries</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 text-brown-deep font-bold">
                    {activeQueue.map((job) => {
                      const pr = printers.find(p => p.id === job.printerId);
                      return (
                        <tr key={job.id} className="group">
                          <td className="p-3 font-mono text-[10px] text-muted-foreground">#{job.id.substring(4, 9)}</td>
                          <td className="p-3">{pr?.name || "Unknown"}</td>
                          <td className="p-3 uppercase text-[10px]">{job.type}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              job.priority === 1 ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
                            }`}>
                              P{job.priority}
                            </span>
                          </td>
                          <td className="p-3 font-mono">{job.retries} / 3</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              job.status === "processing" ? "bg-amber-100 text-amber-700 animate-pulse" : "bg-red-50 text-red-500"
                            }`}>
                              {job.status}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <button
                              onClick={() => handleCancelQueueJob(job.id)}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
                              title="Cancel Job"
                            >
                              <XCircle className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Categories Map & Log history */}
        <div className="space-y-6">
          
          {/* Category to printer routing maps */}
          <div className="bg-card border border-border/60 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-black text-brown-deep flex items-center gap-2">
              <Settings className="h-5 w-5 text-gold" /> Categories routing map
            </h3>
            <p className="text-[10px] text-muted-foreground leading-normal">
              Route orders based on food category. Map a single category to multiple printers (e.g. print Starters to both Kitchen 1 and the Kitchen Display monitor).
            </p>

            <div className="divide-y divide-border/20 max-h-[340px] overflow-y-auto pr-1">
              {CATEGORIES.map((cat) => {
                const mappedIds = categoryMap[cat] || [];
                return (
                  <div key={cat} className="py-3 first:pt-0 last:pb-0 space-y-2">
                    <span className="font-bold text-brown-deep capitalize text-xs block">{cat}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {printers.map((pr) => {
                        const active = mappedIds.includes(pr.id);
                        return (
                          <button
                            key={pr.id}
                            type="button"
                            onClick={() => handleCategoryPrinterToggle(cat, pr.id)}
                            className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border transition-colors cursor-pointer ${
                              active 
                                ? "bg-gold/15 border-gold text-gold" 
                                : "bg-transparent border-border hover:bg-muted/30 text-muted-foreground"
                            }`}
                          >
                            {pr.name}
                          </button>
                        );
                      })}
                      {printers.length === 0 && (
                        <span className="text-[10px] text-muted-foreground font-semibold italic">Configure printer to route categories.</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Diagnostic logs */}
          <div className="bg-card border border-border/60 p-6 rounded-3xl shadow-sm space-y-4 flex flex-col h-[340px] justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-brown-deep flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-gold" /> Diagnostic Audit Logs
                </h3>
              </div>

              <div className="bg-background border border-border/40 p-4 rounded-2xl font-mono text-[9px] h-48 overflow-y-auto space-y-1.5 text-brown-deep leading-relaxed">
                {logs.map((l, i) => (
                  <div key={i} className="flex justify-between gap-1 items-start">
                    <span className="text-slate-500 text-[8px]">{new Date(l.timestamp).toLocaleTimeString("en-IN", { hour12: false })}</span>
                    <span className="flex-1">[{l.event}] {l.message}</span>
                    <span className={`text-[8px] font-bold uppercase ${
                      l.level === "error" ? "text-red-500" : l.level === "warn" ? "text-amber-500" : "text-green-600"
                    }`}>{l.level}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">No printer events logged.</div>
                )}
              </div>
            </div>

            <button
              onClick={handleExportDiagnostics}
              className="w-full bg-cream hover:bg-gold/10 text-brown-deep border border-gold/40 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Cpu className="h-4 w-4 text-gold" /> Export Diagnostics File
            </button>
          </div>
        </div>
      </div>

      {/* Printer Wizard setup modal dialog */}
      {showWizard && (
        <PrinterWizard 
          onSave={handleSaveWizard}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}

export default PrinterManagementPage;
