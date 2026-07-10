import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Clock, CheckCircle2, ChefHat, Receipt, ArrowRight, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

type Order = {
  id: string;
  tableId: string;
  items: any[];
  total: number;
  status: "pending" | "preparing" | "ready" | "paid" | "cancelled";
  createdAt: number;
};

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // For Kanban, we usually want all active orders for the day, or just all non-paid/cancelled ones.
    // We will pull all orders and filter locally for MVP to ensure we get live updates perfectly.
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
      // Sort oldest first (highest priority)
      fetchedOrders.sort((a, b) => a.createdAt - b.createdAt);
      setOrders(fetchedOrders);
    });
    return () => unsub();
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const orderRef = ref(db, `restaurant/orders/${orderId}`);
    await update(orderRef, { status: newStatus, updatedAt: Date.now() });
  };

  const pending = orders.filter((o) => o.status === "pending");
  const preparing = orders.filter((o) => o.status === "preparing");
  const ready = orders.filter((o) => o.status === "ready");

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-brown-deep tracking-tight">Live Orders</h1>
          <p className="text-muted-foreground mt-1">Real-time kitchen tickets and fulfillment.</p>
        </div>
      </div>
      
      {/* Kanban Board Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden pb-4">
        
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
            />
          ))}
          {preparing.length === 0 && <EmptyState text="Kitchen is clear" />}
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
            />
          ))}
          {ready.length === 0 && <EmptyState text="Nothing waiting" />}
        </KanbanColumn>

      </div>
    </div>
  );
}

function KanbanColumn({ title, icon: Icon, count, color, children }: any) {
  return (
    <div className="flex flex-col h-full bg-card rounded-3xl border border-border/60 shadow-sm overflow-hidden">
      <div className={`px-5 py-4 border-b flex items-center justify-between ${color}`}>
        <div className="flex items-center gap-2 font-bold">
          <Icon className="h-5 w-5" />
          {title}
        </div>
        <div className="h-6 w-6 rounded-full bg-white/50 flex items-center justify-center text-xs">
          {count}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {children}
      </div>
    </div>
  );
}

function OrderCard({ order, onNext, nextLabel, onCancel }: any) {
  const timeAgo = formatDistanceToNow(order.createdAt, { addSuffix: true });

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 transition-all hover:shadow-md">
      <div className="flex items-start justify-between mb-3 border-b border-border/50 pb-3">
        <div>
          <h3 className="text-xl font-bold text-brown-deep">Table {order.tableId}</h3>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3 mr-1" />
            {timeAgo}
          </div>
        </div>
        <div className="font-bold text-lg text-gold">
          ₹{order.total}
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        {order.items.map((item: any, idx: number) => (
          <div key={idx} className="flex items-start justify-between text-sm">
            <span className="font-medium text-brown-deep/80">
              <span className="text-muted-foreground mr-1">{item.quantity}x</span>
              {item.name}
            </span>
            <span className="text-muted-foreground ml-2">₹{item.price * item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onNext}
          className="flex-1 bg-brown-gradient text-cream py-2.5 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
        >
          {nextLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
        {onCancel && (
          <button 
            onClick={onCancel}
            className="p-2.5 text-red-500 bg-red-50 rounded-xl hover:bg-red-100 active:scale-95 transition-all"
            title="Cancel Order"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground font-medium text-sm border-2 border-dashed border-border/60 rounded-2xl py-12">
      {text}
    </div>
  );
}
