import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { 
  Plus, Trash2, Printer, RefreshCw, AlertCircle, Wifi, 
  Cpu, Settings, Receipt, Landmark, Users, Package, 
  FileText, History, ShieldAlert, BadgeInfo
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

export const Route = createFileRoute("/admin/settings")({
  component: UnifiedSettingsPage,
});

type TabId = "taxes" | "categories" | "customers" | "inventory" | "reports" | "shifts" | "staff" | "system";

function UnifiedSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("taxes");
  
  // Shared status message
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const tabs: Array<{ id: TabId; label: string; icon: any }> = [
    { id: "taxes", label: "Taxes & Store", icon: Landmark },
    { id: "categories", label: "Categories", icon: Settings },
    { id: "customers", label: "CRM & Customers", icon: Users },
    { id: "inventory", label: "Inventory Stock", icon: Package },
    { id: "reports", label: "Reports Hub", icon: FileText },
    { id: "shifts", label: "Shift Drawer", icon: History },
    { id: "staff", label: "Staff & Roles", icon: Users },
    { id: "system", label: "System Diagnostics", icon: ShieldAlert },
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
        {activeTab === "inventory" && <InventoryTab setStatusMsg={setStatusMsg} />}
        {activeTab === "reports" && <ReportsTab setStatusMsg={setStatusMsg} />}
        {activeTab === "shifts" && <ShiftsTab setStatusMsg={setStatusMsg} />}
        {activeTab === "staff" && <StaffTab setStatusMsg={setStatusMsg} />}
        {activeTab === "system" && <SystemTab />}
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
  const [gstRate, setGstRate] = useState(5);
  const [serviceCharge, setServiceCharge] = useState(2.5);

  useEffect(() => {
    const s = localDb.getSettings();
    setBranchId(s.branchId || "MAIN_BRANCH");
    setName(s.restaurant?.name || "Paakashala");
    setGstRate(s.taxes?.gstRate ?? 5);
    setServiceCharge(s.taxes?.serviceCharge ?? 2.5);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localDb.updateSettings({
      branchId,
      restaurant: { name, address: "Bengaluru" },
      taxes: { gstRate, serviceCharge }
    });
    setStatusMsg({ type: "success", text: "Store and Tax configurations saved successfully." });
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-sm text-xs font-semibold">
      <div>
        <h3 className="text-base font-bold text-brown-deep">Store & Taxes Configuration</h3>
        <p className="text-muted-foreground text-[11px] font-medium mt-1">Manage localized taxing metrics and branch IDs.</p>
      </div>
      <div>
        <label className="block text-[10px] uppercase font-black text-muted-foreground mb-1">Branch ID</label>
        <input type="text" value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full rounded-xl border border-border bg-background p-2.5" />
      </div>
      <div>
        <label className="block text-[10px] uppercase font-black text-muted-foreground mb-1">Restaurant Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-border bg-background p-2.5" />
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

  useEffect(() => {
    setLogs(logger.getLogs().slice(-10)); // Get latest 10 logs
  }, []);

  return (
    <div className="space-y-6 text-xs font-semibold">
      <div>
        <h3 className="text-base font-bold text-brown-deep">System Logs & Configuration Version</h3>
        <p className="text-muted-foreground text-[11px] font-medium mt-1">Diagnostic system logs and config tags.</p>
      </div>
      
      <div className="bg-background border border-border/60 rounded-2xl p-4 space-y-2">
        <p>Config Schema Version: <strong>2.0.0</strong></p>
        <p>Offline Sync Worker: <strong className="text-green-600">IDLE</strong></p>
      </div>

      <div className="space-y-2">
        <h4 className="font-bold flex items-center gap-1.5"><BadgeInfo className="h-4 w-4 text-gold" /> Latest System Events</h4>
        <div className="bg-background border border-border/40 p-4 rounded-2xl font-mono text-[10px] max-h-48 overflow-y-auto space-y-1.5 text-brown-deep">
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
