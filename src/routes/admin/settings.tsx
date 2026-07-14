import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { 
  Plus, Trash2, Printer, RefreshCw, AlertCircle, Wifi, 
  Cpu, Settings, Receipt, Landmark, Users, Package, 
  FileText, History, ShieldAlert, BadgeInfo, CheckCircle2
} from "lucide-react";
import printerManager from "@/modules/printer/services/PrinterManager";
import { PrinterConfig, ConnectionType, PaperWidth, PrinterRole } from "@/modules/printer/types/types";
import sessionManager, { CashShift } from "@/services/session/SessionManager";
import localDb from "@/services/database/localDb";
import logger, { LogEntry } from "@/services/logger/Logger";
import { CATEGORIES } from "@/lib/paakashala-menu";
import { healthMonitor, SystemMetric } from "@/modules/health/HealthMonitor";
import { backupWizard } from "@/modules/backup/BackupWizard";
import { performanceBenchmark } from "@/modules/testing/PerformanceBenchmark";
import { ValidationReport, TestResult } from "@/modules/validation/ValidationReport";
import { HardwareCertification } from "@/modules/validation/HardwareCertification";
import { PaymentValidation } from "@/modules/validation/PaymentValidation";
import { RecoveryValidation } from "@/modules/validation/RecoveryValidation";
import { MigrationValidation } from "@/modules/validation/MigrationValidation";
import { PrinterCertification } from "@/modules/validation/PrinterCertification";
import { BackupValidation } from "@/modules/validation/BackupValidation";
import { SecurityValidation } from "@/modules/validation/SecurityValidation";
import { PerformanceValidation } from "@/modules/validation/PerformanceValidation";
import { InstallerValidation } from "@/modules/validation/InstallerValidation";
import { printerRepository, PrinterRegistry } from "@/modules/printing/repositories/PrinterRepository";
import dbService from "@/core/database/DatabaseService";

export const Route = createFileRoute("/admin/settings")({
  component: UnifiedSettingsPage,
});

type TabId = "taxes" | "categories" | "customers" | "reports" | "shifts" | "staff" | "system" | "release_validation" | "printers";

function UnifiedSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("taxes");
  
  // Shared status message
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const tabs: Array<{ id: TabId; label: string; icon: any }> = [
    { id: "taxes", label: "Taxes & Store", icon: Landmark },
    { id: "categories", label: "Categories", icon: Settings },
    { id: "customers", label: "CRM & Customers", icon: Users },
    { id: "reports", label: "Reports Hub", icon: FileText },
    { id: "shifts", label: "Shift Drawer", icon: History },
    { id: "staff", label: "Staff & Roles", icon: Users },
    { id: "printers", label: "Printers config", icon: Printer },
    { id: "system", label: "System Diagnostics", icon: ShieldAlert },
    { id: "release_validation", label: "Release Validation", icon: CheckCircle2 },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full animate-in fade-in duration-300">
      
      {/* Tab Navigation Left Sidebar */}
      <div className="w-full lg:w-56 shrink-0 flex flex-col gap-1 bg-card border border-border/60 p-4 rounded-3xl shadow-sm">
        <h3 className="text-xs font-black text-brown-deep uppercase tracking-wider mb-4 px-2">Settings Modules</h3>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setStatusMsg(null);
              }}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold transition-all text-left ${
                activeTab === tab.id
                  ? "bg-brown-gradient text-cream shadow-sm"
                  : "bg-transparent hover:bg-gold/5 text-brown-deep/80 hover:text-gold"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Panel Content Right */}
      <div className="flex-1 bg-card border border-border/60 p-6 rounded-3xl shadow-sm overflow-y-auto">
        {statusMsg && (
          <div className={`p-4 rounded-2xl text-xs border font-bold flex items-center gap-2 mb-6 ${
            statusMsg.type === "success" 
              ? "bg-green-50 border-green-200/50 text-green-700" 
              : "bg-red-50 border-red-200/50 text-red-700"
          }`}>
            <AlertCircle className="h-4 w-4" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {activeTab === "taxes" && <TaxesTab setStatusMsg={setStatusMsg} />}
        {activeTab === "categories" && <CategoriesTab setStatusMsg={setStatusMsg} />}
        {activeTab === "customers" && <CustomersTab />}
        {activeTab === "reports" && <ReportsTab setStatusMsg={setStatusMsg} />}
        {activeTab === "shifts" && <ShiftsTab setStatusMsg={setStatusMsg} />}
        {activeTab === "staff" && <StaffTab setStatusMsg={setStatusMsg} />}
        {activeTab === "system" && <SystemTab />}
        {activeTab === "printers" && <PrintersConfigTab setStatusMsg={setStatusMsg} />}
        {activeTab === "release_validation" && <ReleaseValidationTab />}
      </div>
    </div>
  );
}

