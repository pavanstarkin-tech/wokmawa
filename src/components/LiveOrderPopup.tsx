import { useEffect, useState } from "react";
import { Sparkles, Printer, Check, X } from "lucide-react";
import { dbEventBus } from "@/core/database/DatabaseEventBus";

export function LiveOrderPopup() {
  const [activeOrder, setActiveOrder] = useState<any | null>(null);

  useEffect(() => {
    // Listen for mock incoming live order events
    const handleNewOrder = (order: any) => {
      setActiveOrder(order);
      // Play a soft bell ring alert notification sound
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-84.wav");
        audio.volume = 0.3;
        audio.play();
      } catch {
        // Blocks audio autoplay failures gracefully
      }
    };

    dbEventBus.on("billing.completed", handleNewOrder);
    return () => {
      dbEventBus.off("billing.completed", handleNewOrder);
    };
  }, []);

  if (!activeOrder) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-card border border-border/80 rounded-2xl shadow-2xl p-4 animate-slide-in text-brown-deep flex flex-col gap-3">
      <div className="flex justify-between items-center border-b pb-2">
        <h4 className="font-black text-xs text-gold flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles className="h-4 w-4 animate-pulse text-gold" /> Incoming Ticket
        </h4>
        <button onClick={() => setActiveOrder(null)} className="text-muted-foreground hover:text-brown-deep">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="text-xs space-y-1">
        <div><strong>Bill Amount:</strong> ₹{activeOrder.grandTotal || activeOrder.amountPaid || 120}</div>
        <div className="text-[10px] text-muted-foreground">Cashier: {activeOrder.cashierName || "Main Terminal"}</div>
      </div>

      <div className="flex gap-2 pt-1 border-t border-border/30 text-xs">
        <button
          onClick={() => {
            alert("KOT printed successfully.");
            setActiveOrder(null);
          }}
          className="flex-1 py-1.5 bg-gold/10 hover:bg-gold/20 text-brown-deep font-bold rounded-lg border border-gold/30 flex items-center justify-center gap-1.5"
        >
          <Printer className="h-3.5 w-3.5" /> Print KOT
        </button>
        <button
          onClick={() => {
            setActiveOrder(null);
          }}
          className="flex-1 py-1.5 bg-brown-deep text-gold font-bold rounded-lg hover:opacity-95 flex items-center justify-center gap-1.5"
        >
          <Check className="h-3.5 w-3.5" /> Accept
        </button>
      </div>
    </div>
  );
}
export default LiveOrderPopup;
