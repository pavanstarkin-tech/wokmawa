import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Clock, CheckCircle2, ChefHat, Receipt, ArrowRight, XCircle, Printer } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import printerManager from "@/modules/printer/services/PrinterManager";
import logger from "@/services/logger/Logger";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

type Order = {
  id: string;
  tableId: string;
  items: any[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  total: number;
  status: "pending" | "preparing" | "ready" | "paid" | "cancelled";
  createdAt: number;
  customerName?: string;
  mobile?: string;
  appliedCoupon?: string;
};

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const ordersRef = ref(db, "restaurant/orders");
    const unsub = onValue(ordersRef, (snapshot) => {
      const fetchedOrders: Order[] = [];
      snapshot.forEach((child) => {
        const data = child.val();
        if (data.status !== "paid" && data.status !== "cancelled") {
          fetchedOrders.push({
            id: child.key as string,
            ...data,
          });
        }
      });
      fetchedOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setOrders(fetchedOrders);
    });
    return () => unsub();
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const orderRef = ref(db, `restaurant/orders/${orderId}`);
      await update(orderRef, { status: newStatus, updatedAt: Date.now() });
      logger.info("pos", `Order status updated: ${orderId} -> ${newStatus}`);
    } catch (err: any) {
      logger.error("pos", "Failed updating order status", err);
    }
  };

  const handlePrintReceipt = async (order: Order) => {
    try {
      const receiptData = {
        billNumber: `PK-REPRINT-${order.id.substring(0,6).toUpperCase()}`,
        tableId: order.tableId,
        customerName: order.customerName,
        customerPhone: order.mobile,
        items: order.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price || 0 })),
        subtotal: order.subtotal || order.total,
        discount: order.discount || 0,
        tax: order.tax || 0,
        grandTotal: order.total,
        cashierName: "Admin Station",
        branchName: "Paakashala Main",
        branchAddress: "Jayanagar 4th Block, Bengaluru",
        branchPhone: "918639122823"
      };
      
      const success = await printerManager.printReceipt(receiptData);
      if (success) {
        logger.info("printer", `Printed duplicate receipt for order ${order.id}`);
      }
    } catch (e: any) {
      logger.error("printer", "Failed printing duplicate receipt", e);
    }
  };

  const handlePrintKOT = async (order: Order) => {
    try {
      const kotData = {
        kotNumber: `KOT-${order.id.substring(0,6).toUpperCase()}`,
        tableId: order.tableId || "T1",
        orderType: "dine-in" as const,
        cashierName: "Admin Station",
        items: order.items.map(i => ({ name: i.name, quantity: i.quantity }))
      };
      
      const success = await printerManager.printKOT(kotData);
      if (success) {
        logger.info("printer", `Printed duplicate KOT for order ${order.id}`);
      }
    } catch (e: any) {
      logger.error("printer", "Failed printing duplicate KOT", e);
    }
  };

  const pending = orders.filter((o) => o.status === "pending" || !o.status);
  const preparing = orders.filter((o) => o.status === "preparing");
  const ready = orders.filter((o) => o.status === "ready");

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-brown-deep tracking-tight">Live Orders Monitor</h1>
          <p className="text-xs text-muted-foreground mt-1">Real-time KOT routing and POS order status tracker.</p>
        </div>
      </div>
      
      {/* Kanban Board Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto lg:overflow-hidden pb-4">
        
        {/* PENDING COLUMN */}
        <KanbanColumn 
          title="New Orders" 
          icon={Receipt} 
          count={pending.length} 
          color="bg-red-50 text-red-600 border-red-200"
        >
          {pending.map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onNext={() => updateOrderStatus(order.id, "preparing")}
              nextLabel="Start Preparing"
              onCancel={() => updateOrderStatus(order.id, "cancelled")}
              onPrintReceipt={() => handlePrintReceipt(order)}
              onPrintKOT={() => handlePrintKOT(order)}
            />
          ))}
          {pending.length === 0 && <EmptyState text="No new orders" />}
        </KanbanColumn>

        {/* PREPARING COLUMN */}
        <KanbanColumn 
          title="Preparing" 
          icon={ChefHat} 
          count={preparing.length} 
          color="bg-amber-50 text-amber-600 border-amber-200"
        >
          {preparing.map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onNext={() => updateOrderStatus(order.id, "ready")}
              nextLabel="Mark as Ready"
              onPrintReceipt={() => handlePrintReceipt(order)}
              onPrintKOT={() => handlePrintKOT(order)}
            />
          ))}
          {preparing.length === 0 && <EmptyState text="Kitchen queue clear" />}
        </KanbanColumn>

        {/* READY COLUMN */}
        <KanbanColumn 
          title="Ready to Serve" 
          icon={CheckCircle2} 
          count={ready.length} 
          color="bg-green-50 text-green-600 border-green-200"
        >
          {ready.map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onNext={() => updateOrderStatus(order.id, "paid")}
              nextLabel="Complete & Paid"
              onPrintReceipt={() => handlePrintReceipt(order)}
              onPrintKOT={() => handlePrintKOT(order)}
            />
          ))}
          {ready.length === 0 && <EmptyState text="No pending dispatches" />}
        </KanbanColumn>

      </div>
    </div>
  );
}

