import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Clock, CheckCircle2, ChefHat, Receipt, ArrowRight, XCircle, Printer } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import printerManager from "@/modules/printer/services/PrinterManager";
import logger from "@/services/logger/Logger";
import localDb from "@/services/database/localDb";

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
      const settings = localDb.getSettings();
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
        branchName: settings.restaurant?.name || "Paakashala Main",
        branchAddress: settings.restaurant?.address || "Jayanagar 4th Block, Bengaluru",
        branchPhone: settings.restaurant?.phone || "918639122823",
        logoPath: settings.restaurant?.logoUrl || undefined
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
    <div className="flex flex-col h-full animate-in fade-in duration-300 space-y-6">
      <div className="flex items-center justify-between shrink-0 border-b border-[#27272A] pb-4">
        <div>
          <h1 className="text-2xl font-black font-display text-white tracking-tight">Live Orders Monitor</h1>
          <p className="text-xs text-[#A1A1AA] mt-1">Real-time KOT routing and POS order status tracker.</p>
        </div>
      </div>
      
      {/* Kanban Board Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto lg:overflow-hidden pb-4">
        
        {/* PENDING COLUMN */}
        <KanbanColumn 
          title="New Orders" 
          icon={Receipt} 
          count={pending.length} 
          headerBg="bg-red-500/15 border-red-500/30 text-red-400"
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
          {pending.length === 0 && <EmptyState text="No new incoming orders" />}
        </KanbanColumn>

        {/* PREPARING COLUMN */}
        <KanbanColumn 
          title="Preparing" 
          icon={ChefHat} 
          count={preparing.length} 
          headerBg="bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]"
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
          headerBg="bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
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

function KanbanColumn({ title, icon: Icon, count, headerBg, children }: any) {
  return (
    <div className="flex flex-col min-h-[450px] lg:min-h-0 lg:h-full bg-[#141414] rounded-3xl border border-[#27272A] shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden">
      <div className={`px-5 py-4 border-b flex items-center justify-between ${headerBg}`}>
        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
          <Icon className="h-4.5 w-4.5" />
          {title}
        </div>
        <div className="h-6 w-6 rounded-full bg-black/40 border border-current flex items-center justify-center text-[10px] font-black">
          {count}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0F0F0F]">
        {children}
      </div>
    </div>
  );
}

function OrderCard({ order, onNext, nextLabel, onCancel, onPrintReceipt, onPrintKOT }: any) {
  const timeAgo = formatDistanceToNow(order.createdAt, { addSuffix: true });

  return (
    <div className="bg-[#181818] rounded-2xl p-4 shadow-sm border border-[#27272A] transition-all hover:border-[#D4AF37]/40 hover:shadow-[0_0_15px_rgba(212,175,55,0.15)]">
      <div className="flex items-start justify-between mb-3 border-b border-[#27272A] pb-3">
        <div>
          <h3 className="text-base font-black text-white">Table {order.tableId}</h3>
          {(order.customerName || order.mobile) && (
            <div className="text-[11px] font-bold text-[#E4E4E7] mt-0.5">
              {order.customerName || "Guest"} • <span className="font-mono text-[10px] text-[#A1A1AA]">+91 {order.mobile}</span>
            </div>
          )}
          <div className="flex items-center text-[10px] text-[#71717A] mt-1">
            <Clock className="h-3 w-3 mr-1 text-[#D4AF37]" />
            {timeAgo}
          </div>
        </div>
        <div className="font-black text-sm text-[#D4AF37]">
          ₹{order.total}
        </div>
      </div>
      
      <div className="space-y-1.5 mb-4 max-h-36 overflow-y-auto pr-1">
        {order.items?.map((item: any, idx: number) => (
          <div key={idx} className="flex items-start justify-between text-xs">
            <span className="font-semibold text-[#E4E4E7]">
              <span className="text-[#D4AF37] font-bold mr-1">{item.quantity}x</span>
              {item.name}
            </span>
            <span className="text-[#A1A1AA] ml-2 font-mono">₹{((item.price || 99) * item.quantity).toFixed(0)}</span>
          </div>
        ))}
      </div>

      {/* Hardware Print Overrides */}
      <div className="flex gap-2 border-t border-[#27272A] pt-3.5 mb-3.5">
        <button
          onClick={onPrintReceipt}
          className="flex-1 bg-[#222222] hover:bg-[#2A2A2A] text-white border border-[#27272A] hover:border-[#D4AF37]/50 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5 text-[#D4AF37]" /> Bill
        </button>
        <button
          onClick={onPrintKOT}
          className="flex-1 bg-[#222222] hover:bg-[#2A2A2A] text-white border border-[#27272A] hover:border-[#D4AF37]/50 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5 text-[#D4AF37]" /> KOT
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onNext}
          className="flex-1 bg-gradient-to-r from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-gold-glow flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          {nextLabel}
          <ArrowRight className="h-3.5 w-3.5 stroke-[3]" />
        </button>
        {onCancel && (
          <button 
            onClick={onCancel}
            className="p-2.5 text-red-400 bg-red-500/15 border border-red-500/30 rounded-xl hover:bg-red-500/25 active:scale-95 transition-all cursor-pointer"
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
    <div className="h-32 flex items-center justify-center text-[#71717A] font-semibold text-xs border-2 border-dashed border-[#27272A] rounded-2xl py-6">
      {text}
    </div>
  );
}
