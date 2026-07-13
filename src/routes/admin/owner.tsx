import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { reportsEngine, ProfitAndLossReport } from "@/modules/reports/services/ReportsEngine";
import { aiCopilot } from "@/modules/ai/AICopilot";
import { menuPublisher } from "@/modules/franchise/MenuPublisher";
import { branchTransferEngine } from "@/modules/franchise/BranchTransferEngine";
import { inventoryEngine, Ingredient } from "@/core/erp/InventoryEngine";
import { 
  Building2, Landmark, RefreshCw, Send, Sparkles, TrendingUp, AlertTriangle, ArrowLeftRight, CheckCircle2 
} from "lucide-react";
import logger from "@/services/logger/Logger";

export const Route = createFileRoute("/admin/owner")({
  component: OwnerDashboardPage,
});

function OwnerDashboardPage() {
  const [financials, setFinancials] = useState<ProfitAndLossReport | null>(null);
  const [loading, setLoading] = useState(false);

  // AI Copilot State
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Multi-Branch Settings
  const [branches, setBranches] = useState<any[]>([]);
  const [newBranch, setNewBranch] = useState({ id: "", name: "", region: "", address: "" });

  // Stock Transfer Form
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [transferForm, setTransferForm] = useState({ src: "branch-01", dest: "branch-02", ingredientId: "", qty: 10 });

  const loadData = async () => {
    setLoading(true);
    try {
      const stats = await reportsEngine.getPandLReport(Date.now() - 86400000 * 30, Date.now() + 86400000);
      const list = await menuPublisher.getBranchesList();
      const ings = await inventoryEngine.getIngredients();

      setFinancials(stats);
      setBranches(list);
      setIngredients(ings);

      if (ings.length > 0 && !transferForm.ingredientId) {
        setTransferForm(prev => ({ ...prev, ingredientId: ings[0].id }));
      }
    } catch (err) {
      logger.error("owner", "Failed loading executive dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAskCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const res = await aiCopilot.queryLocalAssistant(aiQuery);
      setAiResponse(res);
    } catch (err: any) {
      setAiResponse(`Error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.id || !newBranch.name) return;
    try {
      await menuPublisher.registerBranch(newBranch.id, newBranch.name, newBranch.region, newBranch.address);
      alert("New regional branch registered.");
      setNewBranch({ id: "", name: "", region: "", address: "" });
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.ingredientId || transferForm.qty <= 0) return;
    try {
      await branchTransferEngine.createTransfer(
        transferForm.src,
        transferForm.dest,
        [{ ingredientId: transferForm.ingredientId, shippedQty: transferForm.qty }]
      );
      alert("Inter-branch stock transfer initiated.");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6 animate-fade-in text-brown-deep">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-brown-deep flex items-center gap-2">
            <Building2 className="h-6 w-6 text-gold" />
            Owner Central Enterprise Dashboard
          </h2>
          <p className="text-xs text-muted-foreground">Central administration control sheet comparing regional branches, stock transfers, and AI diagnostics.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold/15 text-brown-deep text-xs font-bold rounded-lg border hover:bg-gold/20"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Financials Overview Cards */}
      {financials && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 bg-card/65 border border-border/50 rounded-2xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Gross Sales Revenue</span>
            <div className="text-lg font-black text-green-700 mt-2">₹{financials.totalRevenue.toFixed(2)}</div>
          </div>
          <div className="p-4 bg-card/65 border border-border/50 rounded-2xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Cost of Goods Sold (COGS)</span>
            <div className="text-lg font-black text-red-700 mt-2">₹{financials.totalCostOfGoodsSold.toFixed(2)}</div>
          </div>
          <div className="p-4 bg-card/65 border border-border/50 rounded-2xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Operational Expenses</span>
            <div className="text-lg font-black text-red-700 mt-2">₹{financials.totalExpenses.toFixed(2)}</div>
          </div>
          <div className="p-4 bg-card/65 border border-border/50 rounded-2xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-gold">Executive Net Profit</span>
            <div className="text-lg font-black text-brown-deep mt-2">₹{financials.netProfit.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* AI Copilot & Branch Management split */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Local AI Copilot */}
        <div className="md:col-span-2 bg-card/65 border border-border/50 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-1 text-gold">
              <Sparkles className="h-4 w-4 animate-pulse" /> Offline AI Operations Copilot
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">Ask questions regarding today's sales, margins, low stock ingredients, or dish costing values.</p>
          </div>

          <form onSubmit={handleAskCopilot} className="flex gap-2 bg-background border border-border rounded-xl p-1">
            <input
              type="text"
              placeholder="e.g. show sales or check low stock..."
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs px-3 outline-none border-none focus:ring-0 text-brown-deep"
            />
            <button
              type="submit"
              disabled={aiLoading}
              className="p-2 bg-brown-deep text-gold rounded-lg hover:opacity-95 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          {aiResponse && (
            <div className="p-3 bg-muted border border-gold/10 rounded-xl text-xs font-semibold leading-relaxed animate-fade-up">
              {aiResponse}
            </div>
          )}
        </div>

        {/* Branch Register */}
        <div className="md:col-span-1 bg-card/65 border border-border/50 p-5 rounded-2xl space-y-4 shadow-sm text-xs">
          <h3 className="font-bold text-sm">Register Regional Branch</h3>
          
          <form onSubmit={handleCreateBranch} className="space-y-3">
            <div className="space-y-1">
              <label className="font-bold">Branch ID *</label>
              <input
                type="text"
                required
                value={newBranch.id}
                onChange={e => setNewBranch({ ...newBranch, id: e.target.value })}
                placeholder="e.g. BR-SOUTH-01"
                className="w-full px-3 py-1.5 bg-background border rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold">Branch Name *</label>
              <input
                type="text"
                required
                value={newBranch.name}
                onChange={e => setNewBranch({ ...newBranch, name: e.target.value })}
                className="w-full px-3 py-1.5 bg-background border rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-brown-deep text-gold font-bold rounded-lg uppercase"
            >
              Register Branch
            </button>
          </form>
        </div>
      </div>

      {/* Inter-Branch Stock Transfers Form */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card/65 border border-border/50 p-5 rounded-2xl space-y-4 shadow-sm text-xs">
          <h3 className="font-bold text-sm flex items-center gap-1">
            <ArrowLeftRight className="h-4 w-4 text-gold" /> Inter-Branch Stock Transfer
          </h3>
          <form onSubmit={handleExecuteTransfer} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-bold">Source Branch *</label>
                <select
                  value={transferForm.src}
                  onChange={e => setTransferForm({ ...transferForm, src: e.target.value })}
                  className="w-full px-3 py-2 bg-background border rounded-lg focus:outline-none"
                >
                  <option value="branch-01">Branch Main (HQ)</option>
                  <option value="branch-02">Branch South</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold">Destination Branch *</label>
                <select
                  value={transferForm.dest}
                  onChange={e => setTransferForm({ ...transferForm, dest: e.target.value })}
                  className="w-full px-3 py-2 bg-background border rounded-lg focus:outline-none"
                >
                  <option value="branch-02">Branch South</option>
                  <option value="branch-01">Branch Main (HQ)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-bold">Select Ingredient *</label>
                <select
                  value={transferForm.ingredientId}
                  onChange={e => setTransferForm({ ...transferForm, ingredientId: e.target.value })}
                  className="w-full px-3 py-2 bg-background border rounded-lg focus:outline-none"
                >
                  {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold">Quantity *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={transferForm.qty}
                  onChange={e => setTransferForm({ ...transferForm, qty: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-background border rounded-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-brown-deep text-gold font-bold rounded-lg uppercase"
            >
              Initiate Stock Transfer
            </button>
          </form>
        </div>

        {/* Registered branches list */}
        <div className="bg-card/65 border border-border/50 p-5 rounded-2xl space-y-4 shadow-sm text-xs">
          <h3 className="font-bold text-sm">Branches Performance Overview</h3>
          <div className="space-y-2">
            {branches.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center">No secondary branches registered.</p>
            ) : (
              branches.map(b => (
                <div key={b.id} className="p-3 bg-background border rounded-xl flex justify-between items-center">
                  <div>
                    <div className="font-bold text-brown-deep">{b.name}</div>
                    <span className="text-[9px] text-muted-foreground font-mono">{b.id}</span>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-green-50 text-green-700 border">Active</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default OwnerDashboardPage;