function KanbanColumn({ title, icon: Icon, count, color, children }: any) {
  return (
    <div className="flex flex-col min-h-[450px] lg:min-h-0 lg:h-full bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden">
      <div className={`px-5 py-4 border-b flex items-center justify-between ${color}`}>
        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
          <Icon className="h-4.5 w-4.5" />
          {title}
        </div>
        <div className="h-6 w-6 rounded-full bg-white/50 flex items-center justify-center text-[10px] font-black">
          {count}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {children}
      </div>
    </div>
  );
}

function OrderCard({ order, onNext, nextLabel, onCancel, onPrintReceipt, onPrintKOT }: any) {
  const timeAgo = formatDistanceToNow(order.createdAt, { addSuffix: true });

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 transition-all hover:shadow-md">
      <div className="flex items-start justify-between mb-3 border-b border-border/50 pb-3">
        <div>
          <h3 className="text-base font-black text-brown-deep">Table {order.tableId}</h3>
          {(order.customerName || order.mobile) && (
            <div className="text-[11px] font-bold text-brown-deep/80 mt-0.5">
              {order.customerName || "Guest"} • <span className="font-mono text-[10px] text-muted-foreground">+91 {order.mobile}</span>
            </div>
          )}
          <div className="flex items-center text-[10px] text-muted-foreground mt-1">
            <Clock className="h-3 w-3 mr-1 text-gold" />
            {timeAgo}
          </div>
        </div>
        <div className="font-black text-sm text-gold">
          ₹{order.total}
        </div>
      </div>
      
      <div className="space-y-1.5 mb-4 max-h-36 overflow-y-auto pr-1">
        {order.items?.map((item: any, idx: number) => (
          <div key={idx} className="flex items-start justify-between text-xs">
            <span className="font-semibold text-brown-deep/80">
              <span className="text-muted-foreground mr-1">{item.quantity}x</span>
              {item.name}
            </span>
            <span className="text-muted-foreground ml-2">₹{((item.price || 99) * item.quantity).toFixed(0)}</span>
          </div>
        ))}
      </div>

      {/* Hardware Print Overrides */}
      <div className="flex gap-2 border-t border-border/40 pt-3.5 mb-3.5">
        <button
          onClick={onPrintReceipt}
          className="flex-1 bg-cream hover:bg-gold/10 text-brown-deep border border-gold/40 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5" /> Bill
        </button>
        <button
          onClick={onPrintKOT}
          className="flex-1 bg-cream hover:bg-gold/10 text-brown-deep border border-gold/40 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5" /> KOT
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onNext}
          className="flex-1 bg-brown-gradient text-cream py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all"
        >
          {nextLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        {onCancel && (
          <button 
            onClick={onCancel}
            className="p-2.5 text-red-500 bg-red-50 rounded-xl hover:bg-red-100 active:scale-95 transition-all"
            title="Cancel Order"
          >
            <XCircle className="h-4.5 w-4.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-32 flex items-center justify-center text-muted-foreground font-semibold text-xs border-2 border-dashed border-border/60 rounded-2xl py-6">
      {text}
    </div>
  );
}
