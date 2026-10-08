import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Check,
  Flame,
  ShoppingBag,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  FileText,
  UtensilsCrossed,
  Store,
  X,
} from "lucide-react";
import { useWokStore } from "@/lib/wokmawa-store";
import { WokHeader } from "@/components/wokmawa/WokHeader";
import { WOKMAWA_ASSETS } from "@/lib/wokmawa-menu";

// Crisp Red Vector Chilli Icon
const RedChilliIcon: React.FC<{ className?: string }> = ({
  className = 'w-3.5 h-3.5',
}) => (
  <svg
    className={`${className} inline-block shrink-0 drop-shadow-[0_0_4px_rgba(255,40,40,0.6)]`}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M14.5 3.5C15.2 2.5 16.5 2 17.5 2C17.8 2 18 2.3 17.7 2.7C16.8 3.8 15.8 4.4 14.8 5"
      stroke="#4ADE80"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M15.5 5.5C14.5 4.5 12.8 4.2 11.2 4.8C8.8 5.7 7.2 8.2 6.8 10.8C6.2 14.5 8.2 18.2 11.8 21.2C12.3 21.6 13 21.2 13.2 20.6C14.8 16.2 17.8 11.8 17.5 8C17.4 6.8 16.6 5.8 15.5 5.5Z"
      fill="#FF2626"
    />
  </svg>
);

// Helper to resolve accurate high-res addon image from assets
const getExtraImage = (extra: { id?: string; name?: string; image?: string }) => {
  if (extra.image) return extra.image;
  const nameLower = (extra.name || '').toLowerCase();
  if (nameLower.includes('egg') || nameLower.includes('omlet')) return WOKMAWA_ASSETS.ADDON_EGG;
  if (nameLower.includes('chicken') || nameLower.includes('meat')) return WOKMAWA_ASSETS.ADDON_CHICKEN;
  if (nameLower.includes('sauce') || nameLower.includes('dip') || nameLower.includes('oil')) return WOKMAWA_ASSETS.ADDON_SAUCE;
  return WOKMAWA_ASSETS.ADDON_SAUCE;
};

export const Route = createFileRoute("/orders")({
  component: WokOrdersPage,
});

