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
import { attendanceEngine, Staff } from "@/modules/operations/services/AttendanceEngine";
import { shiftEngine, Shift } from "@/modules/operations/services/ShiftEngine";
import dbService from "@/core/database/DatabaseService";
import { 
  Package, Tags, Scale, Plus, RefreshCw, AlertTriangle, 
  History, Settings, ShieldAlert, ArrowUpRight, ArrowDownRight, 
  BookOpen, Edit3, Trash2, Check, Percent, FileText, Users, ShoppingBag, Truck, Receipt, Calendar, Key, Lock, Unlock, Landmark, CreditCard 
} from "lucide-react";
import logger from "@/services/logger/Logger";

export const Route = createFileRoute("/admin/erp")({
  component: ErpDashboardPage,
});

type ErpTab = "ingredients" | "categories" | "units" | "recipes" | "recipe_builder" | "wastage" | "vendors" | "purchase_orders" | "goods_receipts" | "vendor_ledger" | "attendance" | "shift_manager" | "cash_drawer" | "expenses" | "daily_closing" | "ledger" | "reorders";

function ErpDashboardPage() {
  const [activeTab, setActiveTab] = useState<ErpTab>("ingredients");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // --- Sprint 1 & 2 Datasets ---
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [units, setUnits] = useState<MeasurementUnit[]>([]);
  const [ledger, setLedger] = useState<StockMovement[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  const [wastageLogs, setWastageLogs] = useState<any[]>([]);

  // --- Sprint 3 Datasets ---
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [selectedVendorLedger, setSelectedVendorLedger] = useState<any[]>([]);
  const [activeVendorId, setActiveVendorId] = useState("");

  // --- Sprint 4 Datasets ---
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [cashMovements, setCashMovements] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseCats, setExpenseCats] = useState<any[]>([]);

  // Modal Dialogs
  const [showAddIng, setShowAddIng] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showLogWastage, setShowLogWastage] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [showGRNInspection, setShowGRNInspection] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Keypad PIN entry
  const [pinEntry, setPinEntry] = useState("");
  const [matchedStaff, setMatchedStaff] = useState<Staff | null>(null);
  const [activeAttId, setActiveAttId] = useState("");

  // Forms
  const [newIng, setNewIng] = useState({ name: "", sku: "", categoryId: "", unitId: "", minStock: 0, costPrice: 0, openingStock: 0 });
  const [newCatName, setNewCatName] = useState("");
  const [newUnit, setNewUnit] = useState({ name: "", symbol: "" });
  const [adjForm, setAdjForm] = useState({ ingredientId: "", adjustQty: 0, reason: "", type: "in" });
  const [wastageForm, setWastageForm] = useState({ recipeItemId: "", expectedQty: 0, actualQty: 0 });
  const [newVendor, setNewVendor] = useState({ vendorCode: "", name: "", phone: "", email: "", gst: "", pan: "", address: "", paymentTerms: 30 });
  const [poForm, setPoForm] = useState({ vendorId: "", notes: "", expectedDate: Date.now() + 86400000 * 3 });
  const [poFormItems, setPoFormItems] = useState<Array<{ ingredientId: string; quantity: number; unitPrice: number }>>([]);
  const [activePO, setActivePO] = useState<PurchaseOrder | null>(null);
  const [activePOItems, setActivePOItems] = useState<PurchaseOrderItem[]>([]);
  const [grnInspectionItems, setGrnInspectionItems] = useState<Array<{ ingredientId: string; acceptedQty: number; rejectedQty: number; damagedQty: number; returnedQty: number; batchNumber: string; expiryDate: string; remarks: string; unitCost: number }>>([]);
  const [paymentForm, setPaymentForm] = useState({ vendorId: "", amount: 0, paymentMode: "upi", transactionNumber: "", notes: "" });
  
  // Sprint 4 forms
  const [openShiftForm, setOpenShiftForm] = useState({ openedBy: "Head Cashier", float: 2000, notes: "" });
  const [closeShiftForm, setCloseShiftForm] = useState({ closedBy: "Head Cashier", actualFloat: 0, notes: "" });
  const [expenseForm, setExpenseForm] = useState({ category: "", amount: 0, description: "", paymentMode: "cash" });

  // Recipe Builder
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
      
      // Sprint 4
      const staff = await attendanceEngine.getStaffList();
      const atts = await attendanceEngine.getAttendanceLogs();
      const activeS = await shiftEngine.getActiveShift();
      const ecats = await dbService.getAdapter().query("SELECT * FROM expense_categories");
      const exps = await dbService.getAdapter().query("SELECT * FROM expenses ORDER BY timestamp DESC");

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
      setStaffList(staff);
      setAttendanceLogs(atts);
      setActiveShift(activeS);
      setExpenseCats(ecats);
      setExpenses(exps);

      if (activeS) {
        const cmovs = await shiftEngine.getCashDrawerMovements(activeS.id);
        setCashMovements(cmovs);
        setCloseShiftForm(prev => ({ ...prev, actualFloat: activeS.expectedClosing }));
      }

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
      setStatusMsg({ type: "error", text: "Failed loading inventory and operational records." });
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

  // --- Sprint 4 Handlers ---
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const match = await attendanceEngine.pinLogin(pinEntry);
      if (match) {
        setMatchedStaff(match);
        // Find existing attendance checkin for today
        const log = attendanceLogs.find(a => a.staffId === match.id && !a.checkOut);
        if (log) {
          setActiveAttId(log.id);
        } else {
          setActiveAttId("");
        }
        setStatusMsg({ type: "success", text: `Authenticated: Welcome ${match.name}.` });
      } else {
        setStatusMsg({ type: "error", text: "Invalid PIN Code." });
        setMatchedStaff(null);
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    } finally {
      setPinEntry("");
    }
  };

  const handleClockIn = async () => {
    if (!matchedStaff || !activeShift) {
      setStatusMsg({ type: "error", text: "An active shift must be open to clock in." });
      return;
    }
    try {
      await attendanceEngine.checkIn(matchedStaff.id, activeShift.id);
      setStatusMsg({ type: "success", text: "Staff checked in successfully." });
      setMatchedStaff(null);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleClockOut = async () => {
    if (!activeAttId) return;
    try {
      await attendanceEngine.checkOut(activeAttId);
      setStatusMsg({ type: "success", text: "Staff checked out successfully." });
      setMatchedStaff(null);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleStartBreak = async () => {
    if (!activeAttId) return;
    try {
      await attendanceEngine.startBreak(activeAttId);
      setStatusMsg({ type: "success", text: "Break clocked started." });
      setMatchedStaff(null);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleEndBreak = async () => {
    if (!activeAttId) return;
    try {
      await attendanceEngine.endBreak(activeAttId);
      setStatusMsg({ type: "success", text: "Break clocked ended." });
      setMatchedStaff(null);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleOpenShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await shiftEngine.openShift(
        openShiftForm.openedBy,
        openShiftForm.float,
        undefined,
        "POS-TERM-01",
        openShiftForm.notes
      );
      setStatusMsg({ type: "success", text: "Shift opened successfully." });
      setShowOpenShift(false);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    try {
      await shiftEngine.closeShift(
        activeShift.id,
        closeShiftForm.closedBy,
        closeShiftForm.actualFloat,
        closeShiftForm.notes
      );
      setStatusMsg({ type: "success", text: "Shift closed successfully." });
      setShowCloseShift(false);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) {
      setStatusMsg({ type: "error", text: "An active shift must be open to record expenses." });
      return;
    }
    try {
      const expId = `exp_${Date.now()}`;
      await dbService.getAdapter().execute(
        `INSERT INTO expenses (id, category, description, amount, paymentMode, shiftId, status, timestamp, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [expId, expenseForm.category, expenseForm.description, expenseForm.amount, expenseForm.paymentMode, activeShift.id, "approved", Date.now(), "MAIN_BRANCH"]
      );

      // Record cash movement if paid with cash
      if (expenseForm.paymentMode === "cash") {
        await shiftEngine.recordCashMovement(
          activeShift.id,
          "Expense",
          expenseForm.amount,
          `Expense: ${expenseForm.description}`,
          "expense",
          expId,
          activeShift.openedBy
        );
      }

      setStatusMsg({ type: "success", text: "Expense recorded successfully." });
      setExpenseForm({ category: "", amount: 0, description: "", paymentMode: "cash" });
      setShowAddExpense(false);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

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
      const grandTotal = subtotal;
      
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

  const removeIngredientFromBuilder = (ingId: string) => {
    setBuilderItems(builderItems.filter(it => it.ingredientId !== ingId));
  };

  const updateBuilderItem = (ingId: string, updates: Partial<{ quantity: number; wastagePercent: number }>) => {
    setBuilderItems(builderItems.map(it => it.ingredientId === ingId ? { ...it, ...updates } : it));
  };

  const lowStockItems = ingredients.filter(i => i.stockQty <= i.minStock);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-fade-in text-brown-deep">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brown-deep flex items-center gap-2">
            <Package className="h-7 w-7 text-gold" />
            Restaurant ERP & Operations Hub
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage raw ingredient metrics, recipes costing, PO workflow, shifts, cash reconciliations and expenses.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "shift_manager" && !activeShift && (
            <button
              onClick={() => setShowOpenShift(true)}
              className="px-4 py-2 bg-brown-deep text-gold rounded-lg font-medium text-sm hover:opacity-95 transition"
            >
              Open Shift
            </button>
          )}
          {activeTab === "shift_manager" && activeShift && (
            <button
              onClick={() => setShowCloseShift(true)}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium text-sm hover:opacity-95 transition"
            >
              Close Shift
            </button>
          )}
          {activeTab === "expenses" && (
            <button
              onClick={() => setShowAddExpense(true)}
              className="px-4 py-2 bg-brown-deep text-gold rounded-lg font-medium text-sm hover:opacity-95 transition"
            >
              Add Expense
            </button>
          )}
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
            { id: "recipes", label: "Recipes Spool", icon: BookOpen },
            { id: "vendors", label: "Vendors List", icon: Users },
            { id: "purchase_orders", label: "Purchase Orders", icon: ShoppingBag },
            { id: "goods_receipts", label: "Goods Receipts (GRN)", icon: Truck },
            { id: "vendor_ledger", label: "Vendor Ledger", icon: Receipt },
            { id: "attendance", label: "Attendance Clock", icon: Calendar },
            { id: "shift_manager", label: "Shift Manager", icon: Key },
            { id: "cash_drawer", label: "Cash Drawer", icon: Landmark },
            { id: "expenses", label: "Expenses List", icon: CreditCard },
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
                      <th className="p-3">Stock Qty</th>
                      <th className="p-3">Cost Price</th>
                      <th className="p-3">Reorder Alert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">No ingredients found. Add one to get started.</td>
                      </tr>
                    ) : (
                      ingredients.map(ing => (
                        <tr key={ing.id} className="border-b border-border/30 hover:bg-muted-foreground/5">
                          <td className="p-3 font-mono text-xs">{ing.sku}</td>
                          <td className="p-3 font-semibold text-brown-deep">{ing.name}</td>
                          <td className="p-3 font-bold">
                            <span className={ing.stockQty <= ing.minStock ? "text-destructive font-black" : "text-muted-foreground"}>
                              {ing.stockQty} {ing.unitSymbol}
                            </span>
                          </td>
                          <td className="p-3">₹{(ing.costPrice || 0).toFixed(2)}</td>
                          <td className="p-3">
                            {ing.stockQty <= ing.minStock ? (
                              <span className="px-2 py-0.5 text-xs font-bold bg-destructive/10 text-destructive rounded-full border border-destructive/20">Low Stock</span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full border border-green-200">Adequate</span>
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

          {/* Attendance tab (Sprint 4 Keypad Addition) */}
          {activeTab === "attendance" && (
            <div className="grid gap-6 md:grid-cols-2 animate-fade-in text-xs">
              <div className="space-y-4">
                <h3 className="font-bold text-brown-deep text-lg">Staff PIN Authentication</h3>
                
                <form onSubmit={handlePinSubmit} className="max-w-xs space-y-3">
                  <div className="relative">
                    <input
                      type="password"
                      maxLength={4}
                      value={pinEntry}
                      onChange={e => setPinEntry(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter 4-Digit PIN Code"
                      className="w-full text-center tracking-widest text-lg font-bold border border-border rounded-xl py-3 px-3 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                    />
                  </div>
                  
                  {/* Numeric Keypad grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => pinEntry.length < 4 && setPinEntry(pinEntry + num)}
                        className="py-3 bg-muted hover:bg-gold/15 text-brown-deep font-black text-sm rounded-xl transition border border-border/30"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPinEntry("")}
                      className="py-3 bg-destructive/10 text-destructive font-bold rounded-xl"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => pinEntry.length < 4 && setPinEntry(pinEntry + 0)}
                      className="py-3 bg-muted text-brown-deep font-black text-sm rounded-xl transition border"
                    >
                      0
                    </button>
                    <button
                      type="submit"
                      className="py-3 bg-brown-deep text-gold font-bold rounded-xl"
                    >
                      Enter
                    </button>
                  </div>
                </form>

                {matchedStaff && (
                  <div className="p-4 bg-muted/30 border border-gold/30 rounded-2xl max-w-xs space-y-3 text-brown-deep animate-fade-up">
                    <div className="font-bold">Staff: {matchedStaff.name} ({matchedStaff.role})</div>
                    <div className="flex gap-2">
                      {!activeAttId ? (
                        <button
                          onClick={handleClockIn}
                          className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg hover:opacity-95"
                        >
                          Clock In
                        </button>
                      ) : (
                        <div className="w-full space-y-2">
                          <button
                            onClick={handleClockOut}
                            className="w-full py-2 bg-destructive text-destructive-foreground font-bold rounded-lg hover:opacity-95"
                          >
                            Clock Out
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={handleStartBreak}
                              className="py-1.5 bg-amber-500 text-white font-bold rounded-lg"
                            >
                              Start Break
                            </button>
                            <button
                              onClick={handleEndBreak}
                              className="py-1.5 bg-blue-500 text-white font-bold rounded-lg"
                            >
                              End Break
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-brown-deep text-lg">Today's Timeline Logs</h3>
                <div className="overflow-y-auto max-h-[400px] border border-border/50 rounded-xl bg-background/50 pr-1">
                  {attendanceLogs.length === 0 ? (
                    <p className="text-muted-foreground p-6 text-center">No clock-ins recorded today.</p>
                  ) : (
                    attendanceLogs.map(log => (
                      <div key={log.id} className="p-3 border-b border-border/40 hover:bg-muted-foreground/5 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-brown-deep text-xs">{log.staffName}</div>
                          <span className="text-[10px] text-muted-foreground">{log.staffRole}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-green-700">IN: {new Date(log.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                          {log.checkOut && (
                            <div className="text-[10px] font-bold text-destructive">OUT: {new Date(log.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Shift Manager Tab */}
          {activeTab === "shift_manager" && (
            <div className="space-y-4 animate-fade-in text-xs">
              <h3 className="font-bold text-brown-deep text-lg">Daily cashier shifts</h3>
              
              {activeShift ? (
                <div className="bg-background/45 border p-5 rounded-2xl max-w-md space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <div>
                      <h4 className="font-bold text-brown-deep text-sm">{activeShift.shiftName}</h4>
                      <span className="text-[10px] text-muted-foreground">Opened by {activeShift.openedBy} at {new Date(activeShift.openingTime).toLocaleTimeString()}</span>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-bold bg-green-50 text-green-700 border border-green-200 rounded">OPEN</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block">Opening Float</label>
                      <div className="text-lg font-bold text-brown-deep">₹{activeShift.openingFloat.toFixed(2)}</div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block">Expected closing</label>
                      <div className="text-lg font-bold text-gold">₹{activeShift.expectedClosing.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-background/50 rounded-2xl max-w-md border border-border/40">
                  <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground font-semibold">Cashier drawer float is locked. Please open a shift to begin billing.</p>
                </div>
              )}
            </div>
          )}

          {/* Cash Drawer movements tab */}
          {activeTab === "cash_drawer" && (
            <div className="space-y-4 animate-fade-in text-xs">
              <h3 className="font-bold text-brown-deep text-lg">Safe Drops & movements ledger</h3>
              <div className="overflow-x-auto border border-border/50 rounded-xl bg-background/50">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted-foreground/5 text-muted-foreground border-b border-border/50">
                      <th className="p-3">Time</th>
                      <th className="p-3">Action Type</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Operator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashMovements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">No cash movements recorded in this shift.</td>
                      </tr>
                    ) : (
                      cashMovements.map(mov => (
                        <tr key={mov.id} className="border-b border-border/30 text-xs">
                          <td className="p-3 text-muted-foreground">{new Date(mov.timestamp).toLocaleTimeString()}</td>
                          <td className="p-3 font-semibold text-brown-deep">{mov.movementType}</td>
                          <td className="p-3 font-bold text-gold">₹{mov.amount.toFixed(2)}</td>
                          <td className="p-3 text-muted-foreground">{mov.reason}</td>
                          <td className="p-3 font-semibold text-muted-foreground">{mov.performedBy}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expenses tab */}
          {activeTab === "expenses" && (
            <div className="space-y-4 animate-fade-in text-xs">
              <h3 className="font-bold text-brown-deep text-lg">Expenses list logs</h3>
              <div className="overflow-x-auto border border-border/50 rounded-xl bg-background/50">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted-foreground/5 text-muted-foreground border-b border-border/50">
                      <th className="p-3">Time</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Mode</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">No expenses recorded yet.</td>
                      </tr>
                    ) : (
                      expenses.map(exp => (
                        <tr key={exp.id} className="border-b border-border/30 text-xs">
                          <td className="p-3 text-muted-foreground">{new Date(exp.timestamp).toLocaleDateString()}</td>
                          <td className="p-3 font-semibold text-brown-deep">{exp.category}</td>
                          <td className="p-3 text-muted-foreground">{exp.description}</td>
                          <td className="p-3 uppercase">{exp.paymentMode}</td>
                          <td className="p-3 font-black text-brown-deep">₹{exp.amount.toFixed(2)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 font-bold uppercase rounded bg-green-50 text-green-700 border border-green-200">
                              {exp.status}
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

          {/* Sprint 2 Recipes Tab */}
          {activeTab === "recipes" && (
            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-brown-deep text-lg">Dish Recipe Cost Matrix</h3>
              <div className="overflow-x-auto border border-border/50 rounded-xl bg-background/50">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted-foreground/5 text-muted-foreground border-b border-border/50">
                      <th className="p-3">Recipe Name</th>
                      <th className="p-3">Size Variant</th>
                      <th className="p-3">Yield Count</th>
                      <th className="p-3">Total Cost</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipes.map(rec => (
                      <tr key={rec.id} className="border-b border-border/30 hover:bg-muted-foreground/5">
                        <td className="p-3 font-semibold text-brown-deep">{rec.recipeName}</td>
                        <td className="p-3 capitalize font-bold text-gold">{rec.variantId}</td>
                        <td className="p-3">{rec.yieldQuantity} units</td>
                        <td className="p-3 font-black text-brown-deep">₹{(rec.totalCost || 0).toFixed(2)}</td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              const menuItem = MENU.find(m => m.id === rec.menuItemId);
                              if (menuItem) {
                                setRecipeVariant(rec.variantId);
                                handleSelectMenuItem(menuItem);
                              }
                            }}
                            className="text-brown-deep font-bold hover:underline"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
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
                </div>

                {selectedMenuItem && (
                  <div className="space-y-4 text-xs">
                    <div className="p-3 bg-muted-foreground/5 rounded-xl border border-border/50 text-xs text-brown-deep">
                      Designing recipe for: <strong className="text-gold">{selectedMenuItem.name}</strong>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block">Quick Add Raw Materials</label>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto border p-2 rounded bg-background/50">
                        {ingredients.map(ing => (
                          <button
                            key={ing.id}
                            type="button"
                            onClick={() => addIngredientToBuilder(ing.id)}
                            className="px-2.5 py-1 bg-background hover:bg-gold/10 text-[10px] border text-brown-deep rounded-lg font-medium transition"
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
                          <div key={item.ingredientId} className="p-3 rounded-xl border bg-background/40 space-y-2 text-xs">
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
                              <input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={item.quantity}
                                onChange={e => updateBuilderItem(item.ingredientId, { quantity: Number(e.target.value) })}
                                className="w-full rounded border px-2 py-0.5 text-xs text-brown-deep"
                              />
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.wastagePercent}
                                onChange={e => updateBuilderItem(item.ingredientId, { wastagePercent: Number(e.target.value) })}
                                className="w-full rounded border px-2 py-0.5 text-xs text-brown-deep"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-1 bg-background/30 border border-border/40 p-4 rounded-xl space-y-4 text-xs">
                <h4 className="font-bold text-brown-deep text-sm">Recipe Margin cost summary</h4>
                {selectedMenuItem && (
                  <div className="space-y-4">
                    <div className="flex justify-between font-bold text-brown-deep">
                      <span>Total Cost Price</span>
                      <span>₹{computedCosts.total.toFixed(2)}</span>
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

          {/* Vendors Tab */}
          {activeTab === "vendors" && (
            <div className="space-y-4 animate-fade-in text-xs">
              <h3 className="font-bold text-brown-deep text-lg">Suppliers Directory</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {vendors.map(v => (
                  <div key={v.id} className="bg-background border border-border/50 p-4 rounded-2xl flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-brown-deep">{v.name}</h4>
                        <span className="text-[10px] font-mono bg-gold/15 text-brown-deep px-1.5 py-0.5 rounded-md">{v.vendorCode}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{v.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- Dialog Modals --- */}

      {/* 1. Open Shift Modal */}
      {showOpenShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleOpenShiftSubmit} className="bg-card border border-border p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <Unlock className="h-5 w-5 text-gold" /> Open Cash Float Shift
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold">Opened By Cashier *</label>
                <input
                  type="text"
                  required
                  value={openShiftForm.openedBy}
                  onChange={e => setOpenShiftForm({ ...openShiftForm, openedBy: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Opening Cash Float Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={openShiftForm.float}
                  onChange={e => setOpenShiftForm({ ...openShiftForm, float: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Notes</label>
                <input
                  type="text"
                  value={openShiftForm.notes}
                  onChange={e => setOpenShiftForm({ ...openShiftForm, notes: e.target.value })}
                  placeholder="e.g. Seeding initial registers cash drawer"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowOpenShift(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg hover:bg-muted-foreground/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg hover:opacity-95"
              >
                Open Shift
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Close Shift Modal */}
      {showCloseShift && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleCloseShiftSubmit} className="bg-card border border-border p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-gold" /> Close Cash Float Shift
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold">Expected Closing Float</label>
                <div className="p-2 bg-muted text-brown-deep rounded font-black text-sm">₹{activeShift.expectedClosing.toFixed(2)}</div>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Actual Closing Float (₹) *</label>
                <input
                  type="number"
                  required
                  value={closeShiftForm.actualFloat}
                  onChange={e => setCloseShiftForm({ ...closeShiftForm, actualFloat: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-brown-deep font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Closing Notes / Summary</label>
                <input
                  type="text"
                  value={closeShiftForm.notes}
                  onChange={e => setCloseShiftForm({ ...closeShiftForm, notes: e.target.value })}
                  placeholder="Notes detailing float discrepancies"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowCloseShift(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg hover:bg-muted-foreground/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-destructive text-destructive-foreground text-xs font-bold uppercase rounded-lg hover:opacity-95"
              >
                Reconcile & Close
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleAddExpenseSubmit} className="bg-card border border-border p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-gold" /> Log Operational Expense
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold">Expense Category *</label>
                <select
                  required
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none"
                >
                  <option value="">Select Category</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Gas / Fuel">Gas / Fuel</option>
                  <option value="Staff Meals">Staff Meals</option>
                  <option value="Utility Supplies">Utility Supplies</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Voucher Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={expenseForm.amount || ""}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Description / Remarks *</label>
                <input
                  type="text"
                  required
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="e.g. Purchased delivery packing bags"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Payment Mode</label>
                <select
                  value={expenseForm.paymentMode}
                  onChange={e => setExpenseForm({ ...expenseForm, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none"
                >
                  <option value="cash">Cash Register Drawer</option>
                  <option value="upi">UPI Wallet</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowAddExpense(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg hover:bg-muted-foreground/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg hover:opacity-95"
              >
                Save Expense
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modals from Sprint 1-3 */}
      {showAddIng && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleAddIngredient} className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-gold" /> Register Ingredient
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold">Ingredient Name *</label>
                <input
                  type="text"
                  required
                  value={newIng.name}
                  onChange={e => setNewIng({ ...newIng, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">SKU Code *</label>
                <input
                  type="text"
                  required
                  value={newIng.sku}
                  onChange={e => setNewIng({ ...newIng, sku: e.target.value })}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Category *</label>
                <select
                  required
                  value={newIng.categoryId}
                  onChange={e => setNewIng({ ...newIng, categoryId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Measurement Unit *</label>
                <select
                  required
                  value={newIng.unitId}
                  onChange={e => setNewIng({ ...newIng, unitId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none"
                >
                  <option value="">Select Unit</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowAddIng(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg"
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
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                >
                  <option value="">Select Item</option>
                  {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Quantity *</label>
                <input
                  type="number"
                  required
                  value={adjForm.adjustQty || ""}
                  onChange={e => setAdjForm({ ...adjForm, adjustQty: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowAdjust(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg"
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
