import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { 
  inventoryEngine, Ingredient, IngredientCategory, 
  MeasurementUnit, StockMovement 
} from "@/core/erp/InventoryEngine";
import { 
  recipeEngine, Recipe, RecipeItem 
} from "@/modules/recipes/services/RecipeEngine";
import { CostCalculator } from "@/modules/recipes/services/CostCalculator";
import { recipeRepository } from "@/modules/recipes/repositories/RecipeRepository";
import { MENU, MenuItem } from "@/lib/paakashala-menu";
import { 
  purchaseOrderEngine, Vendor, PurchaseOrder, PurchaseOrderItem 
} from "@/modules/procurement/services/PurchaseOrderEngine";
import { goodsReceiptEngine, GoodsReceipt } from "@/modules/procurement/services/GoodsReceiptEngine";
import { vendorLedgerEngine } from "@/modules/procurement/services/VendorLedgerEngine";
import dbService from "@/core/database/DatabaseService";
import { 
  Package, Tags, Scale, Plus, RefreshCw, AlertTriangle, 
  History, Settings, ShieldAlert, ArrowUpRight, ArrowDownRight, 
  BookOpen, Edit3, Trash2, Check, Percent, FileText, Users, ShoppingBag, Truck, Receipt 
} from "lucide-react";
import logger from "@/services/logger/Logger";

export const Route = createFileRoute("/admin/erp")({
  component: ErpDashboardPage,
});

type ErpTab = "ingredients" | "categories" | "units" | "recipes" | "recipe_builder" | "wastage" | "vendors" | "purchase_orders" | "goods_receipts" | "vendor_ledger" | "ledger" | "reorders";

