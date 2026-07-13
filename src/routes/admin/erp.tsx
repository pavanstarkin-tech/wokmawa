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
import { crmService, Customer, CustomerAddress } from "@/modules/crm/services/CRMService";
import { reservationService, Reservation } from "@/modules/reservations/services/ReservationService";
import { reportsEngine, SalesReport, ProfitAndLossReport } from "@/modules/reports/services/ReportsEngine";
import dbService from "@/core/database/DatabaseService";
import { 
  Package, Tags, Scale, Plus, RefreshCw, AlertTriangle, 
  History, Settings, ShieldAlert, ArrowUpRight, ArrowDownRight, 
  BookOpen, Edit3, Trash2, Check, Percent, FileText, Users, ShoppingBag, Truck, Receipt, Calendar, Key, Lock, Unlock, Landmark, CreditCard, Award, MapPin 
} from "lucide-react";
import logger from "@/services/logger/Logger";

export const Route = createFileRoute("/admin/erp")({
  component: ErpDashboardPage,
});

type ErpTab = "ingredients" | "recipes" | "vendors" | "purchase_orders" | "goods_receipts" | "vendor_ledger" | "attendance" | "shift_manager" | "cash_drawer" | "expenses" | "crm" | "reservations" | "daily_closing" | "reorders";

