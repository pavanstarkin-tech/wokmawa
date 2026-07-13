import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  inventoryEngine, Ingredient, IngredientCategory, 
  MeasurementUnit, StockMovement 
} from "@/core/erp/InventoryEngine";
import { 
  Package, Tags, Scale, Plus, RefreshCw, AlertTriangle, 
  History, Settings, ShieldAlert, ArrowUpRight, ArrowDownRight, Edit 
} from "lucide-react";
import logger from "@/services/logger/Logger";

export const Route = createFileRoute("/admin/erp")({
  component: ErpDashboardPage,
});

type ErpTab = "ingredients" | "categories" | "units" | "adjustments" | "ledger" | "reorders";

function ErpDashboardPage() {
  const [activeTab, setActiveTab] = useState<ErpTab>("ingredients");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Core datasets state
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [units, setUnits] = useState<MeasurementUnit[]>([]);
  const [ledger, setLedger] = useState<StockMovement[]>([]);

  // Dialog & Form states
  const [showAddIng, setShowAddIng] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);

  // Form parameters
  const [newIng, setNewIng] = useState({ name: "", sku: "", categoryId: "", unitId: "", minStock: 0, costPrice: 0, openingStock: 0 });
  const [newCatName, setNewCatName] = useState("");
  const [newUnit, setNewUnit] = useState({ name: "", symbol: "" });
  const [adjForm, setAdjForm] = useState({ ingredientId: "", adjustQty: 0, reason: "", type: "in" });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const cats = await inventoryEngine.getCategories();
      const unts = await inventoryEngine.getUnits();
      const ings = await inventoryEngine.getIngredients();
      const movs = await inventoryEngine.getStockMovements();

      setCategories(cats);
      setUnits(unts);
      setIngredients(ings);
      setLedger(movs);
    } catch (err: any) {
      logger.error("erp", "Failed loading ERP data", err);
      setStatusMsg({ type: "error", text: "Failed loading inventory records." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await inventoryEngine.addCategory(newCatName);
      setStatusMsg({ type: "success", text: `Category "${newCatName}" created.` });
      setNewCatName("");
      setShowAddCat(false);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnit.name.trim() || !newUnit.symbol.trim()) return;
    try {
      await inventoryEngine.addUnit(newUnit.name, newUnit.symbol);
      setStatusMsg({ type: "success", text: `Measurement unit "${newUnit.symbol}" registered.` });
      setNewUnit({ name: "", symbol: "" });
      setShowAddUnit(false);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIng.name.trim() || !newIng.sku.trim() || !newIng.categoryId || !newIng.unitId) {
      setStatusMsg({ type: "error", text: "Please complete all required fields." });
      return;
    }
    try {
      await inventoryEngine.addIngredient(
        newIng.name,
        newIng.sku,
        newIng.categoryId,
        newIng.unitId,
        newIng.minStock,
        newIng.costPrice,
        newIng.openingStock
      );
      setStatusMsg({ type: "success", text: `Ingredient "${newIng.name}" registered.` });
      setNewIng({ name: "", sku: "", categoryId: "", unitId: "", minStock: 0, costPrice: 0, openingStock: 0 });
      setShowAddIng(false);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjForm.ingredientId || adjForm.adjustQty <= 0) return;
    try {
      const finalQty = adjForm.type === "in" ? adjForm.adjustQty : -adjForm.adjustQty;
      await inventoryEngine.adjustStock(
        adjForm.ingredientId,
        finalQty,
        adjForm.reason || "Manual Stock Adjustment"
      );
      setStatusMsg({ type: "success", text: "Stock level adjusted successfully." });
      setAdjForm({ ingredientId: "", adjustQty: 0, reason: "", type: "in" });
      setShowAdjust(false);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  // Low stock filters
  const lowStockItems = ingredients.filter(i => i.stockQty <= i.minStock);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brown-deep flex items-center gap-2">
            <Package className="h-7 w-7 text-gold" />
            Restaurant ERP & Inventory
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage raw ingredient metrics, category divisions, measurement units, and log adjustments.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAdjust(true); }}
            className="px-4 py-2 bg-brown-deep text-gold rounded-lg font-medium text-sm hover:opacity-95 transition"
          >
            Adjust Stock
          </button>
          <button
            onClick={loadAllData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 text-brown-deep border border-gold/30 rounded-lg hover:bg-gold/20 transition-all font-medium text-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-sm border font-medium shadow-sm animate-fade-up flex justify-between items-center ${
          statusMsg.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-xs font-bold uppercase ml-4">Dismiss</button>
        </div>
      )}

      {/* Tabs Layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-56 shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {[
            { id: "ingredients", label: "Ingredients", icon: Package },
            { id: "categories", label: "Categories", icon: Tags },
            { id: "units", label: "Units Manager", icon: Scale },
            { id: "ledger", label: "Stock Ledger", icon: History },
            { id: "reorders", label: "Low Stock Alert", icon: AlertTriangle, count: lowStockItems.length }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as ErpTab)}
              className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === t.id 
                  ? "bg-brown-deep text-gold shadow-md" 
                  : "text-muted-foreground hover:bg-card/45 hover:text-brown-deep"
              }`}
            >
              <div className="flex items-center gap-2">
                <t.icon className="h-4.5 w-4.5" />
                {t.label}
              </div>
              {t.count !== undefined && t.count > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-bold bg-destructive text-destructive-foreground rounded-full">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content panels */}
        <div className="flex-1 bg-card/65 backdrop-blur-md border border-border/60 rounded-2xl p-6 min-h-[500px]">
          
          {/* Ingredients tab */}
          {activeTab === "ingredients" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-brown-deep text-lg">Catalog Ingredients</h3>
                <button
                  onClick={() => setShowAddIng(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gold/10 text-brown-deep border border-gold/30 rounded-lg hover:bg-gold/20 text-xs font-bold uppercase transition"
                >
                  <Plus className="h-4 w-4" /> Add Item
                </button>
              </div>

              <div className="overflow-x-auto border border-border/50 rounded-xl bg-background/50">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted-foreground/5 text-muted-foreground border-b border-border/50">
                      <th className="p-3">SKU</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Stock Qty</th>
                      <th className="p-3">Cost Price</th>
                      <th className="p-3">Reorder Alert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No ingredients found. Add one to get started.
                        </td>
                      </tr>
                    ) : (
                      ingredients.map(ing => (
                        <tr key={ing.id} className="border-b border-border/30 hover:bg-muted-foreground/5">
                          <td className="p-3 font-mono text-xs">{ing.sku}</td>
                          <td className="p-3 font-semibold text-brown-deep">{ing.name}</td>
                          <td className="p-3">{ing.categoryName}</td>
                          <td className="p-3 font-bold">
                            <span className={ing.stockQty <= ing.minStock ? "text-destructive font-black" : "text-muted-foreground"}>
                              {ing.stockQty} {ing.unitSymbol}
                            </span>
                          </td>
                          <td className="p-3">₹{(ing.costPrice || 0).toFixed(2)}</td>
                          <td className="p-3">
                            {ing.stockQty <= ing.minStock ? (
                              <span className="px-2 py-0.5 text-xs font-bold bg-destructive/10 text-destructive rounded-full border border-destructive/20">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full border border-green-200">
                                Adequate
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === "categories" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-brown-deep text-lg">Ingredient Groups</h3>
                <button
                  onClick={() => setShowAddCat(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gold/10 text-brown-deep border border-gold/30 rounded-lg hover:bg-gold/20 text-xs font-bold uppercase transition"
                >
                  <Plus className="h-4 w-4" /> Add Category
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {categories.length === 0 ? (
                  <p className="text-muted-foreground col-span-full py-8 text-center text-sm">
                    No categories configured yet.
                  </p>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="p-4 rounded-xl border border-border/60 bg-background/40 flex items-center justify-between">
                      <div className="font-bold text-brown-deep flex items-center gap-2">
                        <Tags className="h-4 w-4 text-gold" />
                        {cat.name}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Units tab */}
          {activeTab === "units" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-brown-deep text-lg">Measurement Scales</h3>
                <button
                  onClick={() => setShowAddUnit(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gold/10 text-brown-deep border border-gold/30 rounded-lg hover:bg-gold/20 text-xs font-bold uppercase transition"
                >
                  <Plus className="h-4 w-4" /> Add Unit
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {units.length === 0 ? (
                  <p className="text-muted-foreground col-span-full py-8 text-center text-sm">
                    No measurement scales configured yet.
                  </p>
                ) : (
                  units.map(u => (
                    <div key={u.id} className="p-4 rounded-xl border border-border/60 bg-background/40 flex items-center justify-between">
                      <div className="font-bold text-brown-deep">
                        {u.name}
                      </div>
                      <span className="px-2 py-0.5 text-xs font-black bg-gold/20 text-brown-deep border border-gold/30 rounded-md">
                        {u.symbol}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Stock movements tab */}
          {activeTab === "ledger" && (
            <div className="space-y-4">
              <h3 className="font-bold text-brown-deep text-lg">Stock ledger movements history</h3>
              
              <div className="overflow-x-auto border border-border/50 rounded-xl bg-background/50">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted-foreground/5 text-muted-foreground border-b border-border/50">
                      <th className="p-3">Time</th>
                      <th className="p-3">Ingredient</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Source Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No stock movements recorded yet.
                        </td>
                      </tr>
                    ) : (
                      ledger.map(mov => (
                        <tr key={mov.id} className="border-b border-border/30 hover:bg-muted-foreground/5">
                          <td className="p-3 text-xs text-muted-foreground">
                            {new Date(mov.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(mov.timestamp).toLocaleDateString()}
                          </td>
                          <td className="p-3 font-semibold text-brown-deep">{mov.ingredientName}</td>
                          <td className="p-3">
                            {mov.type === "in" ? (
                              <span className="inline-flex items-center gap-1 text-green-700 font-bold text-xs bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                <ArrowDownRight className="h-3 w-3" /> IN
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-700 font-bold text-xs bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                <ArrowUpRight className="h-3 w-3" /> OUT
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-bold">{mov.quantity}</td>
                          <td className="p-3 text-xs font-semibold capitalize text-muted-foreground">{mov.source}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reorders tab */}
          {activeTab === "reorders" && (
            <div className="space-y-4">
              <h3 className="font-bold text-brown-deep text-lg text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Low Stock Alerts
              </h3>

              <div className="overflow-x-auto border border-border/50 rounded-xl bg-background/50">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted-foreground/5 text-muted-foreground border-b border-border/50">
                      <th className="p-3">SKU</th>
                      <th className="p-3">Ingredient</th>
                      <th className="p-3">Current Stock</th>
                      <th className="p-3">Alert Threshold</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-green-600 font-medium">
                          All ingredients stock levels are currently adequate.
                        </td>
                      </tr>
                    ) : (
                      lowStockItems.map(item => (
                        <tr key={item.id} className="border-b border-border/30 hover:bg-muted-foreground/5">
                          <td className="p-3 font-mono text-xs">{item.sku}</td>
                          <td className="p-3 font-semibold text-brown-deep">{item.name}</td>
                          <td className="p-3 text-destructive font-black">{item.stockQty} {item.unitSymbol}</td>
                          <td className="p-3 font-bold">{item.minStock} {item.unitSymbol}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 text-xs font-black bg-destructive/10 text-destructive border border-destructive/20 rounded-full">
                              Reorder Immediately
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- Dialog Modals --- */}

      {/* 1. Add Category Modal */}
      {showAddCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleAddCategory} className="bg-card border border-border p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <Tags className="h-5 w-5 text-gold" /> Add Group Category
            </h3>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">Category Name</label>
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="e.g. Dairy, Spices, Vegetables"
                className="w-full px-3 py-2 bg-background border border-border/60 rounded-lg text-sm text-brown-deep focus:outline-none focus:border-gold/60"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCat(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg hover:bg-muted-foreground/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg hover:opacity-95"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Add Unit Modal */}
      {showAddUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleAddUnit} className="bg-card border border-border p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <Scale className="h-5 w-5 text-gold" /> Add Measurement Unit
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Unit Name</label>
                <input
                  type="text"
                  value={newUnit.name}
                  onChange={e => setNewUnit({ ...newUnit, name: e.target.value })}
                  placeholder="e.g. Kilogram, Litre, Gram"
                  className="w-full px-3 py-2 bg-background border border-border/60 rounded-lg text-sm text-brown-deep focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Symbol</label>
                <input
                  type="text"
                  value={newUnit.symbol}
                  onChange={e => setNewUnit({ ...newUnit, symbol: e.target.value })}
                  placeholder="e.g. kg, l, g, pcs"
                  className="w-full px-3 py-2 bg-background border border-border/60 rounded-lg text-sm text-brown-deep focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddUnit(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg hover:bg-muted-foreground/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg hover:opacity-95"
              >
                Register
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Add Ingredient Modal */}
      {showAddIng && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleAddIngredient} className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-gold" /> Register Ingredient
            </h3>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Ingredient Name *</label>
                <input
                  type="text"
                  required
                  value={newIng.name}
                  onChange={e => setNewIng({ ...newIng, name: e.target.value })}
                  placeholder="e.g. Fresh Paneer"
                  className="w-full px-3 py-1.5 bg-background border border-border/60 rounded-lg text-sm text-brown-deep focus:outline-none"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">SKU Code *</label>
                <input
                  type="text"
                  required
                  value={newIng.sku}
                  onChange={e => setNewIng({ ...newIng, sku: e.target.value })}
                  placeholder="e.g. RAW-PAN-001"
                  className="w-full px-3 py-1.5 bg-background border border-border/60 rounded-lg text-sm text-brown-deep focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Category *</label>
                <select
                  required
                  value={newIng.categoryId}
                  onChange={e => setNewIng({ ...newIng, categoryId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-background border border-border/60 rounded-lg text-sm text-brown-deep focus:outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Measurement Unit *</label>
                <select
                  required
                  value={newIng.unitId}
                  onChange={e => setNewIng({ ...newIng, unitId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-background border border-border/60 rounded-lg text-sm text-brown-deep focus:outline-none"
                >
                  <option value="">Select Unit</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Reorder Limit Threshold</label>
                <input
                  type="number"
                  value={newIng.minStock || ""}
                  onChange={e => setNewIng({ ...newIng, minStock: Number(e.target.value) })}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-1.5 bg-background border border-border/60 rounded-lg text-sm text-brown-deep focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Cost Price (₹)</label>
                <input
                  type="number"
                  value={newIng.costPrice || ""}
                  onChange={e => setNewIng({ ...newIng, costPrice: Number(e.target.value) })}
                  placeholder="e.g. 250"
                  className="w-full px-3 py-1.5 bg-background border border-border/60 rounded-lg text-sm text-brown-deep focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Opening Stock Quantity</label>
                <input
                  type="number"
                  value={newIng.openingStock || ""}
                  onChange={e => setNewIng({ ...newIng, openingStock: Number(e.target.value) })}
                  placeholder="Initial inventory stock qty on hand"
                  className="w-full px-3 py-1.5 bg-background border border-border/60 rounded-lg text-sm text-brown-deep focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowAddIng(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg hover:bg-muted-foreground/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg hover:opacity-95"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Adjust Stock Modal */}
      {showAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleAdjustStock} className="bg-card border border-border p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-gold" /> Log Stock Adjustment
            </h3>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Select Ingredient *</label>
                <select
                  required
                  value={adjForm.ingredientId}
                  onChange={e => setAdjForm({ ...adjForm, ingredientId: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border/60 rounded-lg text-sm text-brown-deep focus:outline-none"
                >
                  <option value="">Select Item</option>
                  {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.stockQty} {i.unitSymbol} on hand)</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Adjustment Channel Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjForm({ ...adjForm, type: "in" })}
                    className={`py-1.5 rounded-lg border font-bold text-xs uppercase transition ${
                      adjForm.type === "in" 
                        ? "bg-green-50 border-green-300 text-green-700" 
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    Receive Stock (IN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjForm({ ...adjForm, type: "out" })}
                    className={`py-1.5 rounded-lg border font-bold text-xs uppercase transition ${
                      adjForm.type === "out" 
                        ? "bg-red-50 border-red-300 text-red-700" 
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    Consume / Waste (OUT)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={adjForm.adjustQty || ""}
                    onChange={e => setAdjForm({ ...adjForm, adjustQty: Number(e.target.value) })}
                    placeholder="e.g. 5"
                    className="w-full px-3 py-2 bg-background border border-border/60 rounded-lg text-sm text-brown-deep focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Reason / Description</label>
                <input
                  type="text"
                  value={adjForm.reason}
                  onChange={e => setAdjForm({ ...adjForm, reason: e.target.value })}
                  placeholder="e.g. Stock audit variance, damage, expired"
                  className="w-full px-3 py-2 bg-background border border-border/60 rounded-lg text-sm text-brown-deep focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowAdjust(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg hover:bg-muted-foreground/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg hover:opacity-95"
              >
                Apply
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
