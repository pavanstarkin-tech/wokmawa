import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ShoppingBag,
  ShoppingCart,
  User,
  CreditCard,
  Store,
  Lock,
  ArrowRight,
  Plus,
  Minus,
  Check,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  FileText,
  ChefHat,
  Flame,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useWokStore, LiveOrder } from "@/lib/wokmawa-store";
import { WokHeader } from "@/components/wokmawa/WokHeader";
import { UpsellCarousel } from "@/components/wokmawa/UpsellCarousel";
import { WOKMAWA_ASSETS } from "@/lib/wokmawa-menu";

// Crisp Red Vector Chilli Icon
const RedChilliIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
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

export const Route = createFileRoute("/cart")({
  component: WokCartPage,
});

function WokCartPage() {
  const navigate = useNavigate();
  const { cart, totals, tableNumber, appliedCoupon, customer, activeOrder, actions } = useWokStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Phases: 'checkout' (steps 1, 2, 3) | 'verifying' (3s loading screen) | 'confirmed' (order confirmed screen)
  const [orderPhase, setOrderPhase] = useState<'checkout' | 'verifying' | 'confirmed'>('checkout');
  const [confirmedOrder, setConfirmedOrder] = useState<LiveOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Top Stepper State: 1 = Cart, 2 = Customer Details, 3 = Payment
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Diner Info
  const [dinerName, setDinerName] = useState(customer.name || 'Guest Diner');
  const [dinerPhone, setDinerPhone] = useState(customer.phone || '');

  // Payment Selection
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'upi' | 'card' | 'counter'>('upi');

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponRes, setCouponRes] = useState<{ text: string; success: boolean } | null>(null);

  const handleApplyCoupon = () => {
    if (!couponCode) return;
    const res = actions.applyCoupon(couponCode);
    setCouponRes({ text: res.message, success: res.success });
  };

  const handleConfirmAndPay = () => {
    if (activeOrder && activeOrder.status !== 'served') {
      navigate({ to: '/orders' });
      return;
    }

    const formattedId = `WM-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newOrder: LiveOrder = {
      orderId: formattedId,
      tableNumber,
      items: [...cart],
      itemTotal: totals.itemTotal,
      taxGst: totals.taxGst,
      packagingCharge: totals.packagingCharge,
      discount: totals.discount,
      grandTotal: totals.grandTotal,
      paymentMethod: selectedPaymentMethod,
      status: 'received',
      createdAt: `${formattedDate}, ${formattedTime}`,
      prepTimeMinutes: 12,
      customer: {
        name: dinerName.trim() || 'Guest Diner',
        phone: dinerPhone.trim(),
        email: '',
        isGuest: !dinerPhone.trim(),
      },
    };

    setConfirmedOrder(newOrder);
    setOrderPhase('verifying');

    // 3 Seconds Verification Screen
    setTimeout(() => {
      actions.setActiveOrder(newOrder);
      actions.clearCart();
      setOrderPhase('confirmed');
    }, 3000);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-transparent text-white pb-36">
        <WokHeader title="Your Wok" showBack backTo="/" showCart={false} />
      </div>
    );
  }

  // =========================================================================
  // SCREEN 1: PAYMENT PROCESSING SCREEN (3 SECONDS ANIMATION)
  // =========================================================================
  if (orderPhase === 'verifying') {
    return (
      <div className="min-h-screen bg-[#070707] text-white flex flex-col justify-between relative overflow-hidden animate-fade-in pb-6">
        {/* Background Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#FF4500]/15 via-black/40 to-black z-0" />

        <WokHeader showBack backTo="/" showCart={false} />

        {/* Top Bar: Table / Total Pill */}
        <div className="relative z-10 max-w-md mx-auto w-full px-4 space-y-4 pt-1">
          <div className="p-3 bg-[#121212]/90 border border-[#D4AF37]/40 rounded-2xl flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.8)] backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#1C1C1C] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
                <Store className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="font-display font-black text-xs sm:text-sm text-white tracking-wider">
                  TABLE {tableNumber}
                </div>
                <div className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider">
                  DINE-IN
                </div>
              </div>
            </div>

            <div className="h-7 w-[1px] bg-[#27272A]" />

            <div className="text-right">
              <div className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider">
                Order Total
              </div>
              <div className="font-display font-black text-lg sm:text-xl text-[#F3D362] tracking-tight">
                ₹{confirmedOrder?.grandTotal || totals.grandTotal}
              </div>
            </div>
          </div>
        </div>

        {/* Middle: Sizzling Flaming Wok Artwork + Circular Gold Spinner */}
        <div className="relative z-10 max-w-md mx-auto w-full flex flex-col items-center justify-center py-2 my-auto text-center">
          {/* Flaming Stir-Fry Artwork with Center Loading Ring */}
          <div className="relative w-full max-w-[340px] sm:max-w-[380px] rounded-3xl overflow-hidden flex items-center justify-center">
            {/* Wok Image Backdrop (Contains full artwork and stylized text) */}
            <img
              src={WOKMAWA_ASSETS.PAYMENT_PROCESSING_BG}
              alt="Confirming Your Payment"
              className="w-full h-auto object-contain drop-shadow-[0_10px_30px_rgba(255,69,0,0.35)]"
            />

            {/* Glowing Golden Ring Spinner over the center wok */}
            <div className="absolute top-[28%] sm:top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3.5px] border-[#333333]/40 border-t-[#F3D362] border-r-[#E5B83B] animate-spin shadow-[0_0_20px_rgba(243,211,98,0.7)]" style={{ animationDuration: '1.1s' }} />
            </div>
          </div>
        </div>

        {/* Bottom Reassurance Bar */}
        <div className="relative z-10 max-w-md mx-auto w-full">
          <div className="p-3 sm:p-3.5 bg-[#121212]/95 border border-[#27272A] rounded-2xl flex items-center justify-between gap-2 text-[10px] sm:text-[11px] shadow-card-luxe backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[#D4AF37] font-bold">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#F3D362]" />
              <span className="text-white">Secure Payment</span>
            </div>

            <div className="h-4 w-[1px] bg-[#27272A]" />

            <div className="flex items-center gap-1.5 text-[#D4AF37] font-bold">
              <Clock className="w-4 h-4 shrink-0 text-[#F3D362] animate-pulse" />
              <span className="text-white">Processing in a few seconds</span>
            </div>

            <div className="h-4 w-[1px] bg-[#27272A]" />

            <div className="flex items-center gap-1.5 text-[#D4AF37] font-bold">
              <Lock className="w-4 h-4 shrink-0 text-[#F3D362]" />
              <span className="text-white">Do not close this page</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 2: ORDER CONFIRMED SCREEN (AFTER 3 SECONDS)
  // =========================================================================
  if (orderPhase === 'confirmed') {
    const orderToShow = confirmedOrder;
    const paymentMethodLabel =
      orderToShow?.paymentMethod === 'upi'
        ? 'Paid via UPI (Google Pay)'
        : orderToShow?.paymentMethod === 'card'
        ? 'Paid via Debit / Credit Card'
        : 'Pay at Counter (Dine-In)';

    return (
      <div className="min-h-screen bg-[#070707] text-white flex flex-col justify-between pb-10 relative animate-fade-in">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#D4AF37]/10 via-black/50 to-black z-0" />

        <WokHeader showBack backTo="/" showCart={false} />

        <main className="max-w-md mx-auto w-full px-4 space-y-4 pt-1 relative z-10">
          {/* Top Order Confirmed Banner Image */}
          <div className="w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-[#D4AF37]/40 shadow-[0_4px_25px_rgba(0,0,0,0.7)] bg-black">
            <img
              src={WOKMAWA_ASSETS.ORDER_CONFIRMED_BANNER}
              alt="Fiery Order Confirmed Stir-Fry"
              className="w-full h-auto object-cover block"
            />
          </div>

          {/* ORDER #WM-XXXX Card */}
          <div className="p-4 bg-[#111111] border border-[#27272A] rounded-2xl text-center space-y-2 shadow-card-luxe">
            <div className="font-display font-black text-lg sm:text-xl text-white">
              ORDER <span className="text-[#F3D362]">#{orderToShow?.orderId || 'WM-1042'}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#181818] border border-[#2A2A2A] flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-full bg-[#222222] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-white">
                  TABLE {orderToShow?.tableNumber || tableNumber} • DINE-IN
                </div>
                <div className="text-[11px] text-[#A1A1AA]">
                  Your order will be served at your table.
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-xs font-black text-[#F3D362] italic flex items-center justify-center gap-1">
                <span>Your wok is firing up</span>
                <span>🔥</span>
              </div>
              <div className="text-[11px] text-[#A1A1AA] mt-0.5">
                Our chefs are preparing your delicious food.
              </div>
            </div>
          </div>

          {/* Payment Status Card */}
          <div className="p-3.5 bg-[#111111] border border-[#27272A] rounded-2xl flex items-center justify-between gap-3 shadow-card-luxe">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white">Payment Successful</div>
                <div className="text-[10px] text-[#A1A1AA] truncate">{paymentMethodLabel}</div>
                <div className="text-[10px] text-[#71717A]">{orderToShow?.createdAt || 'Just now'}</div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-display font-black text-base text-white">
                ₹{orderToShow?.grandTotal || 386}
              </div>
              <div className="text-[10px] font-black text-[#10B981] tracking-wider uppercase">
                PAID
              </div>
            </div>
          </div>

          {/* 4-Milestone Progress Tracker */}
          <div className="p-3.5 bg-[#111111] border border-[#27272A] rounded-2xl shadow-card-luxe">
            <div className="flex items-center justify-between relative">
              {/* Step 1: Order Confirmed */}
              <div className="flex flex-col items-center flex-1 z-10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black flex items-center justify-center shadow-[0_0_10px_rgba(243,211,98,0.6)]">
                  <ChefHat className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-[9px] mt-1 text-[#F3D362] font-black text-center leading-tight">
                  Order Confirmed
                </span>
              </div>

              <div className="flex-1 -mx-2 h-[2px] bg-[#27272A] self-start mt-4" />

              {/* Step 2: Preparing */}
              <div className="flex flex-col items-center flex-1 z-10">
                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#333333] text-[#71717A] flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <span className="text-[9px] mt-1 text-[#71717A] font-medium text-center leading-tight">
                  Preparing
                </span>
              </div>

              <div className="flex-1 -mx-2 h-[2px] bg-[#27272A] self-start mt-4" />

              {/* Step 3: On the Way */}
              <div className="flex flex-col items-center flex-1 z-10">
                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#333333] text-[#71717A] flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="text-[9px] mt-1 text-[#71717A] font-medium text-center leading-tight">
                  On the Way
                </span>
              </div>

              <div className="flex-1 -mx-2 h-[2px] bg-[#27272A] self-start mt-4" />

              {/* Step 4: Served at Table */}
              <div className="flex flex-col items-center flex-1 z-10">
                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#333333] text-[#71717A] flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <span className="text-[9px] mt-1 text-[#71717A] font-medium text-center leading-tight">
                  Served at Table
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            {/* Big Shiny Gold Track Order Button */}
            <button
              type="button"
              onClick={() => navigate({ to: '/orders' })}
              className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black font-display font-black text-sm uppercase tracking-wider shadow-gold-glow hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MapPin className="w-4 h-4 stroke-[2.5]" />
              <span>TRACK ORDER</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* View Order Details Button */}
            <button
              type="button"
              onClick={() => setShowDetailsModal(true)}
              className="w-full py-3.5 px-6 rounded-full bg-[#141414] border border-[#27272A] hover:border-[#D4AF37] text-white font-display font-bold text-xs uppercase tracking-wider hover:bg-[#1A1A1A] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#D4AF37]" />
              <span>VIEW ORDER DETAILS</span>
            </button>
          </div>
        </main>

        {/* View Order Details Bottom Sheet Modal */}
        {showDetailsModal && orderToShow && (
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
                      #{orderToShow.orderId}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
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
                    <span>Table #{orderToShow.tableNumber} • Dine In</span>
                  </div>
                  <span className="text-[11px] text-[#A1A1AA] font-normal">{orderToShow.createdAt}</span>
                </div>

                <div className="pt-2 border-t border-[#1F1F1F] grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#71717A] block">Customer Name</span>
                    <span className="text-white font-bold">{orderToShow.customer?.name || dinerName || 'Guest Diner'}</span>
                  </div>
                  <div>
                    <span className="text-[#71717A] block">Phone Number</span>
                    <span className="text-white font-bold">{orderToShow.customer?.phone || dinerPhone || 'Not Provided (Guest)'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#71717A] block">Payment Status</span>
                    <span className="text-[#10B981] font-bold">
                      {paymentMethodLabel} • PAID
                    </span>
                  </div>
                </div>
              </div>

              {/* Purchased Products & Add-ons List (Same Rich Design as Cart Page) */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-[#A1A1AA]">
                  Purchased Items ({orderToShow.items.length})
                </div>

                <div className="space-y-3">
                  {orderToShow.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-[#141414] border border-[#222222] rounded-2xl flex gap-3.5 shadow-sm"
                    >
                      {/* Left Image */}
                      <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-[#1C1C1C] shrink-0 border border-[#27272A]">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Right Details */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          {/* Dish Name + Base Price */}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-display font-black text-sm text-white truncate">
                              {item.name}
                            </h4>
                            <span className="font-display font-black text-sm text-white shrink-0">
                              ₹{item.portionPrice || Math.round(item.unitPrice)}
                            </span>
                          </div>

                          {/* Veg / Non-Veg */}
                          <div className="flex items-center gap-1.5 mt-0.5 mb-1">
                            <div className={`w-3 h-3 rounded-[3px] border flex items-center justify-center p-[2px] ${item.isVeg ? 'border-[#10B981]' : 'border-[#EF4444]'}`}>
                              <div className={`w-1 h-1 rounded-full ${item.isVeg ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                            </div>
                            <span className="text-[9px] font-black text-[#D4D4D8] uppercase tracking-wider">
                              {item.isVeg ? 'VEG' : 'NON-VEG'}
                            </span>
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
                          <span className="font-display font-black text-base text-[#F3D362]">
                            ₹{item.totalPrice}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill Details Breakdown */}
              <div className="p-4 bg-[#141414] border border-[#222222] rounded-2xl space-y-2 text-xs shadow-sm">
                <h4 className="font-display font-bold text-sm text-white border-b border-[#222222] pb-2">
                  Bill Breakdown
                </h4>

                <div className="flex justify-between text-[#A1A1AA]">
                  <span>Item Subtotal</span>
                  <span className="text-white font-semibold">₹{orderToShow.itemTotal}</span>
                </div>

                <div className="flex justify-between text-[#A1A1AA]">
                  <span>GST & Restaurant Taxes (5%)</span>
                  <span className="text-white font-semibold">₹{orderToShow.taxGst}</span>
                </div>

                <div className="flex justify-between text-[#A1A1AA]">
                  <span>Service & Packaging</span>
                  <span className="text-white font-semibold">₹{orderToShow.packagingCharge}</span>
                </div>

                {orderToShow.discount > 0 && (
                  <div className="flex justify-between text-[#22C55E] font-bold">
                    <span>Coupon Discount</span>
                    <span>-₹{orderToShow.discount}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-[#222222] flex justify-between text-sm font-black text-white">
                  <span>Total Paid</span>
                  <span className="text-[#F3D362] text-lg">₹{orderToShow.grandTotal}</span>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
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

  // =========================================================================
  // EMPTY CART FALLBACK
  // =========================================================================
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col justify-between p-4">
        <WokHeader title="Your Wok" showBack backTo="/" showCart={false} />

        <div className="max-w-md mx-auto text-center space-y-4 my-auto p-6 bg-[#141414] border border-[#27272A] rounded-3xl shadow-card-luxe">
          <div className="w-20 h-20 rounded-full bg-[#1C1C1C] border border-[#D4AF37]/30 flex items-center justify-center mx-auto text-[#D4AF37]">
            <ShoppingBag className="w-9 h-9 stroke-[1.8]" />
          </div>
          <h2 className="font-display font-black text-2xl text-white">
            Your Wok is Empty!
          </h2>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            You haven't added any fiery noodles, sizzling platters, or crispy baos yet.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#E8C547] via-[#D4AF37] to-[#C9A227] text-black font-extrabold text-sm shadow-gold-glow hover:brightness-110"
          >
            <span>EXPLORE MENU</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="text-center text-[11px] text-[#A1A1AA]/60 pb-4">
          WOKMAWA • Table #{tableNumber}
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN CHECKOUT FLOW (STEPS 1, 2, 3)
  // =========================================================================
  return (
    <div className="min-h-screen bg-transparent text-white pb-36">
      <WokHeader title="Your Wok" showBack backTo="/" showCart={false} />

      <main className="max-w-xl mx-auto px-4 space-y-5 pt-3">
        {/* Top Stepper for Cart -> Customer Details -> Payment (Slim & Single-Line Aligned) */}
        <div className="bg-[#121212]/95 border border-[#27272A] rounded-2xl py-2 px-3 sm:py-2.5 sm:px-4 shadow-card-luxe">
          <div className="flex items-center justify-between relative">
            {/* Step 1: Cart */}
            <div className="flex flex-col items-center flex-1 z-10">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                  currentStep === 1
                    ? 'bg-gradient-to-br from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black border-2 border-[#F3D362] shadow-[0_0_12px_rgba(243,211,98,0.55)]'
                    : currentStep > 1
                    ? 'border-2 border-[#F3D362] bg-black text-[#F3D362] shadow-[0_0_8px_rgba(243,211,98,0.25)]'
                    : 'border-2 border-[#3F3F46] bg-[#141414] text-[#71717A]'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
                {currentStep > 1 && (
                  <span className="w-3 h-3 rounded-full bg-[#F3D362] text-black flex items-center justify-center absolute -bottom-0.5 left-1/2 -translate-x-1/2 border border-black shadow-sm">
                    <Check className="w-2 h-2 stroke-[4]" />
                  </span>
                )}
              </button>
              <span
                className={`text-[10px] sm:text-[11px] mt-1 font-bold whitespace-nowrap transition-colors ${
                  currentStep === 1
                    ? 'text-[#F3D362]'
                    : currentStep > 1
                    ? 'text-white'
                    : 'text-[#71717A]'
                }`}
              >
                Cart
              </span>
            </div>

            {/* Connector Line 1 */}
            <div className="flex-1 -mx-2 h-[2px] self-start mt-4 transition-all duration-300">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  currentStep > 1
                    ? 'bg-gradient-to-r from-[#F3D362] to-[#D4AF37] shadow-[0_0_6px_rgba(243,211,98,0.5)]'
                    : 'bg-[#27272A]'
                }`}
              />
            </div>

            {/* Step 2: Customer Details */}
            <div className="flex flex-col items-center flex-1 z-10">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                  currentStep === 2
                    ? 'bg-gradient-to-br from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black border-2 border-[#F3D362] shadow-[0_0_12px_rgba(243,211,98,0.55)]'
                    : currentStep > 2
                    ? 'border-2 border-[#F3D362] bg-black text-[#F3D362] shadow-[0_0_8px_rgba(243,211,98,0.25)]'
                    : 'border-2 border-[#3F3F46] bg-[#141414] text-[#71717A]'
                }`}
              >
                <User className="w-3.5 h-3.5 stroke-[2.5]" />
                {currentStep > 2 && (
                  <span className="w-3 h-3 rounded-full bg-[#F3D362] text-black flex items-center justify-center absolute -bottom-0.5 left-1/2 -translate-x-1/2 border border-black shadow-sm">
                    <Check className="w-2 h-2 stroke-[4]" />
                  </span>
                )}
              </button>
              <span
                className={`text-[10px] sm:text-[11px] mt-1 font-bold whitespace-nowrap transition-colors ${
                  currentStep === 2
                    ? 'text-[#F3D362]'
                    : currentStep > 2
                    ? 'text-white'
                    : 'text-[#71717A]'
                }`}
              >
                Customer Details
              </span>
            </div>

            {/* Connector Line 2 */}
            <div className="flex-1 -mx-2 h-[2px] self-start mt-4 transition-all duration-300">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  currentStep > 2
                    ? 'bg-gradient-to-r from-[#F3D362] to-[#D4AF37] shadow-[0_0_6px_rgba(243,211,98,0.5)]'
                    : 'bg-[#27272A]'
                }`}
              />
            </div>

            {/* Step 3: Payment */}
            <div className="flex flex-col items-center flex-1 z-10">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                  currentStep === 3
                    ? 'bg-gradient-to-br from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black border-2 border-[#F3D362] shadow-[0_0_12px_rgba(243,211,98,0.55)]'
                    : 'border-2 border-[#3F3F46] bg-[#141414] text-[#71717A]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <span
                className={`text-[10px] sm:text-[11px] mt-1 font-bold whitespace-nowrap transition-colors ${
                  currentStep === 3
                    ? 'text-[#F3D362]'
                    : 'text-[#71717A]'
                }`}
              >
                Payment
              </span>
            </div>
          </div>
        </div>

        {/* Active Order Lock Notice */}
        {activeOrder && activeOrder.status !== 'served' && (
          <div className="p-4 bg-gradient-to-r from-[#241A0B] via-[#1A1208] to-[#241A0B] border-2 border-[#D4AF37] rounded-2xl space-y-2.5 shadow-[0_4px_25px_rgba(0,0,0,0.85)]">
            <div className="flex items-start gap-2.5">
              <span className="text-2xl shrink-0">⚠️</span>
              <div className="flex-1">
                <h4 className="font-display font-black text-sm text-[#F3D362]">
                  Table #{activeOrder.tableNumber || tableNumber} Has an Active Order
                </h4>
                <p className="text-xs text-[#D4D4D8] mt-0.5 leading-relaxed">
                  Order <span className="font-bold text-white">#{activeOrder.orderId}</span> is currently in progress in the kitchen. New items cannot be ordered until your active order is completed.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: '/orders' })}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black font-display font-black text-xs uppercase tracking-wider shadow-gold-glow hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              View Active Order in Kitchen →
            </button>
          </div>
        )}

        {/* ================= STEP 1: CART ================= */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-fade-in">
            {/* Top Cart Order Review Banner */}
            <div className="w-full rounded-2xl overflow-hidden border border-[#D4AF37]/35 shadow-[0_4px_20px_rgba(0,0,0,0.6)] bg-black">
              <img
                src={WOKMAWA_ASSETS.CART_REVIEW_BANNER}
                alt="Spicy Wok Order Review"
                className="w-full h-auto object-cover block"
              />
            </div>

            {/* Cart Item Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-white">
                  Selected Items ({totals.totalItemCount})
                </h3>
                <button
                  type="button"
                  onClick={() => actions.clearCart()}
                  className="text-xs text-[#FF3B3B] hover:underline font-semibold cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 bg-[#0D0D0D] border border-[#222222] rounded-2xl flex gap-3.5 sm:gap-4 shadow-card-luxe relative"
                  >
                    {/* Left: Food Item Image */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#1C1C1C] shrink-0 border border-[#27272A]/80 shadow-md">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Right: Food Item Details & Bottom Controls */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        {/* Top Header: Dish Name & Base Price */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-display font-black text-sm sm:text-base text-white leading-tight truncate">
                            {item.name}
                          </h4>
                          <span className="font-display font-black text-sm sm:text-base text-white shrink-0">
                            ₹{item.portionPrice || Math.round(item.unitPrice)}
                          </span>
                        </div>

                        {/* Veg / Non-Veg Label */}
                        <div className="flex items-center gap-1.5 mt-1 mb-1">
                          <div className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center p-[2px] ${item.isVeg ? 'border-[#10B981]' : 'border-[#EF4444]'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                          </div>
                          <span className="text-[10px] font-black text-[#D4D4D8] uppercase tracking-wider">
                            {item.isVeg ? 'VEG' : 'NON-VEG'}
                          </span>
                        </div>

                        {/* Spice Level Row with Red Chilli Icons */}
                        <div className="flex items-center justify-between text-xs my-1">
                          <div className="flex items-center gap-1.5">
                            <RedChilliIcon className="w-4 h-4 shrink-0" />
                            <span className="text-xs text-[#A1A1AA]">Spice Level:</span>
                            <span className="text-xs text-white font-bold">{item.spiceLevel?.name || 'Hot'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: item.spiceLevel?.chillies || 3 }).map((_, i) => (
                              <RedChilliIcon key={i} className="w-4 h-4 shrink-0" />
                            ))}
                          </div>
                        </div>

                        {/* Extras Add-on Rows with Real Image */}
                        {item.extras && item.extras.length > 0 && item.extras.map((extra) => {
                          const extraImg = getExtraImage(extra);
                          return (
                            <div key={extra.id} className="flex items-center justify-between text-xs my-1">
                              <div className="flex items-center gap-2">
                                <img
                                  src={extraImg}
                                  alt={extra.name}
                                  className="w-5 h-5 sm:w-5.5 sm:h-5.5 object-cover rounded-full border border-[#333333] shrink-0"
                                />
                                <span className="text-xs text-white font-medium">{extra.name}</span>
                              </div>
                              <span className="text-xs font-bold text-[#F3D362]">
                                + ₹{extra.price}
                              </span>
                            </div>
                          );
                        })}

                        {/* Special Instructions Note */}
                        {item.instructions && (
                          <div className="text-[10px] text-[#E8C547] italic mt-1 line-clamp-1">
                            Note: "{item.instructions}"
                          </div>
                        )}
                      </div>

                      {/* Bottom Controls Bar: Stepper (Left) & Line Total (Right) */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1C1C1C]">
                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => actions.updateCartQuantity(item.id, -1)}
                            className="w-8 h-8 rounded-full border-2 border-[#F3D362] bg-black text-[#F3D362] hover:bg-[#F3D362] hover:text-black flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-4 h-4 stroke-[3.5]" />
                          </button>
                          <div className="w-10 h-8 bg-black border border-[#27272A] rounded-lg flex items-center justify-center text-sm font-black text-white shadow-inner">
                            {item.quantity}
                          </div>
                          <button
                            type="button"
                            onClick={() => actions.updateCartQuantity(item.id, 1)}
                            className="w-8 h-8 rounded-full border-2 border-[#F3D362] bg-[#F3D362] text-black hover:brightness-110 flex items-center justify-center transition-all font-bold active:scale-95 shadow-sm cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-4 h-4 stroke-[3.5]" />
                          </button>
                        </div>

                        {/* Grand Total Amount for Item Line */}
                        <div className="font-display font-black text-2xl text-[#F3D362] tracking-tight">
                          ₹{item.totalPrice}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add More Items Button */}
            <Link
              to="/"
              className="w-full py-3 px-4 rounded-xl bg-[#141414] border border-[#27272A] hover:border-[#D4AF37] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>+ ADD MORE DISHES</span>
            </Link>

            {/* Complete Your Wok (Filtered by Cart Category) */}
            <UpsellCarousel />

            {/* Promo Code Section */}
            <div className="p-3.5 bg-[#141414] border border-[#27272A] rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">
                  Promo Code
                </span>
                <span className="text-[10px] text-[#D4AF37] font-bold">Use code MAWA10</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="e.g. MAWA10"
                  className="flex-1 bg-[#1C1C1C] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white uppercase font-bold focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#E8C547] to-[#D4AF37] text-black font-extrabold text-xs shadow-gold-glow cursor-pointer"
                >
                  APPLY
                </button>
              </div>

              {couponRes && (
                <div
                  className={`text-xs font-bold ${
                    couponRes.success ? 'text-[#22C55E]' : 'text-[#FF3B3B]'
                  }`}
                >
                  {couponRes.text}
                </div>
              )}
            </div>

            {/* Detailed Bill Breakdown */}
            <div className="p-4 bg-[#141414] border border-[#27272A] rounded-2xl space-y-2.5 text-xs shadow-card-luxe">
              <h4 className="font-display font-bold text-sm text-white border-b border-[#27272A] pb-2">
                Bill Details
              </h4>

              <div className="flex justify-between text-[#A1A1AA]">
                <span>Item Subtotal</span>
                <span className="text-white font-semibold">₹{totals.itemTotal}</span>
              </div>

              <div className="flex justify-between text-[#A1A1AA]">
                <span>GST & Restaurant Taxes (5%)</span>
                <span className="text-white font-semibold">₹{totals.taxGst}</span>
              </div>

              <div className="flex justify-between text-[#A1A1AA]">
                <span>Service & Eco Packaging</span>
                <span className="text-white font-semibold">₹{totals.packagingCharge}</span>
              </div>

              {totals.discount > 0 && (
                <div className="flex justify-between text-[#22C55E] font-bold">
                  <span>Coupon Discount ({appliedCoupon})</span>
                  <span>-₹{totals.discount}</span>
                </div>
              )}

              <div className="pt-2.5 border-t border-[#27272A] flex justify-between text-sm font-extrabold text-white">
                <span>To Pay</span>
                <span className="text-[#D4AF37] text-lg">₹{totals.grandTotal}</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: CUSTOMER DETAILS ================= */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-fade-in">
            {/* Top Diner Details Banner */}
            <div className="w-full rounded-2xl overflow-hidden border border-[#D4AF37]/35 shadow-[0_4px_20px_rgba(0,0,0,0.6)] bg-black">
              <img
                src={WOKMAWA_ASSETS.CUSTOMER_DETAILS_BANNER}
                alt="Almost There! Share Your Details"
                className="w-full h-auto object-cover block"
              />
            </div>

            {/* Diner Info Section */}
            <div className="p-4 bg-[#141414] border border-[#27272A] rounded-2xl space-y-3.5 shadow-card-luxe">
              <div>
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-white">
                  DINER INFO (FOR SMS / WHATSAPP LIVE TRACKING)
                </h4>
                <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                  Table #{tableNumber} • Dine In
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#A1A1AA]">Your Name</label>
                  <input
                    type="text"
                    value={dinerName}
                    onChange={(e) => setDinerName(e.target.value)}
                    placeholder="Guest Diner"
                    className="w-full bg-[#1C1C1C] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#A1A1AA]">Mobile Number (Optional)</label>
                  <input
                    type="tel"
                    value={dinerPhone}
                    onChange={(e) => setDinerPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-[#1C1C1C] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#171510] border border-[#D4AF37]/30 flex items-center gap-2 text-[11px] text-[#D4AF37]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>You can skip diner info and continue directly as guest.</span>
              </div>
            </div>

            {/* Quick Order Snapshot */}
            <div className="p-4 bg-[#141414] border border-[#27272A] rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#A1A1AA]">
                <span>Total Items ({totals.totalItemCount})</span>
                <span className="text-white font-bold">₹{totals.itemTotal}</span>
              </div>
              <div className="flex items-center justify-between text-[#A1A1AA]">
                <span>Taxes & Charges</span>
                <span className="text-white font-bold">₹{totals.taxGst + totals.packagingCharge}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex items-center justify-between text-[#22C55E] font-bold">
                  <span>Discount</span>
                  <span>-₹{totals.discount}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#27272A] flex items-center justify-between text-sm font-extrabold text-white">
                <span>Final Payable</span>
                <span className="text-[#D4AF37] text-base">₹{totals.grandTotal}</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: PAYMENT ================= */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in">
            {/* Top Payment Banner */}
            <div className="w-full rounded-2xl overflow-hidden border border-[#D4AF37]/35 shadow-[0_4px_20px_rgba(0,0,0,0.6)] bg-black">
              <img
                src={WOKMAWA_ASSETS.PAYMENT_BANNER}
                alt="Payment Fiery Wok Flavor"
                className="w-full h-auto object-cover block"
              />
            </div>

            {/* Grand Total Amount Box */}
            <div className="p-4 bg-[#121212] border border-[#27272A] rounded-2xl text-center space-y-1 shadow-card-luxe">
              <div className="text-xs uppercase tracking-widest text-[#A1A1AA] font-bold">
                Grand Total
              </div>
              <div className="font-display font-black text-3xl sm:text-4xl text-[#F3D362] tracking-tight drop-shadow-[0_0_12px_rgba(243,211,98,0.35)]">
                ₹{totals.grandTotal}
              </div>
            </div>

            {/* Payment Options Selection */}
            <div className="space-y-2.5">
              {/* Option 1: UPI */}
              <div
                onClick={() => setSelectedPaymentMethod('upi')}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedPaymentMethod === 'upi'
                    ? 'border-[#F3D362] bg-[#18160E] shadow-[0_0_15px_rgba(243,211,98,0.15)]'
                    : 'border-[#27272A] bg-[#121212] hover:border-[#3F3F46]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedPaymentMethod === 'upi' ? 'border-[#F3D362]' : 'border-[#52525B]'
                    }`}
                  >
                    {selectedPaymentMethod === 'upi' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#F3D362]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 font-display font-black text-sm sm:text-base text-white tracking-wider">
                      <span>UPI</span>
                      <span className="text-[#22C55E] text-xs">▶</span>
                    </div>
                    <div className="text-[11px] text-[#A1A1AA]">Pay using any UPI app</div>
                  </div>
                </div>

                {/* UPI App Icons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-lg bg-[#222222] border border-[#333333] flex items-center justify-center p-0.5">
                      <span className="font-bold text-[9px] text-white">G<span className="text-[#4285F4]">P</span><span className="text-[#EA4335]">a</span><span className="text-[#FBBC05]">y</span></span>
                    </div>
                    <span className="text-[8px] text-[#A1A1AA] mt-0.5">GPay</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-lg bg-[#5F259F] border border-[#7C3AED] flex items-center justify-center p-0.5">
                      <span className="font-black text-[11px] text-white">पे</span>
                    </div>
                    <span className="text-[8px] text-[#A1A1AA] mt-0.5">PhonePe</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-lg bg-[#002E6E] border border-[#00BAF2] flex items-center justify-center p-0.5">
                      <span className="font-extrabold text-[8px] text-[#00BAF2]">paytm</span>
                    </div>
                    <span className="text-[8px] text-[#A1A1AA] mt-0.5">Paytm</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-lg bg-[#1E293B] border border-[#059669] flex items-center justify-center p-0.5">
                      <span className="font-black text-[8px] text-[#10B981]">BHIM</span>
                    </div>
                    <span className="text-[8px] text-[#A1A1AA] mt-0.5">BHIM</span>
                  </div>
                </div>
              </div>

              {/* Option 2: Debit / Credit Card */}
              <div
                onClick={() => setSelectedPaymentMethod('card')}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedPaymentMethod === 'card'
                    ? 'border-[#F3D362] bg-[#18160E] shadow-[0_0_15px_rgba(243,211,98,0.15)]'
                    : 'border-[#27272A] bg-[#121212] hover:border-[#3F3F46]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedPaymentMethod === 'card' ? 'border-[#F3D362]' : 'border-[#52525B]'
                    }`}
                  >
                    {selectedPaymentMethod === 'card' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#F3D362]" />
                    )}
                  </div>
                  <CreditCard className="w-5 h-5 text-white shrink-0" />
                  <div>
                    <div className="font-display font-bold text-xs sm:text-sm text-white">Debit / Credit Card</div>
                    <div className="text-[11px] text-[#A1A1AA]">Visa, Mastercard, RuPay & more</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="px-1.5 py-0.5 rounded bg-[#1A1F71] text-white font-black text-[9px] italic">VISA</span>
                  <div className="px-1 py-0.5 rounded bg-[#222222] flex items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#EB001B] -mr-1" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#F79E1B]/90" />
                  </div>
                  <span className="px-1 py-0.5 rounded bg-[#0A5498] text-white font-extrabold text-[8px]">RuPay</span>
                </div>
              </div>

              {/* Option 3: Pay at Counter */}
              <div
                onClick={() => setSelectedPaymentMethod('counter')}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedPaymentMethod === 'counter'
                    ? 'border-[#F3D362] bg-[#18160E] shadow-[0_0_15px_rgba(243,211,98,0.15)]'
                    : 'border-[#27272A] bg-[#121212] hover:border-[#3F3F46]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedPaymentMethod === 'counter' ? 'border-[#F3D362]' : 'border-[#52525B]'
                    }`}
                  >
                    {selectedPaymentMethod === 'counter' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#F3D362]" />
                    )}
                  </div>
                  <Store className="w-5 h-5 text-white shrink-0" />
                  <div>
                    <div className="font-display font-bold text-xs sm:text-sm text-white">Pay at Counter</div>
                    <div className="text-[11px] text-[#A1A1AA] flex items-center gap-1">
                      <span>Pay at the restaurant</span>
                      <span className="text-[10px] text-[#71717A]">ⓘ</span>
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37] font-black text-[9px] tracking-wider uppercase shrink-0">
                  DINE-IN ONLY
                </span>
              </div>
            </div>

            {/* Security Trust Badge */}
            <div className="p-3.5 bg-[#0D1812] border border-[#10B981]/30 rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-[#10B981]/20 flex items-center justify-center text-[#10B981] shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Your payment is secure</div>
                <div className="text-[11px] text-[#A1A1AA]">We use trusted and encrypted payment gateways.</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 30px Black Shade from Bottom to Top */}
      <div className="pointer-events-none fixed bottom-[72px] sm:bottom-[80px] left-0 right-0 h-[30px] bg-gradient-to-t from-black via-black/80 to-transparent z-40" />

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-lg border-t border-x border-[#D4AF37]/35 rounded-t-[26px] sm:rounded-t-[30px] shadow-[0_-8px_30px_rgba(0,0,0,0.85)] px-4 py-3.5 sm:py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          {/* Step 1 Footer Action */}
          {currentStep === 1 && (
            <>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider">
                  Total Amount
                </span>
                <span className="text-xl font-black text-[#F3D362]">
                  ₹{totals.grandTotal}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-gradient-to-r from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black font-display font-black text-sm uppercase tracking-wider shadow-gold-glow hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>CONTINUE</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </>
          )}

          {/* Step 2 Footer Action */}
          {currentStep === 2 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="py-3.5 px-4 rounded-full bg-[#1C1C1C] border border-[#27272A] text-white font-display font-bold text-xs uppercase tracking-wider hover:bg-[#252525] active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                <span>BACK</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-gradient-to-r from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black font-display font-black text-sm uppercase tracking-wider shadow-gold-glow hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>PROCEED TO PAYMENT</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </>
          )}

          {/* Step 3 Footer Action: Payment */}
          {currentStep === 3 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="py-3.5 px-4 rounded-full bg-[#1C1C1C] border border-[#27272A] text-white font-display font-bold text-xs uppercase tracking-wider hover:bg-[#252525] active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                <span>BACK</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmAndPay}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-gradient-to-r from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black font-display font-black text-sm uppercase tracking-wider shadow-gold-glow hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Lock className="w-4 h-4 stroke-[2.5]" />
                <span>PAY ₹{totals.grandTotal}</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