function ErpDashboardPage() {
  const [activeTab, setActiveTab] = useState<ErpTab>("ingredients");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // --- Core Datasets ---
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [units, setUnits] = useState<MeasurementUnit[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  
  // --- Procurement & Ledgers ---
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [selectedVendorLedger, setSelectedVendorLedger] = useState<any[]>([]);
  const [activeVendorId, setActiveVendorId] = useState("");

  // --- Operations & Staff ---
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [cashMovements, setCashMovements] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  // --- CRM & Reservations (Phase 4.5) ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCustId, setActiveCustId] = useState("");
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [suggestedTablesList, setSuggestedTablesList] = useState<any[]>([]);

  // --- Executive Financial Reports (Phase 4.5) ---
  const [financials, setFinancials] = useState<ProfitAndLossReport | null>(null);

  // Dialog & Modals
  const [showAddIng, setShowAddIng] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [showGRNInspection, setShowGRNInspection] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Operations Modals
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Phase 4.5 Modals
  const [showAddCust, setShowAddCust] = useState(false);
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [showAddRes, setShowAddRes] = useState(false);

  // Form Parameters
  const [newIng, setNewIng] = useState({ name: "", sku: "", categoryId: "", unitId: "", minStock: 0, costPrice: 0, openingStock: 0 });
  const [adjForm, setAdjForm] = useState({ ingredientId: "", adjustQty: 0, reason: "", type: "in" });
  const [newVendor, setNewVendor] = useState({ vendorCode: "", name: "", phone: "", email: "", gst: "", pan: "", address: "", paymentTerms: 30 });
  const [poForm, setPoForm] = useState({ vendorId: "", notes: "", expectedDate: Date.now() + 86400000 * 3 });
  const [poFormItems, setPoFormItems] = useState<Array<{ ingredientId: string; quantity: number; unitPrice: number }>>([]);
  const [activePO, setActivePO] = useState<PurchaseOrder | null>(null);
  const [activePOItems, setActivePOItems] = useState<PurchaseOrderItem[]>([]);
  const [grnInspectionItems, setGrnInspectionItems] = useState<Array<{ ingredientId: string; acceptedQty: number; rejectedQty: number; damagedQty: number; returnedQty: number; batchNumber: string; expiryDate: string; remarks: string; unitCost: number }>>([]);
  const [paymentForm, setPaymentForm] = useState({ vendorId: "", amount: 0, paymentMode: "upi", transactionNumber: "", notes: "" });
  
  // Operations forms
  const [openShiftForm, setOpenShiftForm] = useState({ openedBy: "Head Cashier", float: 2000, notes: "" });
  const [closeShiftForm, setCloseShiftForm] = useState({ closedBy: "Head Cashier", actualFloat: 0, notes: "" });
  const [expenseForm, setExpenseForm] = useState({ category: "", amount: 0, description: "", paymentMode: "cash" });

  // Phase 4.5 forms
  const [custForm, setCustForm] = useState({ phone: "", name: "", email: "", birthday: "", anniversary: "", notes: "" });
  const [addrForm, setAddrForm] = useState({ addressLine1: "", addressLine2: "", city: "", pincode: "", isDefault: true });
  const [resForm, setResForm] = useState({ customerName: "", customerPhone: "", partySize: 2, reservationTime: "", tableId: "", notes: "" });

  // Recipe Builder parameters
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
      const vends = await purchaseOrderEngine.getVendors();
      const posList = await purchaseOrderEngine.getPurchaseOrders();
      const grns = await goodsReceiptsList();
      
      const atts = await attendanceEngine.getAttendanceLogs();
      const activeS = await shiftEngine.getActiveShift();
      const exps = await dbService.getAdapter().query("SELECT * FROM expenses ORDER BY timestamp DESC");

      // Phase 4.5 CRM & Booking
      const custs = await crmService.getCustomers();
      const bookings = await reservationService.getReservations();
      const vacantTables = await reservationService.getSuggestedTables(1);
      const reportPL = await reportsEngine.getPandLReport(Date.now() - 86400000 * 30, Date.now() + 86400000);

      setCategories(cats);
      setUnits(unts);
      setIngredients(ings);
      setRecipes(recs);
      setVendors(vends);
      setPurchaseOrders(posList);
      setGoodsReceipts(grns);
      setAttendanceLogs(atts);
      setActiveShift(activeS);
      setExpenses(exps);
      setCustomers(custs);
      setReservations(bookings);
      setSuggestedTablesList(vacantTables);
      setFinancials(reportPL);

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

      if (custs.length > 0 && !activeCustId) {
        setActiveCustId(custs[0].id);
        const addrs = await crmService.getAddresses(custs[0].id);
        setAddresses(addrs);
      }

      if (unts.length > 0 && !builderYieldUnit) {
        setBuilderYieldUnit(unts[0].id);
      }
    } catch (err: any) {
      logger.error("erp", "Failed loading ERP data", err);
      setStatusMsg({ type: "error", text: "Failed loading operational records." });
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

  useEffect(() => {
    if (activeCustId) {
      crmService.getAddresses(activeCustId).then(addrs => {
        setAddresses(addrs);
      });
    }
  }, [activeCustId]);

  // --- Phase 4.5 Handlers ---
  const handleAddCustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name || !custForm.phone) return;
    try {
      await crmService.createCustomer({
        name: custForm.name,
        phone: custForm.phone,
        email: custForm.email,
        points: 100, // Seeding initial welcome loyalty points
        walletBalance: 0,
        tier: "bronze",
        birthday: custForm.birthday ? new Date(custForm.birthday).getTime() : undefined,
        anniversary: custForm.anniversary ? new Date(custForm.anniversary).getTime() : undefined,
        notes: custForm.notes
      });
      setStatusMsg({ type: "success", text: `Customer profile for "${custForm.name}" created.` });
      setCustForm({ phone: "", name: "", email: "", birthday: "", anniversary: "", notes: "" });
      setShowAddCust(false);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleAddAddrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustId || !addrForm.addressLine1) return;
    try {
      await crmService.addAddress({
        customerId: activeCustId,
        addressLine1: addrForm.addressLine1,
        addressLine2: addrForm.addressLine2,
        city: addrForm.city,
        pincode: addrForm.pincode,
        isDefault: addrForm.isDefault
      });
      setStatusMsg({ type: "success", text: "Customer delivery address registered." });
      setAddrForm({ addressLine1: "", addressLine2: "", city: "", pincode: "", isDefault: true });
      setShowAddAddr(false);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleCreateResSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resForm.customerName || !resForm.customerPhone) return;
    try {
      await reservationService.createReservation({
        customerName: resForm.customerName,
        customerPhone: resForm.customerPhone,
        partySize: Number(resForm.partySize),
        reservationTime: new Date(resForm.reservationTime).getTime(),
        tableId: resForm.tableId || undefined,
        status: "pending",
        notes: resForm.notes
      });
      setStatusMsg({ type: "success", text: "Table reservation calendar slot booked." });
      setResForm({ customerName: "", customerPhone: "", partySize: 2, reservationTime: "", tableId: "", notes: "" });
      setShowAddRes(false);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  const handleSeatReservation = async (id: string) => {
    try {
      await reservationService.updateStatus(id, "seated");
      setStatusMsg({ type: "success", text: "Reservation customer seated at assigned table." });
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
  };

  // --- Handlers for Sprint 1-4 ---
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
    setActiveTab("ingredients"); // simpler refresh redirection
  };

  const handleSaveRecipe = async () => {
    if (!selectedMenuItem) return;
    try {
      const existing = await recipeEngine.getRecipeByItemVariant(selectedMenuItem.id, recipeVariant);
      const recipeId = existing ? existing.id : `rec_${Date.now()}`;
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
        id: `ritem_${Date.now()}_${idx}`,
        recipeId,
        ingredientId: it.ingredientId,
        quantity: it.quantity,
        wastagePercent: it.wastagePercent,
        sortOrder: idx
      }));

      await recipeEngine.saveRecipe(recipeHeader, recipeItemsList);
      setStatusMsg({ type: "success", text: `Recipe for "${selectedMenuItem.name}" saved.` });
      setSelectedMenuItem(null);
      setBuilderItems([]);
      await loadAllData();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    }
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

  const lowStockItems = ingredients.filter(i => i.stockQty <= i.minStock);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-fade-in text-brown-deep">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brown-deep flex items-center gap-2">
            <Package className="h-7 w-7 text-gold" />
            Restaurant ERP, CRM & Bookings Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage raw ingredient metrics, supplier profiles, cashier shifts, customer loyalty wallets, and table bookings.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "crm" && (
            <button
              onClick={() => setShowAddCust(true)}
              className="px-4 py-2 bg-brown-deep text-gold rounded-lg font-medium text-sm hover:opacity-95 transition"
            >
              Add Customer
            </button>
          )}
          {activeTab === "reservations" && (
            <button
              onClick={() => setShowAddRes(true)}
              className="px-4 py-2 bg-brown-deep text-gold rounded-lg font-medium text-sm hover:opacity-95 transition"
            >
              Book Table
            </button>
          )}
          {activeTab === "shift_manager" && !activeShift && (
            <button
              onClick={() => setShowOpenShift(true)}
              className="px-4 py-2 bg-brown-deep text-gold rounded-lg font-medium text-sm hover:opacity-95 transition"
            >
              Open Shift
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
            { id: "recipes", label: "Recipes Costing", icon: BookOpen },
            { id: "vendors", label: "Vendors Directory", icon: Users },
            { id: "purchase_orders", label: "Purchase Orders", icon: ShoppingBag },
            { id: "goods_receipts", label: "Goods Receipts (GRN)", icon: Truck },
            { id: "crm", label: "Customer CRM", icon: Users },
            { id: "reservations", label: "Reservations Calendar", icon: Calendar },
            { id: "shift_manager", label: "Shift Manager", icon: Key },
            { id: "cash_drawer", label: "Cash Drawer", icon: Landmark },
            { id: "expenses", label: "Expenses Vouchers", icon: CreditCard },
            { id: "daily_closing", label: "Daily Closing Summary", icon: FileText },
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
            <div className="space-y-4 animate-fade-in text-xs">
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
                    {ingredients.map(ing => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CRM Tab (Phase 4.5 Addition) */}
          {activeTab === "crm" && (
            <div className="space-y-4 animate-fade-in text-xs">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-brown-deep text-lg">Customer Master Directory</h3>
                {customers.length > 0 && (
                  <select
                    value={activeCustId}
                    onChange={e => setActiveCustId(e.target.value)}
                    className="rounded border border-border bg-background px-3 py-1.5 text-xs focus:outline-none"
                  >
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                  </select>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 overflow-x-auto border border-border/50 rounded-xl bg-background/50">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted-foreground/5 text-muted-foreground border-b border-border/50">
                        <th className="p-3">Customer</th>
                        <th className="p-3">Tier</th>
                        <th className="p-3">Loyalty Points</th>
                        <th className="p-3">Wallet balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map(c => (
                        <tr key={c.id} className={`border-b border-border/30 hover:bg-muted-foreground/5 text-xs ${c.id === activeCustId ? "bg-gold/15" : ""}`}>
                          <td className="p-3 font-semibold text-brown-deep">
                            <div>{c.name}</div>
                            <span className="text-[10px] text-muted-foreground">{c.phone}</span>
                          </td>
                          <td className="p-3 capitalize font-bold text-gold">{c.tier}</td>
                          <td className="p-3 font-bold">{c.points} pts</td>
                          <td className="p-3 font-black text-brown-deep">₹{c.walletBalance.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:col-span-1 bg-background/40 border p-4 rounded-xl space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-bold text-brown-deep">Delivery Addresses</h4>
                    <button
                      onClick={() => setShowAddAddr(true)}
                      className="px-2 py-0.5 bg-gold/15 text-brown-deep text-[10px] font-bold rounded"
                    >
                      + Add
                    </button>
                  </div>
                  {addresses.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-center">No addresses registered.</p>
                  ) : (
                    addresses.map(a => (
                      <div key={a.id} className="p-3 border rounded-xl bg-background flex gap-2">
                        <MapPin className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">{a.addressLine1}</div>
                          {a.addressLine2 && <div className="text-[10px]">{a.addressLine2}</div>}
                          <div className="text-[10px] text-muted-foreground">{a.city} - {a.pincode}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reservations Tab (Phase 4.5 Addition) */}
          {activeTab === "reservations" && (
            <div className="space-y-4 animate-fade-in text-xs">
              <h3 className="font-bold text-brown-deep text-lg">Table Reservations Calendar</h3>
              <div className="overflow-x-auto border border-border/50 rounded-xl bg-background/50">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted-foreground/5 text-muted-foreground border-b border-border/50">
                      <th className="p-3">Customer</th>
                      <th className="p-3">Party Size</th>
                      <th className="p-3">Schedule Time</th>
                      <th className="p-3">Table assigned</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">No reservations on the calendar today.</td>
                      </tr>
                    ) : (
                      reservations.map(res => (
                        <tr key={res.id} className="border-b border-border/30 hover:bg-muted-foreground/5">
                          <td className="p-3 font-semibold text-brown-deep">
                            <div>{res.customerName}</div>
                            <span className="text-[10px] text-muted-foreground">{res.customerPhone}</span>
                          </td>
                          <td className="p-3">{res.partySize} guests</td>
                          <td className="p-3">{new Date(res.reservationTime).toLocaleString()}</td>
                          <td className="p-3 font-mono font-bold text-gold">{res.tableName || "Waitlisted / Pending"}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                              res.status === "seated" ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border"
                            }`}>
                              {res.status}
                            </span>
                          </td>
                          <td className="p-3">
                            {res.status === "pending" && (
                              <button
                                onClick={() => handleSeatReservation(res.id)}
                                className="text-green-700 font-bold hover:underline"
                              >
                                Seat Customer
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

          {/* Daily Closing & Reports tab (Phase 4.5 Addition) */}
          {activeTab === "daily_closing" && financials && (
            <div className="grid gap-6 md:grid-cols-2 animate-fade-in text-xs">
              <div className="bg-background/45 border p-5 rounded-2xl space-y-4">
                <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gold" /> P&L Statement (Last 30 Days)
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-muted-foreground">Gross Sales Revenue</span>
                    <span className="font-bold text-green-700">₹{financials.totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-muted-foreground">Cost of Goods Sold (GRN)</span>
                    <span className="font-bold text-red-700">-₹{financials.totalCostOfGoodsSold.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-muted-foreground">Vouchers Expenses</span>
                    <span className="font-bold text-red-700">-₹{financials.totalExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-sm font-black text-brown-deep">
                    <span>Net Profit / Loss</span>
                    <span>₹{financials.netProfit.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-background/45 border p-5 rounded-2xl space-y-4">
                <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-gold" /> EOD Closing Warnings Checklist
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>No pending sync queue items.</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-700">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>Printers service heartbeats online.</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Please ensure cash drawer denomination count matches variance limits.</span>
                  </div>
                </div>
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

        </div>
      </div>

      {/* --- Dialog Modals --- */}

      {/* 1. Add Customer Profile Modal */}
      {showAddCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleAddCustSubmit} className="bg-card border border-border p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-gold" /> Create Customer Profile
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold">Customer Phone Number *</label>
                <input
                  type="text"
                  required
                  value={custForm.phone}
                  onChange={e => setCustForm({ ...custForm, phone: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={custForm.name}
                  onChange={e => setCustForm({ ...custForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Email Address</label>
                <input
                  type="email"
                  value={custForm.email}
                  onChange={e => setCustForm({ ...custForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="font-bold">Birthday</label>
                  <input
                    type="date"
                    value={custForm.birthday}
                    onChange={e => setCustForm({ ...custForm, birthday: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold">Anniversary</label>
                  <input
                    type="date"
                    value={custForm.anniversary}
                    onChange={e => setCustForm({ ...custForm, anniversary: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowAddCust(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg hover:opacity-95"
              >
                Create Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Add Customer Address Modal */}
      {showAddAddr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleAddAddrSubmit} className="bg-card border border-border p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gold" /> Add Address
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold">Address Line 1 *</label>
                <input
                  type="text"
                  required
                  value={addrForm.addressLine1}
                  onChange={e => setAddrForm({ ...addrForm, addressLine1: e.target.value })}
                  placeholder="Street, Room/Suite, House No."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Address Line 2</label>
                <input
                  type="text"
                  value={addrForm.addressLine2}
                  onChange={e => setAddrForm({ ...addrForm, addressLine2: e.target.value })}
                  placeholder="Locality, Land Mark"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="font-bold">City *</label>
                  <input
                    type="text"
                    required
                    value={addrForm.city}
                    onChange={e => setAddrForm({ ...addrForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={addrForm.pincode}
                    onChange={e => setAddrForm({ ...addrForm, pincode: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowAddAddr(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg hover:opacity-95"
              >
                Save Address
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Add Table Reservation Modal */}
      {showAddRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <form onSubmit={handleCreateResSubmit} className="bg-card border border-border p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-brown-deep text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gold" /> Reserve Table Slot
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold">Guest Name *</label>
                <input
                  type="text"
                  required
                  value={resForm.customerName}
                  onChange={e => setResForm({ ...resForm, customerName: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Contact Phone Number *</label>
                <input
                  type="text"
                  required
                  value={resForm.customerPhone}
                  onChange={e => setResForm({ ...resForm, customerPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="font-bold">Party Size *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={resForm.partySize}
                    onChange={e => setResForm({ ...resForm, partySize: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold">Select Vacant Table</label>
                  <select
                    value={resForm.tableId}
                    onChange={e => setResForm({ ...resForm, tableId: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none"
                  >
                    <option value="">Auto assign / Waitlist</option>
                    {suggestedTablesList.map(t => <option key={t.id} value={t.id}>{t.tableName} (Cap: {t.tableCapacity})</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Schedule Booking Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={resForm.reservationTime}
                  onChange={e => setResForm({ ...resForm, reservationTime: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowAddRes(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg hover:opacity-95"
              >
                Confirm Slot
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Legacy modals (Sprint 1-4) */}
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
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={() => setShowOpenShift(false)}
                className="px-3 py-1.5 border border-border/60 text-muted-foreground text-xs font-bold uppercase rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-brown-deep text-gold text-xs font-bold uppercase rounded-lg"
              >
                Open Shift
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

    </div>
  );
}
