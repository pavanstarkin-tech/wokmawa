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
    if (status === "ready") return "border-emerald-500/50 bg-[#141414]";
    if (minutes >= 15) return "border-red-500/60 bg-[#141414] shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse";
    if (minutes >= 10) return "border-amber-500/60 bg-[#141414]";
    return "border-[#27272A] bg-[#141414]";
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
        <div>
          <h1 className="text-2xl font-black font-display text-white tracking-tight">Kitchen Display System (KDS)</h1>
          <p className="text-xs text-[#A1A1AA] mt-1">Live updates | Double-click or press buttons to change status</p>
        </div>
        
        {/* Connection status */}
        <div className="flex items-center gap-2.5 bg-[#141414] px-4 py-2 border border-[#27272A] rounded-xl shadow-sm">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold text-white">Kitchen Terminals Syncing</span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#D4AF37] border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-[#71717A]">
          <UtensilsCrossed className="h-12 w-12 text-[#D4AF37] opacity-40 mb-3" />
          <p className="text-sm font-bold text-white">Kitchen queue is clear.</p>
          <p className="text-xs mt-1 text-[#A1A1AA]">New customer and table bills will appear here automatically.</p>
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
                  className={`w-72 border rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col transition-all max-h-[90%] ${cardClass}`}
                >
                  {/* Ticket Header */}
                  <div className="p-4 border-b border-[#27272A] bg-[#181818] flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-sm text-white uppercase">
                        Table {o.tableId || "POS"}
                      </h3>
                      <span className="text-[9px] text-[#A1A1AA] block font-mono">
                        ID: {o.id.substring(0, 8)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-[10px] font-bold text-[#D4AF37] bg-[#121212] px-2.5 py-1 rounded-lg border border-[#27272A]">
                      <Clock className="h-3 w-3 text-[#D4AF37]" />
                      <span>{elapsed}m ago</span>
                    </div>
                  </div>

                  {/* KDS Items */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#111111]">
                    {o.items?.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-2 border-b border-dashed border-[#27272A] pb-2 last:border-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-block h-2 w-2 rounded-full ${it.type === "veg" ? "bg-emerald-500" : "bg-red-500"}`} />
                            <span className="text-xs font-bold text-[#E4E4E7] truncate block">
                              {it.name}
                            </span>
                          </div>
                          {it.notes && (
                            <span className="text-[10px] italic text-red-400 font-medium mt-1 block">
                              * {it.notes}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-black text-[#D4AF37] bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 rounded shadow-sm shrink-0">
                          x{it.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Ticket Actions */}
                  <div className="p-3 border-t border-[#27272A] bg-[#181818] flex gap-2 justify-between">
                    {o.status === "pending" && (
                      <button
                        onClick={() => updateStatus(o.id, "preparing")}
                        className="flex-1 bg-gradient-to-r from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black text-[10px] font-black uppercase tracking-wider py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-gold-glow active:scale-95 transition-all cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-black" /> Start Cooking
                      </button>
                    )}

                    {o.status === "preparing" && (
                      <button
                        onClick={() => updateStatus(o.id, "ready")}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-[10px] uppercase tracking-wider py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3]" /> Mark Ready
                      </button>
                    )}

                    {o.status === "ready" && (
                      <button
                        onClick={() => updateStatus(o.id, "completed")}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
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