function WokOrdersPage() {
  const navigate = useNavigate();
  const { activeOrder, orderHistory, tableNumber, actions } = useWokStore();
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Poll for real-time status updates from Restocare
  useEffect(() => {
    actions.syncAllOrdersStatus();
    const interval = setInterval(() => {
      actions.syncAllOrdersStatus();
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Current order to display
  const order = activeOrder || (orderHistory && orderHistory.length > 0 ? orderHistory[0] : null) || {
    orderId: "WM-1042",
    tableNumber: tableNumber || "08",
    items: [
      {
        id: "demo-1",
        menuItemId: "wn-01",
        name: "Mawa Hot Noodles",
        categoryName: "Wok Noodles",
        image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=700&auto=format&fit=crop&q=80",
        isVeg: true,
        portionName: "Regular Box",
        portionPrice: 189,
        spiceLevel: { id: "hot", name: "Hot", subtitle: "Street Style Fiery", chillies: 3, color: "#FF3B3B" },
        extras: [{ id: "ex-extra-sauce", name: "Extra Sauce", price: 20, category: "sauces", isVeg: true }],
        quantity: 1,
        unitPrice: 209,
        totalPrice: 209,
      },
    ],
    itemTotal: 189,
    taxGst: 10,
    packagingCharge: 25,
    discount: 0,
    grandTotal: 224,
    paymentMethod: "upi",
    status: "cooking",
    createdAt: new Date().toISOString(),
    prepTimeMinutes: 10,
  };

  const isCancelled = order.status === 'cancelled';
  const isCooking = order.status === 'cooking' || order.status === 'preparing';
  const isReady = order.status === 'ready';
  const isServed = order.status === 'served' || order.status === 'completed';

  const totalItemsCount = order.items.length;
  const activeItems = order.items.filter((i) => !i.isCancelled && i.status !== 'cancelled');
  const readyItems = activeItems.filter((i) => i.isCompleted || i.status === 'ready' || i.status === 'served');
  const cancelledItems = order.items.filter((i) => i.isCancelled || i.status === 'cancelled');

  const allItemsReady = activeItems.length > 0 && readyItems.length === activeItems.length;
  const isPartiallyReady = readyItems.length > 0 && readyItems.length < activeItems.length;

  const orderTimeStr = order.createdAt 
    ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  const paymentLabel =
    order.paymentMethod === 'upi'
      ? 'Paid via UPI (Google Pay)'
      : order.paymentMethod === 'card'
      ? 'Paid via Debit / Credit Card'
      : 'Pay at Counter (Dine-In)';

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-36 relative animate-fade-in">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#FF4500]/10 via-black/40 to-black z-0" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#27272A] px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate({ to: '/' })}
          className="w-9 h-9 rounded-full bg-[#181818] border border-[#27272A] flex items-center justify-center text-white hover:border-[#D4AF37] active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <img
          src="/assets/logo.png"
          alt="WokMawa"
          className="h-8 w-auto object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/wokmawa/assets/logo.png';
          }}
        />

        <div className="px-3 py-1.5 rounded-full bg-[#18150D] border border-[#D4AF37]/40 flex items-center gap-1.5 text-xs text-[#D4AF37] font-bold">
          <Store className="w-3.5 h-3.5" />
          <span>TABLE {order.tableNumber}</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 space-y-4 pt-4 relative z-10">
        {/* Multiple Orders Selector Tabs */}
        {orderHistory && orderHistory.length > 1 && (
          <div className="p-2.5 bg-[#121212] border border-[#27272A] rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#A1A1AA]">
              <span className="uppercase tracking-wider">Your Active Orders ({orderHistory.length})</span>
              <span className="text-[#D4AF37]">Table {order.tableNumber}</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {orderHistory.map((ord, idx) => {
                const isSelected = order.orderId === ord.orderId;
                const statusBadge =
                  ord.status === 'cancelled' ? 'Cancelled' :
                  ord.status === 'ready' ? 'Ready' :
                  ord.status === 'served' ? 'Served' :
                  'Preparing';
                return (
                  <button
                    key={ord.orderId || idx}
                    type="button"
                    onClick={() => actions.selectOrder(ord.orderId)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black border-transparent shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                        : 'bg-[#181818] border-[#2A2A2A] text-white hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <span>#{ord.orderId}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-black/20 text-black'
                        : ord.status === 'cancelled'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-white/10 text-[#D4AF37]'
                    }`}>
                      {statusBadge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Title Header */}
        <div className="text-center space-y-0.5">
          <div className="text-[10px] sm:text-[11px] font-black tracking-[0.25em] text-[#D4AF37] uppercase">
            LIVE ORDER STATUS
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            ORDER <span className={isCancelled ? 'text-[#EF4444]' : 'text-[#F3D362]'}>#{order.orderId}</span>
          </h1>
          <div className="text-xs text-[#A1A1AA] font-semibold">
            TABLE {order.tableNumber} • DINE-IN
          </div>
        </div>

        {/* ORDER CANCELLED BANNER */}
        {isCancelled && (
          <div className="p-4 bg-gradient-to-r from-[#240C0C] via-[#1A0808] to-[#240C0C] border-2 border-[#EF4444] rounded-2xl space-y-2 shadow-[0_4px_25px_rgba(239,68,68,0.35)] animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#EF4444]/20 border border-[#EF4444] flex items-center justify-center text-[#EF4444] shrink-0 font-black text-base">
                ✕
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-[#F87171] uppercase tracking-wider">
                  Order Cancelled by Restaurant
                </div>
                <p className="text-xs text-[#E5E7EB] mt-0.5 leading-relaxed">
                  The restaurant manager has cancelled this order. Table #{order.tableNumber} is now available.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-[#EF4444]/30 flex items-center justify-between">
              <span className="text-[11px] text-[#A1A1AA]">Status: <strong className="text-[#F87171]">CANCELLED</strong></span>
              <button
                type="button"
                onClick={() => navigate({ to: '/' })}
                className="px-3 py-1.5 rounded-xl bg-[#EF4444] text-white font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                Place New Order →
              </button>
            </div>
          </div>
        )}

        {/* 3-Step Live Progress Tracker (Only when not cancelled) */}
        {!isCancelled && (
          <div className="p-3.5 bg-[#121212]/90 border border-[#27272A] rounded-2xl shadow-card-luxe backdrop-blur-md">
            <div className="flex items-center justify-between relative">
              {/* Step 1: Order Received (Always Checked) */}
              <div className="flex flex-col items-center flex-1 z-10 min-w-0 px-1 text-center">
                <div className="w-9 h-9 rounded-full bg-[#10B981]/20 border-2 border-[#10B981] text-[#10B981] flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                  <Check className="w-4 h-4 stroke-[3.5]" />
                </div>
                <span className="text-[10px] mt-1.5 font-bold text-white leading-tight truncate w-full">
                  Order Received
                </span>
                <span className="text-[9px] text-[#71717A] mt-0.5 truncate w-full">
                  {orderTimeStr}
                </span>
              </div>

              {/* Connector Line 1 */}
              <div className={`flex-1 -mx-2 h-[2.5px] self-start mt-4.5 transition-all ${
                isCooking || isReady || isServed
                  ? 'bg-gradient-to-r from-[#10B981] to-[#F3D362] shadow-[0_0_6px_rgba(243,211,98,0.5)]'
                  : 'bg-[#27272A]'
              }`} />

              {/* Step 2: Preparing */}
              <div className="flex flex-col items-center flex-1 z-10 min-w-0 px-1 text-center">
                {isReady || isServed ? (
                  <div className="w-9 h-9 rounded-full bg-[#10B981]/20 border-2 border-[#10B981] text-[#10B981] flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                    <Check className="w-4 h-4 stroke-[3.5]" />
                  </div>
                ) : isCooking ? (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black flex items-center justify-center shadow-[0_0_15px_rgba(243,211,98,0.7)] border-2 border-[#F3D362] animate-pulse">
                    <Flame className="w-4 h-4 stroke-[2.5] fill-black" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#181818] border-2 border-[#333333] text-[#71717A] flex items-center justify-center">
                    <Flame className="w-4 h-4" />
                  </div>
                )}
                <span className={`text-[10px] mt-1.5 font-bold leading-tight truncate w-full ${
                  isCooking ? 'text-[#F3D362] font-black' : isReady || isServed ? 'text-white' : 'text-[#71717A]'
                }`}>
                  Preparing
                </span>
                <span className="text-[9px] text-[#D4AF37] mt-0.5 font-medium italic truncate w-full">
                  {isReady || isServed ? 'Cooked' : isCooking ? 'Firing up!' : 'Queued'}
                </span>
              </div>

              {/* Connector Line 2 */}
              <div className={`flex-1 -mx-2 h-[2.5px] self-start mt-4.5 transition-all ${
                isReady || isServed
                  ? 'bg-gradient-to-r from-[#F3D362] to-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                  : 'bg-[#27272A]'
              }`} />

              {/* Step 3: Ready / Served */}
              <div className="flex flex-col items-center flex-1 z-10 min-w-0 px-1 text-center">
                {isServed ? (
                  <div className="w-9 h-9 rounded-full bg-[#10B981]/20 border-2 border-[#10B981] text-[#10B981] flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                    <Check className="w-4 h-4 stroke-[3.5]" />
                  </div>
                ) : isReady ? (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#10B981] via-[#059669] to-[#047857] text-white flex items-center justify-center shadow-[0_0_18px_rgba(16,185,129,0.8)] border-2 border-[#34D399] animate-bounce">
                    <UtensilsCrossed className="w-4 h-4 stroke-[2.5]" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#181818] border-2 border-[#333333] text-[#71717A] flex items-center justify-center">
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                )}
                <span className={`text-[10px] mt-1.5 font-medium leading-tight truncate w-full ${
                  isReady ? 'text-[#34D399] font-black' : isServed ? 'text-white font-bold' : 'text-[#71717A]'
                }`}>
                  {isServed ? 'Served' : 'Ready'}
                </span>
                <span className={`text-[9px] mt-0.5 truncate w-full ${
                  isReady ? 'text-[#34D399] font-bold' : 'text-[#52525B]'
                }`}>
                  {isServed ? 'Enjoy your meal!' : isReady ? 'Serving at table' : 'Next'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PARTIAL KITCHEN ITEM READINESS BAR */}
        {!isCancelled && isPartiallyReady && (
          <div className="p-3.5 bg-gradient-to-r from-[#18150D] via-[#241E10] to-[#18150D] border border-[#D4AF37] rounded-2xl space-y-2 shadow-[0_4px_18px_rgba(212,175,55,0.22)] animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base animate-bounce">🔔</span>
                <span className="text-xs font-black text-[#F3D362] uppercase tracking-wide">
                  {readyItems.length} of {activeItems.length} Dishes Ready & Plated!
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] font-black uppercase border border-[#10B981]/30">
                Partially Ready
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 bg-[#1F1F1F] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F3D362] to-[#10B981] transition-all duration-500 rounded-full"
                style={{ width: `${(readyItems.length / activeItems.length) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-[#A1A1AA] italic">
              The kitchen is finishing the remaining {activeItems.length - readyItems.length} items in the wok now.
            </p>
          </div>
        )}

        {/* Hero Banner with Calligraphy "Good Food Takes a Little Time" */}
        <div className="relative w-full rounded-2xl overflow-hidden border border-[#D4AF37]/35 shadow-[0_6px_25px_rgba(0,0,0,0.8)] bg-black min-h-[140px] flex items-center justify-between p-4">
          {/* Background Flaming Stir-Fry Artwork */}
          <img
            src={WOKMAWA_ASSETS.ORDER_CONFIRMED_BG}
            alt="Flaming Wok in Golden Kitchen"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/80" />

          {/* Left / Center Content */}
          <div className="relative z-10 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#F3D362]">
              {isCancelled ? 'ORDER CANCELLED' : isServed ? 'ORDER COMPLETE' : 'KITCHEN MASTER AT WORK'}
            </span>
            <div className="font-display font-black text-xl sm:text-2xl text-white italic drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {isCancelled ? 'Cancelled' : isServed ? 'Freshly Served' : 'Fresh & Sizzling'}
            </div>
          </div>

          {/* Right Calligraphy Quote */}
          <div className="relative z-10 text-right max-w-[140px]">
            <div className="font-serif italic text-sm sm:text-base text-[#F3D362] leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              "Good Food Takes a Little Time"
            </div>
            <div className="w-16 h-1 bg-gradient-to-r from-transparent to-[#FF2626] rounded-full ml-auto mt-1" />
          </div>
        </div>

        {/* ORDER ITEMS Card with Real-time item badges */}
        <div className="p-4 bg-[#121212] border border-[#27272A] rounded-2xl space-y-3 shadow-card-luxe">
          <div className="flex items-center justify-between border-b border-[#222222] pb-2">
            <h3 className="font-display font-black text-xs sm:text-sm uppercase tracking-wider text-white">
              ORDER ITEMS
            </h3>
            <span className="text-xs text-[#A1A1AA] font-bold">
              {order.items.length} Items {readyItems.length > 0 && !isCancelled && !isServed && `(${readyItems.length} ready)`}
            </span>
          </div>

          <div className="space-y-3 divide-y divide-[#1F1F1F]">
            {order.items.map((item, idx) => {
              const itemCancelled = Boolean(item.isCancelled || item.status === 'cancelled');
              const itemReady = Boolean(item.isCompleted || item.status === 'ready' || item.status === 'served' || isReady || isServed);
              const itemCooking = Boolean(item.status === 'cooking' || isCooking);

              return (
                <div key={idx} className={`flex items-start justify-between gap-3 ${idx > 0 ? 'pt-3' : ''}`}>
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#1C1C1C] border border-[#2A2A2A] shrink-0 shadow-sm relative">
                      <img
                        src={item.image}
                        alt={item.name}
                        className={`w-full h-full object-cover ${itemCancelled ? 'grayscale opacity-50' : ''}`}
                      />
                      {itemCancelled && (
                        <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center text-red-400 font-black text-xs">
                          ✕
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className={`font-display font-bold text-xs sm:text-sm truncate ${itemCancelled ? 'text-[#71717A] line-through' : 'text-white'}`}>
                        {item.name}
                      </h4>
                      <div className="text-[11px] text-[#A1A1AA] font-semibold mt-0.5">
                        x{item.quantity}
                      </div>

                      {/* Item Status Badge */}
                      <div className="mt-1">
                        {itemCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-[10px] font-extrabold uppercase">
                            <span>✕</span>
                            <span>Cancelled</span>
                          </span>
                        ) : itemReady ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] text-[10px] font-extrabold uppercase">
                            <span>✓</span>
                            <span>Ready & Sizzling</span>
                          </span>
                        ) : itemCooking ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F3D362]/15 border border-[#F3D362]/40 text-[#F3D362] text-[10px] font-extrabold uppercase">
                            <span className="animate-pulse">🔥</span>
                            <span>Cooking in Wok</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#27272A] text-[#A1A1AA] text-[10px] font-bold uppercase">
                            <span>⏳</span>
                            <span>Queued in Kitchen</span>
                          </span>
                        )}
                      </div>

                      {/* Spice Level Row */}
                      {item.spiceLevel && (
                        <div className="flex items-center gap-1 text-[11px] text-[#A1A1AA] mt-1">
                          <span>{item.spiceLevel.name}</span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: item.spiceLevel.chillies || 1 }).map((_, i) => (
                              <RedChilliIcon key={i} className="w-3 h-3" />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Extras */}
                      {item.extras && item.extras.length > 0 && item.extras.map((extra) => (
                        <div key={extra.id} className="text-[10px] text-[#D4AF37] font-medium mt-0.5">
                          {extra.name} +₹{extra.price}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`font-display font-black text-xs sm:text-sm shrink-0 ${itemCancelled ? 'text-[#71717A] line-through' : 'text-white'}`}>
                    ₹{item.totalPrice}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Status Card */}
        <div className="p-3.5 bg-[#121212] border border-[#27272A] rounded-2xl flex items-center justify-between gap-3 shadow-card-luxe">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] shrink-0">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white">Payment Successful</div>
              <div className="text-[10px] text-[#A1A1AA] truncate">{paymentLabel}</div>
              <div className="text-[10px] text-[#71717A]">{order.createdAt}</div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="font-display font-black text-base text-white">
              ₹{order.grandTotal}
            </div>
            <div className="text-[10px] font-black text-[#10B981] tracking-wider uppercase">
              PAID
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          {/* Big Shiny Gold Order More Button */}
          <Link
            to="/"
            className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black font-display font-black text-sm uppercase tracking-wider shadow-gold-glow hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
            <span>ORDER MORE</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </Link>

          {/* View Order Details Receipt Button */}
          <button
            type="button"
            onClick={() => setShowReceiptModal(true)}
            className="w-full py-3.5 px-6 rounded-full bg-[#141414] border border-[#27272A] hover:border-[#D4AF37] text-white font-display font-bold text-xs uppercase tracking-wider hover:bg-[#1A1A1A] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#D4AF37]" />
            <span>VIEW ORDER DETAILS</span>
          </button>
        </div>
      </main>

      {/* 30px Black Shade from Bottom to Top */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-[30px] bg-gradient-to-t from-black via-black/80 to-transparent z-40" />

      {/* Receipt Breakdown Drawer Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-[#0F0F0F] border border-[#27272A] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-display font-black text-base sm:text-lg text-white">
                    Order Details
                  </div>
                  <div className="text-[11px] font-bold text-[#F3D362]">
                    #{order.orderId}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="w-8 h-8 rounded-full bg-[#1C1C1C] border border-[#2A2A2A] flex items-center justify-center text-[#A1A1AA] hover:text-white active:scale-90 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Diner & Table Details Card */}
            <div className="p-3.5 bg-[#141414] border border-[#222222] rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-white">
                <div className="flex items-center gap-1.5 text-[#D4AF37]">
                  <Store className="w-4 h-4" />
                  <span>Table #{order.tableNumber} • Dine In</span>
                </div>
                <span className="text-[11px] text-[#A1A1AA] font-normal">{order.createdAt}</span>
              </div>

              <div className="pt-2 border-t border-[#1F1F1F] grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-[#71717A] block">Customer Name</span>
                  <span className="text-white font-bold">{order.customer?.name || 'Guest Diner'}</span>
                </div>
                <div>
                  <span className="text-[#71717A] block">Phone Number</span>
                  <span className="text-white font-bold">{order.customer?.phone || 'Not Provided (Guest)'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[#71717A] block">Payment Status</span>
                  <span className="text-[#10B981] font-bold">
                    {paymentLabel} • PAID
                  </span>
                </div>
              </div>
            </div>

            {/* Purchased Products & Add-ons List (Same Rich Design as Cart Page) */}
            <div className="space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-[#A1A1AA]">
                Purchased Items ({order.items.length})
              </div>

              <div className="space-y-3">
                {order.items.map((item, idx) => {
                  const itemCancelled = Boolean(item.isCancelled || item.status === 'cancelled');
                  const itemReady = Boolean(item.isCompleted || item.status === 'ready' || item.status === 'served' || isReady || isServed);
                  const itemCooking = Boolean(item.status === 'cooking' || isCooking);

                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-[#141414] border border-[#222222] rounded-2xl flex gap-3.5 shadow-sm"
                    >
                      {/* Left Image */}
                      <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-[#1C1C1C] shrink-0 border border-[#27272A] relative">
                        <img
                          src={item.image}
                          alt={item.name}
                          className={`w-full h-full object-cover ${itemCancelled ? 'grayscale opacity-50' : ''}`}
                        />
                        {itemCancelled && (
                          <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center text-red-400 font-black text-xs">
                            ✕
                          </div>
                        )}
                      </div>

                      {/* Right Details */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          {/* Dish Name + Base Price */}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`font-display font-black text-sm truncate ${itemCancelled ? 'text-[#71717A] line-through' : 'text-white'}`}>
                              {item.name}
                            </h4>
                            <span className={`font-display font-black text-sm shrink-0 ${itemCancelled ? 'text-[#71717A] line-through' : 'text-white'}`}>
                              ₹{item.portionPrice || Math.round(item.unitPrice)}
                            </span>
                          </div>

                          {/* Veg / Non-Veg + Status Badge */}
                          <div className="flex items-center gap-2 mt-0.5 mb-1">
                            <div className={`w-3 h-3 rounded-[3px] border flex items-center justify-center p-[2px] ${item.isVeg ? 'border-[#10B981]' : 'border-[#EF4444]'}`}>
                              <div className={`w-1 h-1 rounded-full ${item.isVeg ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                            </div>
                            <span className="text-[9px] font-black text-[#D4D4D8] uppercase tracking-wider">
                              {item.isVeg ? 'VEG' : 'NON-VEG'}
                            </span>

                            {itemCancelled ? (
                              <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[9px] font-extrabold uppercase">
                                Cancelled
                              </span>
                            ) : itemReady ? (
                              <span className="px-1.5 py-0.2 rounded bg-green-500/20 text-green-400 text-[9px] font-extrabold uppercase">
                                ✓ Ready
                              </span>
                            ) : itemCooking ? (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-extrabold uppercase">
                                🔥 Cooking
                              </span>
                            ) : null}
                          </div>

                          {/* Spice Level */}
                          {item.spiceLevel && (
                            <div className="flex items-center justify-between text-[11px] my-1">
                              <div className="flex items-center gap-1.5">
                                <RedChilliIcon className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-[#A1A1AA]">Spice Level:</span>
                                <span className="text-white font-bold">{item.spiceLevel.name}</span>
                              </div>
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: item.spiceLevel.chillies || 1 }).map((_, i) => (
                                  <RedChilliIcon key={i} className="w-3.5 h-3.5 shrink-0" />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Extras Add-ons with Real Image */}
                          {item.extras && item.extras.length > 0 && item.extras.map((extra) => {
                            const extraImg = getExtraImage(extra);
                            return (
                              <div key={extra.id} className="flex items-center justify-between text-[11px] my-1">
                                <div className="flex items-center gap-1.5">
                                  <img
                                    src={extraImg}
                                    alt={extra.name}
                                    className="w-4.5 h-4.5 object-cover rounded-full border border-[#333333] shrink-0"
                                  />
                                  <span className="text-white font-medium">{extra.name}</span>
                                </div>
                                <span className="font-bold text-[#F3D362]">
                                  + ₹{extra.price}
                                </span>
                              </div>
                            );
                          })}

                          {/* Instructions Note */}
                          {item.instructions && (
                            <div className="text-[10px] text-[#E8C547] italic mt-1 line-clamp-1">
                              Note: "{item.instructions}"
                            </div>
                          )}
                        </div>

                        {/* Quantity & Item Grand Total */}
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#1F1F1F]">
                          <span className="text-[11px] text-[#A1A1AA] font-bold">
                            Qty: <span className="text-white font-black">{item.quantity}</span>
                          </span>
                          <span className={`font-display font-black text-base ${itemCancelled ? 'text-[#71717A] line-through' : 'text-[#F3D362]'}`}>
                            ₹{item.totalPrice}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bill Details Breakdown */}
            <div className="p-4 bg-[#141414] border border-[#222222] rounded-2xl space-y-2 text-xs shadow-sm">
              <h4 className="font-display font-bold text-sm text-white border-b border-[#222222] pb-2">
                Bill Breakdown
              </h4>

              <div className="flex justify-between text-[#A1A1AA]">
                <span>Item Subtotal</span>
                <span className="text-white font-semibold">₹{order.itemTotal}</span>
              </div>

              <div className="flex justify-between text-[#A1A1AA]">
                <span>GST & Restaurant Taxes (5%)</span>
                <span className="text-white font-semibold">₹{order.taxGst}</span>
              </div>

              <div className="flex justify-between text-[#A1A1AA]">
                <span>Service & Packaging</span>
                <span className="text-white font-semibold">₹{order.packagingCharge}</span>
              </div>

              {order.discount > 0 && (
                <div className="flex justify-between text-[#22C55E] font-bold">
                  <span>Coupon Discount</span>
                  <span>-₹{order.discount}</span>
                </div>
              )}

              <div className="pt-2 border-t border-[#222222] flex justify-between text-sm font-black text-white">
                <span>Total Paid</span>
                <span className="text-[#F3D362] text-lg">₹{order.grandTotal}</span>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowReceiptModal(false)}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black font-display font-black text-xs uppercase tracking-wider shadow-gold-glow hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
