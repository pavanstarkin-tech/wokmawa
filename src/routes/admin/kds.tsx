import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Clock, Check, Play, AlertCircle, UtensilsCrossed } from "lucide-react";
import logger from "@/services/logger/Logger";

export const Route = createFileRoute("/admin/kds")({
  component: KDSPage,
});

interface KDSOrder {
  id: string;
  tableId?: string;
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  createdAt: string;
  items: Array<{ id: string; name: string; quantity: number; notes?: string; type?: "veg" | "non-veg" }>;
}

function KDSPage() {
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeNow, setTimeNow] = useState(Date.now());

  // Keep time ticking to refresh ticket waiting clocks
  useEffect(() => {
    const timer = setInterval(() => setTimeNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Listen to live orders from Firebase
  useEffect(() => {
    const ordersRef = ref(db, "restaurant/orders");
    const unsub = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const parsed: KDSOrder[] = Object.keys(data)
        .map((key) => ({
          id: key,
          ...data[key],
        }))
        // Filter out completed and cancelled orders, only keep active KDS tickets
        .filter((o) => ["pending", "preparing", "ready"].includes(o.status))
        // Sort oldest first (FIFO - First In First Out)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      setOrders(parsed);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const updateStatus = async (orderId: string, status: KDSOrder["status"]) => {
    try {
      const orderRef = ref(db, `restaurant/orders/${orderId}`);
      await update(orderRef, { status, updatedAt: Date.now() });
      logger.info("pos", `KDS updated order status: ${orderId} -> ${status}`);
    } catch (e) {
      logger.error("pos", "Failed KDS status write", e);
    }
  };

  // Helper to calculate elapsed time in minutes
  const getElapsedMinutes = (createdAtStr: string) => {
    const created = new Date(createdAtStr).getTime();
    const diffMs = timeNow - created;
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  // Color coding tickets based on wait time
  const getTicketColor = (minutes: number, status: string) => {
    if (status === "ready") return "border-green-500 bg-green-50/10";
    if (minutes >= 15) return "border-red-500 bg-red-50/15 animate-pulse-slow";
    if (minutes >= 10) return "border-orange-400 bg-orange-50/10";
    return "border-border/80 bg-background";
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-brown-deep tracking-tight">Kitchen Display System (KDS)</h1>
          <p className="text-xs text-muted-foreground mt-1">Live updates | Double-click or press buttons to change status</p>
        </div>
        
        {/* Connection status */}
        <div className="flex items-center gap-4 bg-card px-4 py-2 border border-border/60 rounded-xl shadow-sm">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-ping" />
          <span className="text-xs font-semibold text-brown-deep">Kitchen Terminals Syncing</span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
          <UtensilsCrossed className="h-12 w-12 text-gold opacity-40 mb-3" />
          <p className="text-sm font-semibold">Kitchen queue is clear.</p>
          <p className="text-xs mt-1">New customer and table bills will appear here automatically.</p>
        </div>
      ) : (
        /* KDS Tickets Grid */
        <div className="flex-1 overflow-x-auto no-scrollbar pb-4">
          <div className="flex gap-5 px-1 pb-3 w-max select-none h-full">
            {orders.map((o) => {
              const elapsed = getElapsedMinutes(o.createdAt);
              const cardClass = getTicketColor(elapsed, o.status);

              return (
                <div
                  key={o.id}
                  className={`w-72 border rounded-3xl overflow-hidden shadow-luxe flex flex-col transition-all max-h-[90%] ${cardClass}`}
                >
                  {/* Ticket Header */}
                  <div className="p-4 border-b border-border/40 bg-card flex justify-between items-center">
                    <div>
                      <h3 className="font-extrabold text-sm text-brown-deep uppercase">
                        Table {o.tableId || "POS"}
                      </h3>
                      <span className="text-[9px] text-muted-foreground block font-medium">
                        ID: {o.id.substring(0, 8)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-background px-2.5 py-1 rounded-lg border border-border/40">
                      <Clock className="h-3 w-3 text-gold" />
                      <span>{elapsed}m ago</span>
                    </div>
                  </div>

                  {/* KDS Items */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-card/45">
                    {o.items?.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-2 border-b border-dashed border-border/30 pb-2 last:border-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-block h-2 w-2 rounded-full ${it.type === "veg" ? "bg-green-600" : "bg-red-600"}`} />
                            <span className="text-xs font-bold text-brown-deep truncate block">
                              {it.name}
                            </span>
                          </div>
                          {it.notes && (
                            <span className="text-[10px] italic text-red-600 font-medium mt-1 block">
                              * {it.notes}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-black text-gold bg-gold/10 px-2 py-0.5 rounded shadow-sm shrink-0">
                          x{it.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Ticket Actions */}
                  <div className="p-3 border-t border-border/40 bg-card flex gap-2 justify-between">
                    {o.status === "pending" && (
                      <button
                        onClick={() => updateStatus(o.id, "preparing")}
                        className="flex-1 bg-brown-gradient text-cream text-[10px] font-bold uppercase tracking-wider py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <Play className="h-3.5 w-3.5" /> Start Cooking
                      </button>
                    )}

                    {o.status === "preparing" && (
                      <button
                        onClick={() => updateStatus(o.id, "ready")}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold uppercase tracking-wider py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <Check className="h-3.5 w-3.5" /> Mark Ready
                      </button>
                    )}

                    {o.status === "ready" && (
                      <button
                        onClick={() => updateStatus(o.id, "completed")}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <AlertCircle className="h-3.5 w-3.5" /> Dispatched / Done
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