// ==========================================
// 2. Taxes & Store Tab
// ==========================================
function TaxesTab({ setStatusMsg }: any) {
  const [branchId, setBranchId] = useState("");
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [gstRate, setGstRate] = useState(5);
  const [serviceCharge, setServiceCharge] = useState(2.5);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const s = localDb.getSettings();
    setBranchId(s.branchId || "MAIN_BRANCH");
    setName(s.restaurant?.name || "Paakashala");
    setLogoUrl(s.restaurant?.logoUrl || "");
    setGstRate(s.taxes?.gstRate ?? 5);
    setServiceCharge(s.taxes?.serviceCharge ?? 2.5);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("key", "271837f4240842ef12577a95dbae3e88");
      const res = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setLogoUrl(data.data.url);
      } else {
        alert("Upload failed: " + (data.error?.message || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Failed uploading image logo.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localDb.updateSettings({
      branchId,
      restaurant: { name, address: "Bengaluru", logoUrl },
      taxes: { gstRate, serviceCharge }
    });
    setStatusMsg({ type: "success", text: "Store and Tax configurations saved successfully." });
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-sm text-xs font-semibold">
      <div>
        <h3 className="text-base font-bold text-brown-deep">Store & Taxes Configuration</h3>
        <p className="text-muted-foreground text-[11px] font-medium mt-1">Manage localized taxing metrics, branch IDs, and store logo.</p>
      </div>
      <div>
        <label className="block text-[10px] uppercase font-black text-muted-foreground mb-1">Branch ID</label>
        <input type="text" value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full rounded-xl border border-border bg-background p-2.5" />
      </div>
      <div>
        <label className="block text-[10px] uppercase font-black text-muted-foreground mb-1">Restaurant Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-border bg-background p-2.5" />
      </div>
      <div>
        <label className="block text-[10px] uppercase font-black text-muted-foreground mb-1">Store Logo URL</label>
        <div className="flex gap-2 mb-2">
          <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="Store logo URL..." className="flex-1 rounded-xl border border-border bg-background p-2.5" />
        </div>
        <div className="relative">
          <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <div className="w-full rounded-xl border border-dashed border-border/80 bg-muted/20 py-2.5 text-center text-muted-foreground hover:bg-muted/40 transition-colors text-[10px]">
            {uploading ? "Uploading logo..." : "Tap to upload new logo"}
          </div>
        </div>
        {logoUrl && (
          <img src={logoUrl} alt="Store logo preview" className="h-14 w-auto object-contain rounded border border-border mt-2" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] uppercase font-black text-muted-foreground mb-1">GST Tax Rate (%)</label>
          <input type="number" value={gstRate} onChange={e => setGstRate(Number(e.target.value))} className="w-full rounded-xl border border-border bg-background p-2.5" />
        </div>
        <div>
          <label className="block text-[10px] uppercase font-black text-muted-foreground mb-1">Service Charge (%)</label>
          <input type="number" value={serviceCharge} onChange={e => setServiceCharge(Number(e.target.value))} className="w-full rounded-xl border border-border bg-background p-2.5" />
        </div>
      </div>
      <button type="submit" className="w-full rounded-xl bg-brown-gradient py-3 text-cream font-bold uppercase tracking-wider">Save Configuration</button>
    </form>
  );
}

// ==========================================
// 3. Categories Tab
// ==========================================
function CategoriesTab({ setStatusMsg }: any) {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState("");

  useEffect(() => {
    setCategories([...CATEGORIES]);
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    if (categories.includes(newCat.trim())) {
      setStatusMsg({ type: "error", text: "Category already exists." });
      return;
    }
    setCategories(prev => [...prev, newCat.trim()]);
    setStatusMsg({ type: "success", text: `Category "${newCat}" added.` });
    setNewCat("");
  };

  return (
    <div className="space-y-6 max-w-md text-xs font-semibold">
      <div>
        <h3 className="text-base font-bold text-brown-deep">Category Manager</h3>
        <p className="text-muted-foreground text-[11px] font-medium mt-1">Manage active menu categories.</p>
      </div>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input type="text" value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New Category name" className="flex-1 rounded-xl border border-border bg-background p-2.5" required />
        <button type="submit" className="bg-brown-gradient text-cream px-4 py-2.5 rounded-xl font-bold uppercase">Add</button>
      </form>
      <ul className="divide-y divide-border/20 border border-border/40 rounded-2xl overflow-hidden bg-background">
        {categories.map((c, i) => (
          <li key={i} className="p-3 flex justify-between items-center text-brown-deep font-bold">
            <span>{c}</span>
            <span className="text-[10px] text-muted-foreground">ID: {c.toLowerCase().replace(/ /g, "-")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ==========================================
// 4. CRM & Customers Tab
// ==========================================
function CustomersTab() {
  const customers = [
    { name: "Pavan Kumar Swamy", phone: "9863912282", visits: 14, spent: 5400 },
    { name: "John Doe", phone: "9876543210", visits: 3, spent: 1200 },
    { name: "Jane Smith", phone: "9123456789", visits: 8, spent: 3100 }
  ];

  return (
    <div className="space-y-6 text-xs font-semibold">
      <div>
        <h3 className="text-base font-bold text-brown-deep">CRM Customer Directory</h3>
        <p className="text-muted-foreground text-[11px] font-medium mt-1">Search customer directory and loyalty milestones.</p>
      </div>
      <div className="overflow-x-auto border border-border/40 rounded-2xl">
        <table className="w-full text-left">
          <thead className="bg-muted/40 border-b border-border/60">
            <tr>
              <th className="p-3">Customer Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Visits</th>
              <th className="p-3 text-right">LTV Spending</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {customers.map((c, i) => (
              <tr key={i}>
                <td className="p-3 font-bold">{c.name}</td>
                <td className="p-3 font-mono">+{c.phone}</td>
                <td className="p-3">{c.visits} times</td>
                <td className="p-3 text-right text-gold font-bold">₹{c.spent.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 5. Inventory Tab
// ==========================================
function InventoryTab({ setStatusMsg }: any) {
  const [stock, setStock] = useState([
    { item: "Basmati Rice", code: "RAW-01", qty: 120, unit: "kg", limit: 30 },
    { item: "Paneer Blocks", code: "RAW-02", qty: 15, unit: "kg", limit: 10 },
    { item: "Chicken Breast", code: "RAW-03", qty: 8, unit: "kg", limit: 12 }, // Low stock
    { item: "Cooking Oil", code: "RAW-04", qty: 50, unit: "L", limit: 15 }
  ]);

  return (
    <div className="space-y-6 text-xs font-semibold">
      <div>
        <h3 className="text-base font-bold text-brown-deep">Inventory & Raw Ingredients</h3>
        <p className="text-muted-foreground text-[11px] font-medium mt-1">Future-ready ingredient list tracking.</p>
      </div>
      <div className="overflow-x-auto border border-border/40 rounded-2xl">
        <table className="w-full text-left">
          <thead className="bg-muted/40 border-b border-border/60">
            <tr>
              <th className="p-3">Item Code</th>
              <th className="p-3">Raw Name</th>
              <th className="p-3">Quantity</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {stock.map((s, i) => {
              const isLow = s.qty <= s.limit;
              return (
                <tr key={i}>
                  <td className="p-3 font-mono">{s.code}</td>
                  <td className="p-3 font-bold">{s.item}</td>
                  <td className="p-3">{s.qty} {s.unit}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isLow 
                        ? "bg-red-50 border-red-200/50 text-red-600 animate-pulse" 
                        : "bg-green-50 border-green-200/50 text-green-700"
                    }`}>
                      {isLow ? "LOW STOCK" : "IN STOCK"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 6. Reports Tab
// ==========================================
function ReportsTab({ setStatusMsg }: any) {
  const bills = localDb.getTable("bills") || [];

  const totals = useMemo(() => {
    let sales = 0;
    let tax = 0;
    let discount = 0;
    bills.forEach((b: any) => {
      sales += b.grandTotal;
      tax += b.tax;
      discount += b.discount;
    });
    return { sales, tax, discount };
  }, [bills]);

  const handlePrintDailyClosing = async () => {
    const cashierName = sessionManager.getActiveShift()?.cashierName || "Head Cashier";
    const data = {
      shiftId: `SHIFT-${Date.now().toString().substring(8)}`,
      cashierName,
      openedAt: Date.now() - 36000000,
      closedAt: Date.now(),
      openingBalance: 2000,
      expectedBalance: 2000 + totals.sales,
      actualBalance: 2000 + totals.sales,
      discrepancy: 0,
      salesCash: totals.sales,
      salesCard: 0,
      salesUpi: 0,
      salesRazorpay: 0
    };

    const success = await printerManager.printDailyClosing(data);
    if (success) {
      setStatusMsg({ type: "success", text: "Daily closing audit printed successfully." });
    } else {
      setStatusMsg({ type: "error", text: "Printing closing report failed." });
    }
  };

  return (
    <div className="space-y-6 text-xs font-semibold max-w-sm">
      <div>
        <h3 className="text-base font-bold text-brown-deep">Reporting Operations Hub</h3>
        <p className="text-muted-foreground text-[11px] font-medium mt-1">Audit daily totals and print closing logs.</p>
      </div>

      <div className="bg-background border border-border/60 p-4 rounded-2xl space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cumulative Sales (Today):</span>
          <span className="font-bold text-brown-deep">₹{totals.sales.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">GST Collected (Today):</span>
          <span className="font-bold text-brown-deep">₹{totals.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Promo Discounts Given:</span>
          <span className="font-bold text-green-700">-₹{totals.discount.toFixed(2)}</span>
        </div>
      </div>

      <button onClick={handlePrintDailyClosing} className="w-full rounded-xl bg-brown-gradient py-3 text-cream font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
        <Printer className="h-4 w-4" /> Print Daily Closing Report
      </button>
    </div>
  );
}

// ==========================================
// 7. Shifts Tab
// ==========================================
function ShiftsTab({ setStatusMsg }: any) {
  const [shift, setShift] = useState<CashShift | null>(null);
  const [openBalance, setOpenBalance] = useState(2000);
  const [closeBalance, setCloseBalance] = useState(0);

  useEffect(() => {
    setShift(sessionManager.getActiveShift());
  }, []);

  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault();
    const newS = sessionManager.openShift("Head Cashier", openBalance);
    setShift(newS);
    setStatusMsg({ type: "success", text: "Register shift opened." });
  };

  const handleClose = (e: React.FormEvent) => {
    e.preventDefault();
    const closed = sessionManager.closeShift(closeBalance);
    setShift(null);
    setStatusMsg({ type: "success", text: "Register shift closed." });
  };

  return (
    <div className="space-y-6 max-w-sm text-xs font-semibold">
      <div>
        <h3 className="text-base font-bold text-brown-deep">Drawer Shift Session</h3>
        <p className="text-muted-foreground text-[11px] font-medium mt-1">Open shifts, balance drawers, and verify expected balances.</p>
      </div>

      {shift ? (
        <form onSubmit={handleClose} className="space-y-4">
          <div className="bg-background border border-gold/10 p-4 rounded-2xl space-y-2">
            <p>Cashier: <strong className="text-brown-deep">{shift.cashierName}</strong></p>
            <p>Opened At: <strong>{new Date(shift.openedAt).toLocaleTimeString()}</strong></p>
            <p>Expected Cash: <strong className="text-gold">₹{shift.expectedBalance.toFixed(2)}</strong></p>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-black text-muted-foreground mb-1">Actual Cash Drawer Contents</label>
            <input type="number" value={closeBalance} onChange={e => setCloseBalance(Number(e.target.value))} className="w-full rounded-xl border border-border bg-background p-2.5" />
          </div>
          <button type="submit" className="w-full rounded-xl bg-brown-gradient py-3 text-cream font-bold uppercase tracking-wider">Close Shift & Audit</button>
        </form>
      ) : (
        <form onSubmit={handleOpen} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-black text-muted-foreground mb-1">Opening Float Balance</label>
            <input type="number" value={openBalance} onChange={e => setOpenBalance(Number(e.target.value))} className="w-full rounded-xl border border-border bg-background p-2.5" />
          </div>
          <button type="submit" className="w-full rounded-xl bg-brown-gradient py-3 text-cream font-bold uppercase tracking-wider">Open Register Shift</button>
        </form>
      )}
    </div>
  );
}

// ==========================================
// 8. Staff Tab
// ==========================================
function StaffTab({ setStatusMsg }: any) {
  const staff = [
    { name: "Pavan Swamy", role: "Admin", status: "online" },
    { name: "Ramesh K.", role: "Cashier", status: "online" },
    { name: "Suresh P.", role: "Chef", status: "offline" }
  ];

  return (
    <div className="space-y-6 text-xs font-semibold">
      <div>
        <h3 className="text-base font-bold text-brown-deep">Staff Directory</h3>
        <p className="text-muted-foreground text-[11px] font-medium mt-1">View staff rosters and permission rolls.</p>
      </div>
      <div className="overflow-x-auto border border-border/40 rounded-2xl bg-background">
        <table className="w-full text-left">
          <thead className="bg-muted/40 border-b border-border/60">
            <tr>
              <th className="p-3">Staff Name</th>
              <th className="p-3">Role</th>
              <th className="p-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {staff.map((s, i) => (
              <tr key={i}>
                <td className="p-3 font-bold">{s.name}</td>
                <td className="p-3 font-bold text-gold uppercase">{s.role}</td>
                <td className="p-3 text-right">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    s.status === "online" ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"
                  }`}>{s.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 9. System Diagnostics Tab
// ==========================================
function SystemTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [benchStatus, setBenchStatus] = useState("");
  const [benchTime, setBenchTime] = useState<number | null>(null);

  const loadDiagnostics = async () => {
    const list = await healthMonitor.diagnoseSystem();
    setMetrics(list);
  };

  useEffect(() => {
    setLogs(logger.getLogs().slice(-10));
    loadDiagnostics();
  }, []);

  const handleBackup = async () => {
    const res = await backupWizard.performFullBackup();
    alert(`Backup ZIP successfully generated: ${res.filename} (${(res.size / 1024).toFixed(1)} KB)`);
  };

  const handleRestore = async () => {
    const ok = await backupWizard.restoreDatabase("mock_backup.db");
    if (ok) alert("System data restoration and verification complete.");
  };

  const handleBenchmark = async () => {
    setBenchStatus("Running SQLite write transactions benchmark scale (1000 items)...");
    const res = await performanceBenchmark.runScalingBenchmark(1000);
    setBenchTime(res.timeSpentMs);
    setBenchStatus(res.status);
  };

  return (
    <div className="space-y-6 text-xs font-semibold text-brown-deep">
      <div>
        <h3 className="text-base font-bold text-brown-deep">System Diagnostics & Backup Operations</h3>
        <p className="text-muted-foreground text-[11px] font-medium mt-1">Perform full system health diagnostics audits, scaling tests, and database backups.</p>
      </div>

      {/* Health diagnostics table */}
      <div className="space-y-2">
        <h4 className="font-bold flex items-center gap-1.5 text-gold">Active Health Monitors</h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {metrics.map((m, i) => (
            <div key={i} className="p-3 bg-background border rounded-xl flex justify-between items-center">
              <span>{m.name}</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                m.status === "green" ? "bg-green-50 text-green-700 border" : "bg-destructive/10 text-destructive border"
              }`}>{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Backup wizard controls */}
      <div className="space-y-2 border-t pt-4">
        <h4 className="font-bold">Backup & Restore Wizard</h4>
        <div className="flex gap-2">
          <button
            onClick={handleBackup}
            className="px-4 py-2 bg-brown-deep text-gold rounded-xl font-bold hover:opacity-95"
          >
            Create Full ZIP Backup
          </button>
          <button
            onClick={handleRestore}
            className="px-4 py-2 bg-gold/10 hover:bg-gold/20 text-brown-deep rounded-xl font-bold border border-gold/30"
          >
            Verify & Restore Backup
          </button>
        </div>
      </div>

      {/* Performance Scaling Testing */}
      <div className="space-y-2 border-t pt-4">
        <h4 className="font-bold text-gold">SQLite Scaling Stress Testing</h4>
        <div className="flex flex-col gap-2 bg-background border p-4 rounded-xl">
          <p className="text-[10px] text-muted-foreground">Test SQLite latency bounds under 1,000 concurrent database write transactions.</p>
          <div className="flex gap-2 items-center">
            <button
              onClick={handleBenchmark}
              className="px-3 py-1.5 bg-gold/10 hover:bg-gold/20 text-brown-deep rounded-lg font-bold border"
            >
              Run Stress test
            </button>
            {benchTime !== null && (
              <span className="text-[10px] font-mono text-green-700 font-bold">Latency: {benchTime} ms</span>
            )}
          </div>
          {benchStatus && <p className="text-[9px] text-muted-foreground font-mono">{benchStatus}</p>}
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <h4 className="font-bold flex items-center gap-1.5"><BadgeInfo className="h-4 w-4 text-gold" /> Latest System Events</h4>
        <div className="bg-background border border-border/45 p-4 rounded-2xl font-mono text-[10px] max-h-48 overflow-y-auto space-y-1.5 text-brown-deep">
          {logs.map((l, i) => (
            <div key={i} className="flex justify-between">
              <span>{new Date(l.timestamp).toLocaleTimeString()} [{l.category.toUpperCase()}] {l.message}</span>
              <span className={l.level === "error" ? "text-red-500 font-bold" : l.level === "warn" ? "text-orange-500" : "text-green-600"}>{l.level.toUpperCase()}</span>
            </div>
          ))}
          {logs.length === 0 && <div className="text-center text-muted-foreground py-4">No system events logged.</div>}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 10. Release Validation Tab
// ==========================================
function ReleaseValidationTab() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const loadResults = () => {
    setResults(ValidationReport.getResults());
  };

  useEffect(() => {
    loadResults();
  }, []);

  const runAllChecks = async () => {
    setRunning(true);
    try {
      await HardwareCertification.runTest();
      await PaymentValidation.runTest();
      await RecoveryValidation.runTest();
      await MigrationValidation.runTest();
      await PrinterCertification.runTest();
      await BackupValidation.runTest();
      await SecurityValidation.runTest();
      await PerformanceValidation.runTest();
      await InstallerValidation.runTest();
      loadResults();
    } finally {
      setRunning(false);
    }
  };

  const runSingleCheck = async (name: string) => {
    switch (name) {
      case "Hardware Certification":
        await HardwareCertification.runTest();
        break;
      case "Payment Validation":
        await PaymentValidation.runTest();
        break;
      case "Recovery Validation":
        await RecoveryValidation.runTest();
        break;
      case "Migration Validation":
        await MigrationValidation.runTest();
        break;
      case "Printer Certification":
        await PrinterCertification.runTest();
        break;
      case "Backup Validation":
        await BackupValidation.runTest();
        break;
      case "Security Validation":
        await SecurityValidation.runTest();
        break;
      case "Performance Validation":
        await PerformanceValidation.runTest();
        break;
      case "Installer Validation":
        await InstallerValidation.runTest();
        break;
    }
    loadResults();
  };

  const list = [
    { name: "Hardware Certification", desc: "Validates connected USB, LAN, and Bluetooth terminals." },
    { name: "Payment Validation", desc: "Assesses cash, UPI QR payouts, and split proportions." },
    { name: "Recovery Validation", desc: "Checks queue restoration during simulated outages." },
    { name: "Migration Validation", desc: "Verifies SQLite integrity from Version 1 schema up to Version 8." },
    { name: "Printer Certification", desc: "Tests ticket formatting and receipt cutter triggers." },
    { name: "Backup Validation", desc: "Ensures ZIP backups consistency and checksum checks." },
    { name: "Security Validation", desc: "Checks role privileges and manager PIN overrides." },
    { name: "Performance Validation", desc: "Simulates database latency limits under scaling stress." },
    { name: "Installer Validation", desc: "Verifies auto-startup configurations and update registries." }
  ];

  return (
    <div className="space-y-6 text-xs font-semibold text-brown-deep">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-base font-bold text-brown-deep">Release Candidate Validation Suite</h3>
          <p className="text-muted-foreground text-[11px] font-medium mt-1">Verify POS hardware connectivity, sync recovery paths, and schema upgrades for commercial rollout.</p>
        </div>
        <button
          onClick={runAllChecks}
          disabled={running}
          className="px-4 py-2 bg-brown-deep text-gold rounded-xl font-bold hover:opacity-95 disabled:opacity-50"
        >
          {running ? "Running Checks..." : "Run All Checks"}
        </button>
      </div>

      <div className="space-y-3">
        {list.map((item, idx) => {
          const res = results.find(r => r.name === item.name);
          return (
            <div key={idx} className="p-4 bg-background border rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="space-y-1">
                <h4 className="font-bold text-brown-deep">{item.name}</h4>
                <p className="text-[10px] text-muted-foreground font-normal">{item.desc}</p>
                {res && (
                  <p className="text-[9px] text-muted-foreground font-mono">
                    Last Run: {new Date(res.lastRun).toLocaleTimeString()} | Duration: {res.durationMs}ms
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                {res ? (
                  <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded ${
                    res.status === "Pass" ? "bg-green-50 text-green-700 border" : "bg-destructive/10 text-destructive border"
                  }`}>
                    {res.status}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[9px] font-black uppercase rounded bg-muted text-muted-foreground">Pending</span>
                )}
                <button
                  onClick={() => runSingleCheck(item.name)}
                  className="px-3 py-1 bg-gold/10 hover:bg-gold/20 text-brown-deep rounded-lg border font-bold text-[10px]"
                >
                  Run Test
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 11. Printers Config Tab
// ==========================================
function PrintersConfigTab({ setStatusMsg }: any) {
  const [printers, setPrinters] = useState<PrinterRegistry[]>([]);
  const [form, setForm] = useState({
    id: "",
    name: "",
    printerType: "kitchen" as "kitchen" | "counter",
    connectionType: "lan" as "usb" | "lan" | "bluetooth",
    ipAddress: "",
    port: 9100,
    usbDevice: "",
    paperWidth: 80,
    isDefault: 0
  });

  const loadPrinters = async () => {
    try {
      await dbService.initialize();
      const list = await printerRepository.getPrinters();
      setPrinters(list);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  useEffect(() => {
    loadPrinters();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id || !form.name) return;
    try {
      await dbService.initialize();
      await printerRepository.savePrinter({
        ...form,
        status: "online"
      });
      setStatusMsg({ type: "success", text: `Printer ${form.name} saved successfully.` });
      setForm({
        id: "",
        name: "",
        printerType: "kitchen",
        connectionType: "lan",
        ipAddress: "",
        port: 9100,
        usbDevice: "",
        paperWidth: 80,
        isDefault: 0
      });
      await loadPrinters();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dbService.initialize();
      await printerRepository.deletePrinter(id);
      setStatusMsg({ type: "success", text: "Printer configurations deleted." });
      await loadPrinters();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  return (
    <div className="space-y-6 text-xs font-semibold text-brown-deep">
      <div>
        <h3 className="text-base font-bold text-brown-deep">Printers Dual Routing Setup</h3>
        <p className="text-muted-foreground text-[11px] font-medium mt-1">Configure Counter and Kitchen printers with custom connection types and paper widths.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Form */}
        <form onSubmit={handleSubmit} className="md:col-span-1 space-y-3 bg-background border p-4 rounded-2xl">
          <div className="space-y-1">
            <label className="font-bold">Printer ID *</label>
            <input
              type="text"
              required
              value={form.id}
              onChange={e => setForm({ ...form, id: e.target.value })}
              placeholder="e.g. kitchen-kot"
              className="w-full px-3 py-1.5 bg-background border rounded-lg focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold">Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Kitchen KOT Printer"
              className="w-full px-3 py-1.5 bg-background border rounded-lg focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-bold">Printer Type</label>
              <select
                value={form.printerType}
                onChange={e => setForm({ ...form, printerType: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-background border rounded-lg focus:outline-none"
              >
                <option value="counter">Counter Printer</option>
                <option value="kitchen">Kitchen Printer</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold">Connection</label>
              <select
                value={form.connectionType}
                onChange={e => setForm({ ...form, connectionType: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-background border rounded-lg focus:outline-none"
              >
                <option value="usb">USB Device</option>
                <option value="lan">LAN Network</option>
                <option value="bluetooth">Bluetooth</option>
              </select>
            </div>
          </div>

          {form.connectionType === "lan" && (
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <label className="font-bold">IP Address</label>
                <input
                  type="text"
                  value={form.ipAddress}
                  onChange={e => setForm({ ...form, ipAddress: e.target.value })}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-1.5 bg-background border rounded-lg focus:outline-none"
                />
              </div>
              <div className="col-span-1 space-y-1">
                <label className="font-bold">Port</label>
                <input
                  type="number"
                  value={form.port}
                  onChange={e => setForm({ ...form, port: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-background border rounded-lg focus:outline-none"
                />
              </div>
            </div>
          )}

          {form.connectionType === "usb" && (
            <div className="space-y-1">
              <label className="font-bold">USB Device ID</label>
              <input
                type="text"
                value={form.usbDevice}
                onChange={e => setForm({ ...form, usbDevice: e.target.value })}
                placeholder="USB001"
                className="w-full px-3 py-1.5 bg-background border rounded-lg focus:outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-bold">Paper Width</label>
              <select
                value={form.paperWidth}
                onChange={e => setForm({ ...form, paperWidth: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-background border rounded-lg focus:outline-none"
              >
                <option value={80}>80 mm</option>
                <option value={58}>58 mm</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold">Set Default</label>
              <select
                value={form.isDefault}
                onChange={e => setForm({ ...form, isDefault: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-background border rounded-lg focus:outline-none"
              >
                <option value={0}>No</option>
                <option value={1}>Yes</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-brown-deep text-gold font-bold rounded-xl uppercase"
          >
            Save Printer
          </button>
        </form>

        {/* List */}
        <div className="md:col-span-2 space-y-3">
          <h4 className="font-bold">Configured Hardware</h4>
          <div className="space-y-2">
            {printers.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 bg-background border rounded-2xl">No printers configured.</p>
            ) : (
              printers.map(p => (
                <div key={p.id} className="p-3 bg-background border rounded-xl flex justify-between items-center">
                  <div>
                    <div className="font-bold">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">Type: <span className="uppercase font-bold text-gold">{p.printerType}</span> | Connection: <span className="uppercase">{p.connectionType}</span></div>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