function ErpDashboardPage() {
  const [activeTab, setActiveTab] = useState<ErpTab>("ingredients");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // --- Sprint 1 Datasets ---
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [units, setUnits] = useState<MeasurementUnit[]>([]);
  const [ledger, setLedger] = useState<StockMovement[]>([]);

  // --- Sprint 2 Datasets ---
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  const [wastageLogs, setWastageLogs] = useState<any[]>([]);

  // --- Sprint 3 Datasets ---
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [selectedVendorLedger, setSelectedVendorLedger] = useState<any[]>([]);
  const [activeVendorId, setActiveVendorId] = useState("");

  // Dialog & Form states
  const [showAddIng, setShowAddIng] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showLogWastage, setShowLogWastage] = useState(false);
  
  // Sprint 3 Modals
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [showGRNInspection, setShowGRNInspection] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form parameters
  const [newIng, setNewIng] = useState({ name: "", sku: "", categoryId: "", unitId: "", minStock: 0, costPrice: 0, openingStock: 0 });
  const [newCatName, setNewCatName] = useState("");
  const [newUnit, setNewUnit] = useState({ name: "", symbol: "" });
  const [adjForm, setAdjForm] = useState({ ingredientId: "", adjustQty: 0, reason: "", type: "in" });
  const [wastageForm, setWastageForm] = useState({ recipeItemId: "", expectedQty: 0, actualQty: 0 });

  // Sprint 3 Forms
  const [newVendor, setNewVendor] = useState({ vendorCode: "", name: "", phone: "", email: "", gst: "", pan: "", address: "", paymentTerms: 30 });
  const [poForm, setPoForm] = useState({ vendorId: "", notes: "", expectedDate: Date.now() + 86400000 * 3 });
  const [poFormItems, setPoFormItems] = useState<Array<{ ingredientId: string; quantity: number; unitPrice: number }>>([]);
  const [activePO, setActivePO] = useState<PurchaseOrder | null>(null);
  const [activePOItems, setActivePOItems] = useState<PurchaseOrderItem[]>([]);
  const [grnInspectionItems, setGrnInspectionItems] = useState<Array<{ ingredientId: string; acceptedQty: number; rejectedQty: number; damagedQty: number; returnedQty: number; batchNumber: string; expiryDate: string; remarks: string; unitCost: number }>>([]);
  const [paymentForm, setPaymentForm] = useState({ vendorId: "", amount: 0, paymentMode: "upi", transactionNumber: "", notes: "" });

  // --- Recipe Builder State ---
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [recipeVariant, setRecipeVariant] = useState("default");
  const [builderYield, setBuilderYield] = useState(1);
  const [builderYieldUnit, setBuilderYieldUnit] = useState("");
  const [builderItems, setBuilderItems] = useState<Array<{ ingredientId: string; quantity: number; wastagePercent: number }>>([]);
  const [builderCosts, setBuilderCosts] = useState({ packaging: 0, labour: 0, overhead: 0 });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const cats = await inventoryEngine.getCategories();
      const unts = await inventoryEngine.getUnits();
      const ings = await inventoryEngine.getIngredients();
      const movs = await inventoryEngine.getStockMovements();
      const recs = await recipeEngine.getRecipes();
      const wastes = await recipeRepository.getWastageLogs();
      const vends = await purchaseOrderEngine.getVendors();
      const posList = await purchaseOrderEngine.getPurchaseOrders();
      const grns = await goodsReceiptsList();

      const riQuery = await dbService.getAdapter().query(`
        SELECT ri.id as recipeItemId, ri.quantity, i.name as ingredientName, r.recipeName
        FROM recipe_items ri
        JOIN ingredients i ON ri.ingredientId = i.id
        JOIN recipes r ON ri.recipeId = r.id
      `);

      setCategories(cats);
      setUnits(unts);
      setIngredients(ings);
      setLedger(movs);
      setRecipes(recs);
      setRecipeItems(riQuery);
      setWastageLogs(wastes);
      setVendors(vends);
      setPurchaseOrders(posList);
      setGoodsReceipts(grns);

      if (vends.length > 0 && !activeVendorId) {
        setActiveVendorId(vends[0].id);
        const lLogs = await vendorLedgerEngine.getLedgerLogs(vends[0].id);
        setSelectedVendorLedger(lLogs);
      }

      if (unts.length > 0 && !builderYieldUnit) {
        setBuilderYieldUnit(unts[0].id);
      }
    } catch (err: any) {
      logger.error("erp", "Failed loading ERP data", err);
      setStatusMsg({ type: "error", text: "Failed loading inventory and recipe records." });
    } finally {
      setLoading(false);
    }
  };

  const goodsReceiptsList = async (): Promise<GoodsReceipt[]> => {
    return dbService.getAdapter().query("SELECT * FROM goods_receipts ORDER BY receivedDate DESC");
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeVendorId) {
      vendorLedgerEngine.getLedgerLogs(activeVendorId).then(logs => {
        setSelectedVendorLedger(logs);
      });
    }
  }, [activeVendorId]);

  // --- Sprint 3 Handlers ---
  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.name || !newVendor.vendorCode) return;
    try {
      await purchaseOrderEngine.createVendor({
        ...newVendor,
        status: "active",
        branchId: "MAIN_BRANCH"
      });
      setStatusMsg({ type: "success", text: `Vendor "${newVendor.name}" registered.` });
      setNewVendor({ vendorCode: "", name: "", phone: "", email: "", gst: "", pan: "", address: "", paymentTerms: 30 });
      setShowAddVendor(false);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleAddPOItem = (ingId: string) => {
    if (poFormItems.some(it => it.ingredientId === ingId)) return;
    setPoFormItems([...poFormItems, { ingredientId: ingId, quantity: 10, unitPrice: 100 }]);
  };

  const updatePOItem = (ingId: string, updates: Partial<{ quantity: number; unitPrice: number }>) => {
    setPoFormItems(poFormItems.map(it => it.ingredientId === ingId ? { ...it, ...updates } : it));
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.vendorId || poFormItems.length === 0) return;
    try {
      const subtotal = poFormItems.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
      const grandTotal = subtotal; // Simpler GST calculation for modal representation
      
      const itemsList = poFormItems.map(it => ({
        ingredientId: it.ingredientId,
        quantity: it.quantity,
        receivedQty: 0,
        unitPrice: it.unitPrice,
        tax: 0,
        total: it.quantity * it.unitPrice
      }));

      await purchaseOrderEngine.createPurchaseOrder({
        poNumber: "",
        vendorId: poForm.vendorId,
        status: "draft",
        orderDate: Date.now(),
        expectedDate: Number(poForm.expectedDate),
        subtotal,
        cgst: 0,
        sgst: 0,
        igst: 0,
        cess: 0,
        discount: 0,
        grandTotal,
        notes: poForm.notes
      }, itemsList);

      setStatusMsg({ type: "success", text: "Purchase Order saved as Draft." });
      setPoFormItems([]);
      setShowCreatePO(false);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleApprovePO = async (poId: string) => {
    try {
      await purchaseOrderEngine.approvePurchaseOrder(poId);
      setStatusMsg({ type: "success", text: "Purchase Order approved and ordered." });
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleOpenGRNModal = async (po: PurchaseOrder) => {
    const items = await purchaseOrderEngine.getPOItems(po.id);
    setActivePO(po);
    setActivePOItems(items);
    setGrnInspectionItems(items.map(it => ({
      ingredientId: it.ingredientId,
      acceptedQty: it.quantity - it.receivedQty,
      rejectedQty: 0,
      damagedQty: 0,
      returnedQty: 0,
      batchNumber: `BAT-${Date.now().toString().slice(-4)}`,
      expiryDate: new Date(Date.now() + 86400000 * 90).toISOString().split('T')[0],
      remarks: "",
      unitCost: it.unitPrice
    })));
    setShowGRNInspection(true);
  };

  const handleCompleteGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePO) return;
    try {
      const total = grnInspectionItems.reduce((sum, it) => sum + (it.acceptedQty * it.unitCost), 0);
      
      const grnItemsList = grnInspectionItems.map(it => ({
        ingredientId: it.ingredientId,
        acceptedQty: it.acceptedQty,
        rejectedQty: it.rejectedQty,
        damagedQty: it.damagedQty,
        returnedQty: it.returnedQty,
        remarks: it.remarks,
        expiryDate: new Date(it.expiryDate).getTime(),
        batchNumber: it.batchNumber,
        unitCost: it.unitCost
      }));

      await goodsReceiptEngine.createGoodsReceipt({
        purchaseOrderId: activePO.id,
        receivedDate: Date.now(),
        status: "completed",
        total,
        branchId: "MAIN_BRANCH"
      }, grnItemsList);

      setStatusMsg({ type: "success", text: "Goods Receipt Note completed and stock updated." });
      setShowGRNInspection(false);
      setActivePO(null);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.vendorId || paymentForm.amount <= 0) return;
    try {
      await vendorLedgerEngine.recordPayment(
        paymentForm.vendorId,
        paymentForm.amount,
        paymentForm.paymentMode,
        paymentForm.transactionNumber,
        paymentForm.notes
      );
      setStatusMsg({ type: "success", text: "Vendor payment logged successfully." });
      setPaymentForm({ vendorId: "", amount: 0, paymentMode: "upi", transactionNumber: "", notes: "" });
      setShowPaymentModal(false);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  // --- Handlers for Sprint 1 & 2 ---
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

  const handleSelectMenuItem = async (item: MenuItem) => {
    setSelectedMenuItem(item);
    const existing = await recipeEngine.getRecipeByItemVariant(item.id, recipeVariant);
    if (existing) {
      setBuilderYield(existing.yieldQuantity);
      setBuilderYieldUnit(existing.yieldUnitId);
      setBuilderCosts({
        packaging: existing.packagingCost,
        labour: existing.labourCost,
        overhead: existing.overheadCost
      });
      const items = await recipeEngine.getRecipeItems(existing.id);
      setBuilderItems(items.map(it => ({
        ingredientId: it.ingredientId,
        quantity: it.quantity,
        wastagePercent: it.wastagePercent
      })));
    } else {
      setBuilderYield(1);
      setBuilderItems([]);
      setBuilderCosts({ packaging: 0, labour: 0, overhead: 0 });
    }
    setActiveTab("recipe_builder");
  };

  const addIngredientToBuilder = (ingId: string) => {
    if (builderItems.some(it => it.ingredientId === ingId)) return;
    setBuilderItems([...builderItems, { ingredientId: ingId, quantity: 1, wastagePercent: 0 }]);
  };

  const removeIngredientFromBuilder = (ingId: string) => {
    setBuilderItems(builderItems.filter(it => it.ingredientId !== ingId));
  };

  const updateBuilderItem = (ingId: string, updates: Partial<{ quantity: number; wastagePercent: number }>) => {
    setBuilderItems(builderItems.map(it => it.ingredientId === ingId ? { ...it, ...updates } : it));
  };

  const computedCosts = useMemo(() => {
    if (!selectedMenuItem) return { raw: 0, total: 0, foodCost: 0, gp: 0 };
    
    const mockItems: RecipeItem[] = builderItems.map((it, idx) => {
      const ingDetail = ingredients.find(i => i.id === it.ingredientId);
      return {
        id: `mock_${idx}`,
        recipeId: "temp",
        ingredientId: it.ingredientId,
        quantity: it.quantity,
        wastagePercent: it.wastagePercent,
        sortOrder: idx,
        ingredientCostPrice: ingDetail?.costPrice || 0
      };
    });

    const mockRecipe: Recipe = {
      id: "temp",
      menuItemId: selectedMenuItem.id,
      variantId: recipeVariant,
      recipeName: selectedMenuItem.name,
      yieldQuantity: builderYield,
      yieldUnitId: builderYieldUnit,
      yieldPercent: 100,
      costPrice: 0,
      packagingCost: builderCosts.packaging,
      labourCost: builderCosts.labour,
      overheadCost: builderCosts.overhead,
      totalCost: 0,
      status: "active",
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      branchId: "MAIN_BRANCH"
    };

    const breakdown = CostCalculator.calculateCost(mockRecipe, mockItems, selectedMenuItem.price || 0);
    return {
      raw: breakdown.rawIngredientsCost,
      total: breakdown.totalCost,
      foodCost: breakdown.foodCostPercent,
      gp: breakdown.grossMarginPercent
    };
  }, [selectedMenuItem, builderItems, builderCosts, builderYield, builderYieldUnit, recipeVariant, ingredients]);

  const handleSaveRecipe = async () => {
    if (!selectedMenuItem) return;
    try {
      const existing = await recipeEngine.getRecipeByItemVariant(selectedMenuItem.id, recipeVariant);
      const recipeId = existing ? existing.id : `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const nextVersion = existing ? existing.version + 1 : 1;

      const recipeHeader: Recipe = {
        id: recipeId,
        menuItemId: selectedMenuItem.id,
        variantId: recipeVariant,
        recipeName: `${selectedMenuItem.name} (${recipeVariant})`,
        yieldQuantity: builderYield,
        yieldUnitId: builderYieldUnit,
        yieldPercent: 100,
        costPrice: computedCosts.raw,
        packagingCost: builderCosts.packaging,
        labourCost: builderCosts.labour,
        overheadCost: builderCosts.overhead,
        totalCost: computedCosts.total,
        status: "active",
        version: nextVersion,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        branchId: "MAIN_BRANCH"
      };

      const recipeItemsList: RecipeItem[] = builderItems.map((it, idx) => ({
        id: `ritem_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        recipeId,
        ingredientId: it.ingredientId,
        quantity: it.quantity,
        wastagePercent: it.wastagePercent,
        sortOrder: idx
      }));

      await recipeEngine.saveRecipe(recipeHeader, recipeItemsList);
      setStatusMsg({ type: "success", text: `Recipe for "${selectedMenuItem.name}" saved successfully.` });
      setSelectedMenuItem(null);
      setBuilderItems([]);
      setActiveTab("recipes");
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleLogWastage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wastageForm.recipeItemId || wastageForm.actualQty <= 0) return;
    try {
      const variance = wastageForm.actualQty - wastageForm.expectedQty;
      await recipeRepository.logWastage(
        wastageForm.recipeItemId,
        wastageForm.expectedQty,
        wastageForm.actualQty,
        variance
      );
      const rItems = await dbService.getAdapter().query("SELECT ingredientId FROM recipe_items WHERE id = ?", [wastageForm.recipeItemId]);
      if (rItems.length > 0) {
        await inventoryEngine.adjustStock(
          rItems[0].ingredientId,
          -variance,
          "Preparation Wastage Loss",
          "wastage"
        );
      }

      setStatusMsg({ type: "success", text: "Variance loss logged in ledger." });
      setWastageForm({ recipeItemId: "", expectedQty: 0, actualQty: 0 });
      setShowLogWastage(false);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const lowStockItems = ingredients.filter(i => i.stockQty <= i.minStock);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-fade-in text-brown-deep">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brown-deep flex items-center gap-2">
            <Package className="h-7 w-7 text-gold" />
            Restaurant ERP & Inventory
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage raw ingredient metrics, recipes costing, PO workflow, quality checking GRN logs, and statements ledger.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "vendors" && (
            <button
              onClick={() => setShowAddVendor(true)}
              className="px-4 py-2 bg-brown-deep text-gold rounded-lg font-medium text-sm hover:opacity-95 transition"
            >
              Add Vendor
            </button>
          )}
          {activeTab === "purchase_orders" && (
            <button
              onClick={() => setShowCreatePO(true)}
              className="px-4 py-2 bg-brown-deep text-gold rounded-lg font-medium text-sm hover:opacity-95 transition"
            >
              Create PO
            </button>
          )}
          {activeTab === "vendor_ledger" && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 bg-brown-deep text-gold rounded-lg font-medium text-sm hover:opacity-95 transition"
            >
              Record Payment
            </button>
          )}
          <button
            onClick={() => { setShowAdjust(true); }}
            className="px-4 py-2 bg-gold/10 text-brown-deep border border-gold/30 rounded-lg font-medium text-sm hover:bg-gold/20 transition"
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
            { id: "recipes", label: "Recipes Spool", icon: BookOpen },
            { id: "vendors", label: "Vendors List", icon: Users },
            { id: "purchase_orders", label: "Purchase Orders", icon: ShoppingBag },
            { id: "goods_receipts", label: "Goods Receipts (GRN)", icon: Truck },
            { id: "vendor_ledger", label: "Vendor Ledger", icon: Receipt },
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
            <div className="space-y-4 animate-fade-in">
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

          {/* Vendors Tab */}
          {activeTab === "vendors" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-brown-deep text-lg">Suppliers Directory</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {vendors.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 col-span-full">No vendors registered yet.</p>
                ) : (
                  vendors.map(v => (
                    <div key={v.id} className="bg-background border border-border/50 p-4 rounded-2xl flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-brown-deep">{v.name}</h4>
                          <span className="text-[10px] font-mono bg-gold/15 text-brown-deep px-1.5 py-0.5 rounded-md">{v.vendorCode}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{v.address}</p>
                      </div>
                      <div className="border-t border-border/30 pt-2 text-xs space-y-1">
                        <div><strong>Phone:</strong> {v.phone}</div>
                        <div><strong>GSTIN:</strong> {v.gst || "N/A"}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Purchase Orders Tab */}
          {activeTab === "purchase_orders" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-brown-deep text-lg">Purchase Order Tracking</h3>
              <div className="overflow-x-auto border border-border/50 rounded-xl bg-background/50">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted-foreground/5 text-muted-foreground border-b border-border/50">
                      <th className="p-3">PO Number</th>
                      <th className="p-3">Vendor</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Order Date</th>
                      <th className="p-3">Grand Total</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">No Purchase Orders registered yet.</td>
                      </tr>
                    ) : (
                      purchaseOrders.map(po => (
                        <tr key={po.id} className="border-b border-border/30 hover:bg-muted-foreground/5 text-xs">
                          <td className="p-3 font-mono font-bold text-brown-deep">{po.poNumber}</td>
                          <td className="p-3">{po.vendorName}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                              po.status === "completed" ? "bg-green-50 text-green-700 border border-green-200" :
                              po.status === "approved" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                              po.status === "draft" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                              "bg-destructive/10 text-destructive border border-destructive/20"
                            }`}>
                              {po.status}
                            </span>
                          </td>
                          <td className="p-3">{new Date(po.orderDate).toLocaleDateString()}</td>
                          <td className="p-3 font-bold text-brown-deep">₹{po.grandTotal.toFixed(2)}</td>
                          <td className="p-3 flex gap-2">
                            {po.status === "draft" && (
                              <button
                                onClick={() => handleApprovePO(po.id)}
                                className="text-green-700 font-bold hover:underline"
                              >
                                Approve
                              </button>
                            )}
                            {po.status === "approved" && (
                              <button
                                onClick={() => handleOpenGRNModal(po)}
                                className="text-blue-700 font-bold hover:underline"
                              >
                                Receive Goods
                              </button>
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

          {/* Goods Receipt (GRN) tab */}
          {activeTab === "goods_receipts" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-brown-deep text-lg">Goods Receipt Notes (GRN) Logs</h3>
              <div className="overflow-x-auto border border-border/50 rounded-xl bg-background/50">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted-foreground/5 text-muted-foreground border-b border-border/50">
                      <th className="p-3">GRN Number</th>
                      <th className="p-3">Received Date</th>
                      <th className="p-3">Total Value</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goodsReceipts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">No Goods Receipt Notes processed yet.</td>
                      </tr>
                    ) : (
                      goodsReceipts.map(g => (
                        <tr key={g.id} className="border-b border-border/30 hover:bg-muted-foreground/5 text-xs">
                          <td className="p-3 font-mono font-bold text-brown-deep">{g.grnNumber}</td>
                          <td className="p-3">{new Date(g.receivedDate).toLocaleDateString()} - {new Date(g.receivedDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                          <td className="p-3 font-black text-brown-deep">₹{g.total.toFixed(2)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-green-50 text-green-700 border border-green-200">
                              {g.status}
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

          {/* Vendor Ledger Tab */}
          {activeTab === "vendor_ledger" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-brown-deep text-lg">Accounts Payable Ledger</h3>
                <div className="flex gap-2">
                  <select
                    value={activeVendorId}
                    onChange={e => setActiveVendorId(e.target.value)}
                    className="rounded border border-border bg-background px-3 py-1.5 text-xs focus:outline-none"
                  >
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto border border-border/50 rounded-xl bg-background/50">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted-foreground/5 text-muted-foreground border-b border-border/50">
                      <th className="p-3">Time</th>
                      <th className="p-3">Posting Channel</th>
                      <th className="p-3">Credit (Inflow)</th>
                      <th className="p-3">Debit (Payment)</th>
                      <th className="p-3">Ledger Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVendorLedger.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">No ledger transactions posted yet.</td>
                      </tr>
                    ) : (
                      selectedVendorLedger.map(log => (
                        <tr key={log.id} className="border-b border-border/30 text-xs">
                          <td className="p-3 text-muted-foreground">
                            {new Date(log.timestamp).toLocaleDateString()} - {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="p-3 font-semibold capitalize text-brown-deep">{log.referenceType}</td>
                          <td className="p-3 text-green-700 font-bold">{log.credit > 0 ? `+₹${log.credit.toFixed(2)}` : "-"}</td>
                          <td className="p-3 text-red-700 font-bold">{log.debit > 0 ? `-₹${log.debit.toFixed(2)}` : "-"}</td>
                          <td className="p-3 font-black text-brown-deep">₹{log.balance.toFixed(2)}</td>
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

          {/* Recipes Tab */}
          {activeTab === "recipes" && (
            <div className="space-y-4">
              <h3 className="font-bold text-brown-deep text-lg">Dish Recipe Cost Matrix</h3>
              <div className="overflow-x-auto border border-border/50 rounded-xl bg-background/50">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted-foreground/5 text-muted-foreground border-b border-border/50">
                      <th className="p-3">Recipe Name</th>
                      <th className="p-3">Size Variant</th>
                      <th className="p-3">Yield Count</th>
                      <th className="p-3">Overhead Costs</th>
                      <th className="p-3">Total Cost</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No recipes created yet. Launch the Recipe Builder to configure.
                        </td>
                      </tr>
                    ) : (
                      recipes.map(rec => (
                        <tr key={rec.id} className="border-b border-border/30 hover:bg-muted-foreground/5 text-xs">
                          <td className="p-3 font-semibold text-brown-deep">{rec.recipeName}</td>
                          <td className="p-3 capitalize font-bold text-gold">{rec.variantId}</td>
                          <td className="p-3">{rec.yieldQuantity} units</td>
                          <td className="p-3">₹{(rec.packagingCost + rec.labourCost + rec.overheadCost).toFixed(2)}</td>
                          <td className="p-3 font-black text-brown-deep">₹{(rec.totalCost || 0).toFixed(2)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-green-50 text-green-700 border border-green-200">
                              {rec.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => {
                                const menuItem = MENU.find(m => m.id === rec.menuItemId);
                                if (menuItem) {
                                  setRecipeVariant(rec.variantId);
                                  handleSelectMenuItem(menuItem);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-brown-deep font-bold hover:underline"
                            >
                              <Edit3 className="h-3 w-3" /> Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recipe Builder */}
          {activeTab === "recipe_builder" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1 border-r border-border/40 pr-4 space-y-3">
                <h4 className="font-bold text-brown-deep text-sm">Select Menu Item</h4>
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                  {MENU.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectMenuItem(item)}
                      className={`w-full text-left p-3 rounded-xl border transition flex justify-between items-center ${
                        selectedMenuItem?.id === item.id 
                          ? "bg-gold/10 border-gold text-brown-deep" 
                          : "border-border/50 hover:bg-muted-foreground/5"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs text-brown-deep">{item.name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{item.category} | ₹{item.price || 99}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-1 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-brown-deep text-sm">Ingredients Spool List</h4>
                  {selectedMenuItem && (
                    <select
                      value={recipeVariant}
                      onChange={e => setRecipeVariant(e.target.value)}
                      className="rounded border border-border bg-background px-2 py-0.5 text-xs text-brown-deep focus:outline-none"
                    >
                      <option value="default">Default Variant</option>
                      <option value="half">Half Portion</option>
                      <option value="full">Full Portion</option>
                      <option value="family">Family Pack</option>
                    </select>
                  )}
                </div>

                {selectedMenuItem ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted-foreground/5 rounded-xl border border-border/50 text-xs text-brown-deep">
                      Designing recipe for: <strong className="text-gold">{selectedMenuItem.name}</strong>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block">Quick Add Raw Materials</label>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto border border-border/40 p-2 rounded-xl bg-background/50">
                        {ingredients.map(ing => (
                          <button
                            key={ing.id}
                            type="button"
                            onClick={() => addIngredientToBuilder(ing.id)}
                            className="px-2.5 py-1 bg-background hover:bg-gold/10 text-[10px] border border-border/60 text-brown-deep rounded-lg font-medium transition"
                          >
                            + {ing.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {builderItems.map(item => {
                        const detail = ingredients.find(i => i.id === item.ingredientId);
                        return (
                          <div key={item.ingredientId} className="p-3 rounded-xl border border-border/40 bg-background/40 space-y-2 text-xs">
                            <div className="flex justify-between items-center font-semibold text-brown-deep">
                              <span>{detail?.name}</span>
                              <button
                                type="button"
                                onClick={() => removeIngredientFromBuilder(item.ingredientId)}
                                className="text-destructive hover:underline font-bold text-[10px]"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-0.5">
                                <label className="text-[9px] uppercase font-bold text-muted-foreground">Qty ({detail?.unitSymbol})</label>
                                <input
                                  type="number"
                                  min="0.001"
                                  step="0.001"
                                  value={item.quantity}
                                  onChange={e => updateBuilderItem(item.ingredientId, { quantity: Number(e.target.value) })}
                                  className="w-full rounded border border-border px-2 py-0.5 text-xs text-brown-deep"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <label className="text-[9px] uppercase font-bold text-muted-foreground">Waste %</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.wastagePercent}
                                  onChange={e => updateBuilderItem(item.ingredientId, { wastagePercent: Number(e.target.value) })}
                                  className="w-full rounded border border-border px-2 py-0.5 text-xs text-brown-deep"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-12">Please select a menu dish from the left column first.</p>
                )}
              </div>

              <div className="lg:col-span-1 bg-background/30 border border-border/40 p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-brown-deep text-sm">Recipe Margin cost summary</h4>
                {selectedMenuItem && (
                  <div className="space-y-4 text-xs">
                    <div className="flex justify-between font-bold text-brown-deep">
                      <span>Total Cost Price</span>
                      <span>₹{computedCosts.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Food Cost %</span>
                      <span className={computedCosts.foodCost > 35 ? "text-destructive font-black" : "text-green-700"}>
                        {computedCosts.foodCost.toFixed(1)}%
                      </span>
                    </div>
                    <button
                      onClick={handleSaveRecipe}
                      className="w-full py-2.5 bg-brown-deep text-gold rounded-xl hover:opacity-95 transition font-bold uppercase text-xs"
                    >
                      Save Recipe Configuration
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wastage tab */}
          {activeTab === "wastage" && (
            <div className="space-y-4">
              <h3 className="font-bold text-brown-deep text-lg">Preparation Wastage Logs</h3>
              <div className="overflow-x-auto border border-border/50 rounded-xl bg-background/50">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted-foreground/5 text-muted-foreground border-b border-border/50">
                      <th className="p-3">Time</th>
                      <th className="p-3">Ingredient</th>
                      <th className="p-3">Expected Qty</th>
                      <th className="p-3">Actual Qty</th>
                      <th className="p-3">Wastage Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wastageLogs.map(w => (
                      <tr key={w.id} className="border-b border-border/30 text-xs">
                        <td className="p-3 text-muted-foreground">{new Date(w.timestamp).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold text-brown-deep">{w.ingredientName}</td>
                        <td className="p-3">{w.expectedQty} {w.unitSymbol}</td>
                        <td className="p-3">{w.actualQty} {w.unitSymbol}</td>
                        <td className="p-3 text-destructive font-black">+{w.variance.toFixed(2)} loss</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- Dialog Modals --- */}

      {/* 1. Add Vendor Modal */}
      {showAddVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleAddVendor} className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-gold" /> Add Vendor Profile
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="space-y-1">
                <label className="font-bold">Vendor Code *</label>
                <input
                  type="text"
                  required
                  value={newVendor.vendorCode}
                  onChange={e => setNewVendor({ ...newVendor, vendorCode: e.target.value })}
                  placeholder="e.g. VEND-AMUL-01"
                  className="w-full px-2 py-1.5 border border-border bg-background rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold">Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={newVendor.name}
                  onChange={e => setNewVendor({ ...newVendor, name: e.target.value })}
                  placeholder="e.g. Amul Dairy Pvt Ltd"
                  className="w-full px-2 py-1.5 border border-border bg-background rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold">GSTIN</label>
                <input
                  type="text"
                  value={newVendor.gst}
                  onChange={e => setNewVendor({ ...newVendor, gst: e.target.value })}
                  className="w-full px-2 py-1.5 border border-border bg-background rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold">Phone Number</label>
                <input
                  type="text"
                  value={newVendor.phone}
                  onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })}
                  className="w-full px-2 py-1.5 border border-border bg-background rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold">Address</label>
                <input
                  type="text"
                  value={newVendor.address}
                  onChange={e => setNewVendor({ ...newVendor, address: e.target.value })}
                  className="w-full px-2 py-1.5 border border-border bg-background rounded-lg focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowAddVendor(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg hover:bg-muted-foreground/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg hover:opacity-95"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Create Purchase Order Modal */}
      {showCreatePO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleSavePO} className="bg-card border border-border p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-gold" /> Compose Purchase Order
            </h3>
            
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="space-y-1">
                <label className="font-bold">Select Vendor *</label>
                <select
                  required
                  value={poForm.vendorId}
                  onChange={e => setPoForm({ ...poForm, vendorId: e.target.value })}
                  className="w-full px-2 py-1.5 border border-border bg-background rounded-lg focus:outline-none"
                >
                  <option value="">Choose Supplier</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold">Expected Delivery Date</label>
                <input
                  type="date"
                  onChange={e => setPoForm({ ...poForm, expectedDate: new Date(e.target.value).getTime() })}
                  className="w-full px-2 py-1.5 border border-border bg-background rounded-lg focus:outline-none"
                />
              </div>
            </div>

            {/* Quick items adder */}
            <div className="space-y-2 text-xs">
              <label className="font-bold block">Quick Add Raw Materials</label>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto border p-2 rounded bg-background/50">
                {ingredients.map(ing => (
                  <button
                    key={ing.id}
                    type="button"
                    onClick={() => handleAddPOItem(ing.id)}
                    className="px-2 py-0.5 bg-background hover:bg-gold/10 border text-[10px] rounded transition"
                  >
                    + {ing.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Items grid */}
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 text-xs">
              {poFormItems.map(item => {
                const detail = ingredients.find(i => i.id === item.ingredientId);
                return (
                  <div key={item.ingredientId} className="flex gap-2 items-center bg-background/50 p-2 rounded border border-border/40">
                    <span className="font-semibold flex-1 truncate">{detail?.name}</span>
                    <input
                      type="number"
                      required
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={e => updatePOItem(item.ingredientId, { quantity: Number(e.target.value) })}
                      className="w-16 rounded border px-1.5 py-0.5"
                    />
                    <input
                      type="number"
                      required
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={e => updatePOItem(item.ingredientId, { unitPrice: Number(e.target.value) })}
                      className="w-20 rounded border px-1.5 py-0.5"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowCreatePO(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg hover:bg-muted-foreground/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg hover:opacity-95"
              >
                Save PO Draft
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. GRN Inspection Modal */}
      {showGRNInspection && activePO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleCompleteGRN} className="bg-card border border-border p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-gold" /> Receive Delivery for {activePO.poNumber}
            </h3>
            
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
              {grnInspectionItems.map((item, idx) => {
                const detail = ingredients.find(i => i.id === item.ingredientId);
                return (
                  <div key={item.ingredientId} className="bg-background/40 border p-3 rounded-xl space-y-2">
                    <div className="font-bold flex justify-between">
                      <span>{detail?.name}</span>
                      <span className="text-muted-foreground font-mono">Ordered: {activePOItems[idx]?.quantity} | Received: {activePOItems[idx]?.receivedQty}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-muted-foreground block">Accepted Qty</label>
                        <input
                          type="number"
                          value={item.acceptedQty}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setGrnInspectionItems(grnInspectionItems.map(it => it.ingredientId === item.ingredientId ? { ...it, acceptedQty: val } : it));
                          }}
                          className="w-full rounded border px-1.5 py-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-muted-foreground block">Rejected Qty</label>
                        <input
                          type="number"
                          value={item.rejectedQty}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setGrnInspectionItems(grnInspectionItems.map(it => it.ingredientId === item.ingredientId ? { ...it, rejectedQty: val } : it));
                          }}
                          className="w-full rounded border px-1.5 py-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-muted-foreground block">Batch Code</label>
                        <input
                          type="text"
                          value={item.batchNumber}
                          onChange={e => {
                            setGrnInspectionItems(grnInspectionItems.map(it => it.ingredientId === item.ingredientId ? { ...it, batchNumber: e.target.value } : it));
                          }}
                          className="w-full rounded border px-1.5 py-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-muted-foreground block">Expiry Date</label>
                        <input
                          type="date"
                          value={item.expiryDate}
                          onChange={e => {
                            setGrnInspectionItems(grnInspectionItems.map(it => it.ingredientId === item.ingredientId ? { ...it, expiryDate: e.target.value } : it));
                          }}
                          className="w-full rounded border px-1.5 py-0.5"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => { setShowGRNInspection(false); setActivePO(null); }}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg hover:bg-muted-foreground/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg hover:opacity-95"
              >
                Confirm Receipts (Complete GRN)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Record Vendor Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleRecordPayment} className="bg-card border border-border p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-gold" /> Log Vendor Payment
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold">Select Vendor *</label>
                <select
                  required
                  value={paymentForm.vendorId}
                  onChange={e => setPaymentForm({ ...paymentForm, vendorId: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border/60 rounded-lg text-brown-deep focus:outline-none"
                >
                  <option value="">Choose Supplier</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5 col-span-2">
                  <label className="font-bold">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={paymentForm.amount || ""}
                    onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border/60 rounded-lg text-brown-deep focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold">Payment Mode</label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={e => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border/60 rounded-lg focus:outline-none"
                >
                  <option value="cash">Cash Payment</option>
                  <option value="upi">UPI Transfer</option>
                  <option value="bank_transfer">Bank NEFT/RTGS</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold">Reference / Transaction Number</label>
                <input
                  type="text"
                  value={paymentForm.transactionNumber}
                  onChange={e => setPaymentForm({ ...paymentForm, transactionNumber: e.target.value })}
                  placeholder="e.g. UTR / Txn ID"
                  className="w-full px-3 py-2 bg-background border border-border/60 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg hover:bg-muted-foreground/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg hover:opacity-95"
              >
                Post Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sprint 1 & 2 Dialog Modals */}
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
                <label className="text-xs font-bold uppercase text-muted-foreground">Reorder Limit</label>
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

      {showAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleAdjustStock} className="bg-card border border-border p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-gold" /> Log Stock Adjustment
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold">Select Ingredient *</label>
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
                <label className="font-bold">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjForm({ ...adjForm, type: "in" })}
                    className={`py-1.5 rounded-lg border font-bold text-[10px] uppercase transition ${
                      adjForm.type === "in" 
                        ? "bg-green-50 border-green-300 text-green-700" 
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    IN
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjForm({ ...adjForm, type: "out" })}
                    className={`py-1.5 rounded-lg border font-bold text-[10px] uppercase transition ${
                      adjForm.type === "out" 
                        ? "bg-red-50 border-red-300 text-red-700" 
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    OUT
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Quantity *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={adjForm.adjustQty || ""}
                  onChange={e => setAdjForm({ ...adjForm, adjustQty: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-border/60 rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Reason</label>
                <input
                  type="text"
                  value={adjForm.reason}
                  onChange={e => setAdjForm({ ...adjForm, reason: e.target.value })}
                  placeholder="e.g. Audit, expired, damage"
                  className="w-full px-3 py-2 bg-background border border-border/60 rounded-lg focus:outline-none"
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
