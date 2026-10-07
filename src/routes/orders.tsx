import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Flame,
  ChefHat,
  Bell,
  Clock,
  ArrowRight,
  ShoppingBag,
  RotateCcw,
} from "lucide-react";
import { useWokStore } from "@/lib/wokmawa-store";
import { WokHeader } from "@/components/wokmawa/WokHeader";
import { VegBadge } from "@/components/wokmawa/WokBadge";

export const Route = createFileRoute("/orders")({
  component: WokOrdersPage,
});

function WokOrdersPage() {
  const { activeOrder, tableNumber } = useWokStore();
  const [prepTimeRemaining, setPrepTimeRemaining] = useState(12);

  // Simulated countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setPrepTimeRemaining((prev) => Math.max(1, prev - 1));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const stages = [
    { title: "Order Confirmed", desc: "Received at Kitchen Station", icon: CheckCircle2, done: true },
    { title: "Cooking in Wok", desc: "Chef tossing on high flame", icon: Flame, current: true },
    { title: "Plating & Garnishing", desc: "Sprinkling crunchy garlic", icon: ChefHat, done: false },
    { title: "Served to Table", desc: `Arriving at Table #${tableNumber}`, icon: Bell, done: false },
  ];

  if (!activeOrder) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col justify-between p-4">
        <WokHeader title="Live Orders" showBack backTo="/" />

        <div className="max-w-md mx-auto text-center space-y-4 my-auto p-6 bg-[#141414] border border-[#27272A] rounded-3xl shadow-card-luxe">
          <div className="w-16 h-16 rounded-full bg-[#1C1C1C] flex items-center justify-center mx-auto text-3xl">
            🥢
          </div>
          <h2 className="font-display font-black text-2xl text-white">
            No Active Orders
          </h2>
          <p className="text-xs text-[#A1A1AA]">
            You have no active kitchen orders in progress for Table #{tableNumber}.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#E8C547] via-[#D4AF37] to-[#C9A227] text-black font-extrabold text-sm shadow-gold-glow"
          >
            <span>START AN ORDER</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="text-center text-[11px] text-[#A1A1AA]/60 pb-4">
          WOKMAWA • Table #{tableNumber}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white pb-28">
      <WokHeader title="Live Kitchen Status" showBack backTo="/" />

      <main className="max-w-xl mx-auto px-4 space-y-5 pt-4">
        {/* Order Header Card */}
        <div className="p-4 bg-gradient-to-r from-[#1A1A1A] to-[#121212] border border-[#D4AF37]/50 rounded-2xl space-y-3 shadow-gold-glow">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#A1A1AA] uppercase font-bold tracking-wider">
                Order Tracking
              </span>
              <h2 className="font-display font-black text-xl text-gold-gradient">
                #{activeOrder.orderId}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#A1A1AA]">Table Number</span>
              <div className="text-base font-extrabold text-white">
                Table #{activeOrder.tableNumber}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#27272A] text-xs">
            <div className="flex items-center gap-1.5 text-[#D4AF37]">
              <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
              <span className="font-bold">Estimated Time:</span>
            </div>
            <span className="font-extrabold text-white text-sm">
              ~{prepTimeRemaining} Mins
            </span>
          </div>
        </div>

        {/* 4-Stage Tracker */}
        <div className="p-5 bg-[#141414] border border-[#27272A] rounded-2xl space-y-5 shadow-card-luxe">
          <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">
            Order Progress
          </h3>

          <div className="space-y-6 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#27272A]">
            {stages.map((stage, idx) => {
              const Icon = stage.icon;
              return (
                <div key={stage.title} className="relative flex items-start gap-3.5">
                  <div
                    className={`absolute -left-6 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs z-10 transition-all ${
                      stage.done
                        ? 'bg-[#22C55E] text-black font-bold'
                        : stage.current
                        ? 'bg-gradient-to-r from-[#FF3B3B] to-[#F97316] text-white shadow-flame-glow animate-pulse'
                        : 'bg-[#1C1C1C] text-[#A1A1AA] border border-[#27272A]'
                    }`}
                  >
                    {stage.done ? '✓' : <Icon className="w-3.5 h-3.5" />}
                  </div>

                  <div>
                    <div
                      className={`font-bold text-sm ${
                        stage.current ? 'text-[#D4AF37]' : stage.done ? 'text-white' : 'text-[#A1A1AA]'
                      }`}
                    >
                      {stage.title} {stage.current && '🔥'}
                    </div>
                    <div className="text-xs text-[#A1A1AA] mt-0.5">{stage.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ordered Items Summary */}
        <div className="p-4 bg-[#141414] border border-[#27272A] rounded-2xl space-y-3">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#A1A1AA]">
            Items in This Order ({activeOrder.items.length})
          </h3>

          <div className="space-y-2">
            {activeOrder.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 bg-[#1A1A1A] rounded-xl text-xs"
              >
                <div className="flex items-center gap-2">
                  <VegBadge isVeg={item.isVeg} size="sm" />
                  <div>
                    <span className="font-bold text-white">
                      {item.quantity}x {item.name}
                    </span>
                    <div className="text-[10px] text-[#D4AF37]">
                      {item.portionName} • {item.spiceLevel.name} Spice
                    </div>
                  </div>
                </div>
                <span className="font-extrabold text-white">₹{item.totalPrice}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#27272A] flex justify-between text-xs font-bold">
            <span className="text-[#A1A1AA]">Total Paid</span>
            <span className="text-[#D4AF37] text-sm">₹{activeOrder.grandTotal}</span>
          </div>
        </div>

        {/* Order More Button */}
        <Link
          to="/"
          className="w-full py-3.5 px-4 rounded-xl bg-[#141414] border border-[#27272A] hover:border-[#D4AF37] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
        >
          <RotateCcw className="w-4 h-4 text-[#D4AF37]" />
          <span>ORDER MORE DISHES</span>
        </Link>
      </main>
    </div>
  );
}
