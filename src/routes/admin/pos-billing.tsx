import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, Plus, Minus, Trash2, Ticket, CheckCircle2, User, Table, CreditCard, Wallet, Smartphone, ShieldCheck } from "lucide-react";
import { MENU, CATEGORIES, MenuItem } from "@/lib/paakashala-menu";
import { useOffers } from "@/lib/promotions";
import { CartItem } from "@/lib/paakashala-store";
import BillingEngine from "@/modules/billing/services/BillingEngine";
import sessionManager from "@/services/session/SessionManager";
import printerManager from "@/modules/printer/services/PrinterManager";
import eventBus from "@/services/event-bus/eventBus";
import localDb from "@/services/database/localDb";
import logger from "@/services/logger/Logger";
import queueManager from "@/services/sync/QueueManager";
import syncManager from "@/services/sync/SyncManager";

export const Route = createFileRoute("/admin/pos-billing")({
  component: PosBillingPage,
});

function PosBillingPage() {
  const navigate = useNavigate();
  const menuItems = MENU;
  const { offers } = useOffers();

  // State
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState("T1");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [tipAmount, setTipAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<"cash" | "card" | "upi" | "razorpay">("cash");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active cashier name from session
  const cashierName = sessionManager.getActiveShift()?.cashierName || "Head Cashier";

  // Filter menu items by selected category and search string
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = item.category === selectedCategory;
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((it) => it.id === item.id);
      if (existing) {
        return prev.map((it) => (it.id === item.id ? { ...it, quantity: it.quantity + 1 } : it));
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price || 99,
          quantity: 1,
          image: item.image,
          type: item.type,
        },
      ];
    });
  };

  const updateQty = (id: string, q: number) => {
    setCart((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, quantity: q } : it));
      return next.filter((it) => it.quantity > 0);
    });
  };

  const removeCartItem = (id: string) => {
    setCart((prev) => prev.filter((it) => it.id !== id));
  };

  const applyCoupon = () => {
    if (!couponCode.trim()) return;
    const code = couponCode.trim().toUpperCase();
    const offer = offers.find((o) => o.couponCode?.toUpperCase() === code && o.status === "active");
    if (offer) {
      setAppliedCoupon(code);
      setMessage({ type: "success", text: `Coupon "${code}" applied.` });
    } else {
      setMessage({ type: "error", text: "Invalid coupon code." });
    }
  };

  // Compile calculations
  const billingTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
    
    // We calculate a temporary bill model just to show preview metrics
    const tempBill = BillingEngine.createBill({
      cartItems: cart,
      offers,
      couponCode: appliedCoupon || undefined,
      tipAmount,
      cashierName,
      tableId: selectedTable,
      paymentType,
      menuItems
    });

    return tempBill;
  }, [cart, offers, appliedCoupon, tipAmount, cashierName, selectedTable, paymentType, menuItems]);

  const handlePayAndPrint = async () => {
    if (cart.length === 0) {
      setMessage({ type: "error", text: "Cart is empty." });
      return;
    }

    try {
      const branchId = localDb.getSettings().branchId || "MAIN_BRANCH";
      const bill = BillingEngine.createBill({
        cartItems: cart,
        offers,
        couponCode: appliedCoupon || undefined,
        tipAmount,
        cashierName,
        tableId: selectedTable,
        customer: customerPhone ? { name: customerName || "Guest Customer", phone: customerPhone } : undefined,
        paymentType,
        branchId,
        menuItems
      });

      // 1. Save to local DB
      localDb.insertRecord("bills", bill);

      // 2. Queue for Firebase synchronization
      queueManager.enqueue("create-order", {
        ...bill,
        customerName: bill.customer?.name || "Dine-in Customer",
        customerPhone: bill.customer?.phone || "",
        items: [...bill.items, ...bill.freeItems]
      });

      // 3. Update session shifts expected cash drawer balance
      if (paymentType === "cash") {
        sessionManager.recordTransaction(bill.grandTotal);
      }

      // 4. Emit billing completed event for decoupled handlers
      await eventBus.emit("billing.completed", {
        order: bill,
        paymentType,
        amountPaid: bill.grandTotal,
        changeGiven: 0
      });

      // 5. Trigger hardware print receipts
      const printReceiptData = {
        billNumber: bill.billNumber,
        tableId: bill.tableId,
        customerName: bill.customer?.name,
        customerPhone: bill.customer?.phone,
        items: bill.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price || 0 })),
        subtotal: bill.subtotal,
        discount: bill.discount,
        tax: bill.tax,
        grandTotal: bill.grandTotal,
        cashierName: bill.cashierName,
        branchName: "Paakashala Main",
        branchAddress: "Jayanagar 4th Block, Bengaluru",
        branchPhone: "918639122823",
        upiId: paymentType === "upi" ? "paakashala@ybl" : undefined
      };
      
      const printKOTData = {
        kotNumber: bill.billNumber.replace("PK", "KOT"),
        tableId: bill.tableId || "T1",
        orderType: "dine-in" as const,
        cashierName: bill.cashierName,
        items: bill.items.map(i => ({ name: i.name, quantity: i.quantity }))
      };

      // Async print triggers
      printerManager.printReceipt(printReceiptData);
      printerManager.printKOT(printKOTData);

      // Success Reset
      setMessage({ type: "success", text: `Bill ${bill.billNumber} created & printed successfully!` });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCouponCode("");
      setAppliedCoupon("");
      setTipAmount(0);
      
      // Auto run sync background process
      syncManager.sync();

    } catch (err: any) {
      logger.error("pos", "Failed compiling bill checkout", err);
      setMessage({ type: "error", text: "Billing transaction error. Logged." });
    }
  };

  return (
    <div className="flex h-full flex-col lg:flex-row gap-6 animate-in fade-in duration-300">
      
      {/* LEFT: Menu and Categories Grid */}
      <div className="flex-1 flex flex-col min-w-0 bg-card rounded-3xl border border-border/60 p-6 shadow-sm">
        
        {/* Toolbar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-brown-deep tracking-tight">POS Billing Terminal</h1>
            <p className="text-xs text-muted-foreground mt-1">Branch: MAIN_BRANCH | Cashier: {cashierName}</p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes..."
              className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-xs shadow-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
        </div>

        {/* Category Scrollbar */}
        <div className="overflow-x-auto no-scrollbar mb-6 pb-2 border-b border-border/40">
          <div className="flex gap-2.5 w-max">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  selectedCategory === cat
                    ? "bg-brown-gradient text-cream shadow-md scale-102"
                    : "bg-background hover:bg-gold/5 text-brown-deep border border-border/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-[300px]">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => addToCart(item)}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-background border border-border/60 p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer select-none"
              >
                <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-muted mb-2 relative">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className={`absolute top-2 left-2 rounded px-1.5 py-0.5 text-[8px] font-black uppercase text-white shadow-sm ${
                    item.type === "veg" ? "bg-green-600" : "bg-red-600"
                  }`}>
                    {item.type}
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="truncate text-xs font-semibold text-brown-deep">{item.name}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-bold text-gold">₹{item.price || 99}</span>
                    <span className="text-[10px] text-muted-foreground">{item.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No items found.</div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart Summary and Checkout Panel */}
      <div className="w-full lg:w-96 shrink-0 flex flex-col bg-card rounded-3xl border border-border/60 p-6 shadow-sm">
        
        {/* Table & Customer Setup */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Table className="h-3 w-3 text-gold" /> Table Allocation
            </label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-gold focus:outline-none"
            >
              {Array.from({ length: 20 }).map((_, i) => (
                <option key={i} value={`T${i + 1}`}>
                  Table T{i + 1}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <User className="h-3 w-3 text-gold" /> Customer Phone
            </label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-gold focus:outline-none"
            />
          </div>
        </div>

        {customerPhone && (
          <div className="mb-4 animate-in slide-in-from-top-2 duration-200">
            <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-gold"
            />
          </div>
        )}

        {/* Message Banner */}
        {message && (
          <div className={`p-2.5 rounded-xl text-xs mb-4 flex items-center gap-2 border font-medium ${
            message.type === "success" 
              ? "bg-green-50 border-green-200/50 text-green-700" 
              : "bg-red-50 border-red-200/50 text-red-700"
          }`}>
            <span>{message.type === "success" ? "✔" : "⚠"}</span>
            <span>{message.text}</span>
          </div>
        )}

        {/* Cart Listing */}
        <div className="flex-1 overflow-y-auto max-h-[300px] border-y border-border/40 py-3 my-2 pr-1">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground text-xs py-8">
              <span>🛒</span>
              <span className="mt-1">Order Cart is Empty</span>
            </div>
          ) : (
            <ul className="space-y-3">
              {cart.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-3 text-xs bg-background p-2.5 rounded-xl border border-border/40">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-brown-deep truncate block">{it.name}</span>
                    <span className="text-[10px] text-muted-foreground">₹{it.price || 99} each</span>
                  </div>
                  
                  <div className="flex items-center gap-2 rounded-lg border border-gold/40 bg-cream p-1 shrink-0">
                    <button onClick={() => updateQty(it.id, it.quantity - 1)} className="p-0.5 rounded bg-gold/10 hover:bg-gold/20">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-4 text-center font-bold">{it.quantity}</span>
                    <button onClick={() => updateQty(it.id, it.quantity + 1)} className="p-0.5 rounded bg-gold-gradient hover:opacity-90">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-brown-deep">₹{((it.price || 99) * it.quantity).toFixed(0)}</span>
                    <button onClick={() => removeCartItem(it.id)} className="text-muted-foreground hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Coupon Form */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Coupon Code"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs uppercase"
            />
            <button onClick={applyCoupon} className="bg-brown-gradient text-cream px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">
              Apply
            </button>
          </div>
          {appliedCoupon && (
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-green-700 bg-green-50 border border-green-200/50 p-1.5 rounded-lg">
              <span>Applied: <strong>{appliedCoupon}</strong></span>
              <button onClick={() => setAppliedCoupon("")} className="text-red-500 font-bold hover:underline">Remove</button>
            </div>
          )}
        </div>

        {/* Tip selection */}
        <div className="mb-4">
          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block">Waiter Tip support</label>
          <div className="flex gap-2">
            {[0, 20, 50, 100].map((amt) => (
              <button
                key={amt}
                onClick={() => setTipAmount(amt)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                  tipAmount === amt 
                    ? "bg-brown-gradient text-cream border-transparent shadow-sm" 
                    : "bg-background hover:bg-gold/5 text-brown-deep border-border/80"
                }`}
              >
                {amt === 0 ? "No Tip" : `₹${amt}`}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Details */}
        <div className="space-y-2 text-xs border-t border-border/40 pt-3 mb-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold text-brown-deep">₹{billingTotals.subtotal.toFixed(2)}</span>
          </div>
          {billingTotals.discount > 0 && (
            <div className="flex justify-between text-green-700 font-medium">
              <span>Discounts</span>
              <span>-₹{billingTotals.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">GST Taxes (5%)</span>
            <span className="font-semibold text-brown-deep">₹{billingTotals.tax.toFixed(2)}</span>
          </div>
          {tipAmount > 0 && (
            <div className="flex justify-between text-green-700 font-semibold">
              <span>Servant Tip</span>
              <span>₹{tipAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-dashed border-border/60 pt-2 font-bold text-sm text-brown-deep">
            <span>GRAND TOTAL</span>
            <span>₹{billingTotals.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Method Select */}
        <div className="mb-5">
          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-2 block">Select Payment Mode</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: "cash", label: "Cash", icon: Wallet },
              { id: "card", label: "Card", icon: CreditCard },
              { id: "upi", label: "UPI", icon: Smartphone },
              { id: "razorpay", label: "R-Pay", icon: ShieldCheck },
            ].map((pm) => {
              const Icon = pm.icon;
              return (
                <button
                  key={pm.id}
                  onClick={() => setPaymentType(pm.id as any)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[10px] font-bold gap-1 transition ${
                    paymentType === pm.id
                      ? "bg-brown-gradient text-cream border-transparent shadow-sm"
                      : "bg-background hover:bg-gold/5 text-brown-deep border-border/80"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{pm.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PAY & PRINT BUTTON */}
        <button
          onClick={handlePayAndPrint}
          className="w-full rounded-2xl bg-brown-gradient py-4 text-xs font-bold uppercase tracking-widest text-cream shadow-md active:scale-98 transition duration-200"
        >
          Pay & Print Bill (KOT + Receipt)
        </button>
      </div>
    </div>
  );
}
