import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ShoppingBag,
  ArrowRight,
  Trash2,
  Plus,
  Minus,
  Tag,
  Check,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";
import { useWokStore, LiveOrder } from "@/lib/wokmawa-store";
import { WokHeader } from "@/components/wokmawa/WokHeader";
import { VegBadge } from "@/components/wokmawa/WokBadge";
import { UpsellCarousel } from "@/components/wokmawa/UpsellCarousel";

export const Route = createFileRoute("/cart")({
  component: WokCartPage,
});

function WokCartPage() {
  const navigate = useNavigate();
  const { cart, totals, tableNumber, appliedCoupon, customer, actions } = useWokStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Top Stepper State: 1 = Review Items, 2 = Diner Details
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Diner Info
  const [dinerName, setDinerName] = useState(customer.name || 'Guest Diner');
  const [dinerPhone, setDinerPhone] = useState(customer.phone || '');

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponRes, setCouponRes] = useState<{ text: string; success: boolean } | null>(null);

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApplyCoupon = () => {
    if (!couponCode) return;
    const res = actions.applyCoupon(couponCode);
    setCouponRes({ text: res.message, success: res.success });
  };

  const handleConfirmAndPay = () => {
    setIsSubmitting(true);

    const newOrder: LiveOrder = {
      orderId: `WOK-${Math.floor(1000 + Math.random() * 9000)}`,
      tableNumber,
      items: [...cart],
      itemTotal: totals.itemTotal,
      taxGst: totals.taxGst,
      packagingCharge: totals.packagingCharge,
      discount: totals.discount,
      grandTotal: totals.grandTotal,
      paymentMethod: 'counter',
      status: 'received',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      prepTimeMinutes: 12,
      customer: {
        name: dinerName.trim() || 'Guest Diner',
        phone: dinerPhone.trim(),
        email: '',
        isGuest: !dinerPhone.trim(),
      },
    };

    setTimeout(() => {
      actions.setActiveOrder(newOrder);
      actions.clearCart();
      setIsSubmitting(false);
      navigate({ to: '/orders' });
    }, 600);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-transparent text-white pb-36">
        <WokHeader title="Your Wok" showBack backTo="/" />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col justify-between p-4">
        <WokHeader title="Your Wok" showBack backTo="/" />

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

  return (
    <div className="min-h-screen bg-transparent text-white pb-36">
      <WokHeader title="Your Wok" showBack backTo="/" />

      <main className="max-w-xl mx-auto px-4 space-y-5 pt-3">
        {/* Top Stepper for Order Placement */}
        <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            {/* Step 1 Pill */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                currentStep === 1
                  ? 'text-[#F3D362]'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border ${
                  currentStep === 1
                    ? 'bg-[#F3D362] text-black border-[#F3D362]'
                    : currentStep > 1
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40'
                    : 'bg-[#1E1E1E] text-[#71717A] border-[#333333]'
                }`}
              >
                {currentStep > 1 ? <Check className="w-3 h-3 stroke-[3]" /> : '1'}
              </span>
              <span>1. REVIEW ITEMS</span>
            </button>

            {/* Stepper Divider */}
            <div className="flex-1 mx-3 h-[2px] bg-[#222222] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F3D362] to-[#D4AF37] transition-all duration-300"
                style={{ width: currentStep === 1 ? '50%' : '100%' }}
              />
            </div>

            {/* Step 2 Pill */}
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                currentStep === 2
                  ? 'text-[#F3D362]'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border ${
                  currentStep === 2
                    ? 'bg-[#F3D362] text-black border-[#F3D362]'
                    : 'bg-[#1E1E1E] text-[#71717A] border-[#333333]'
                }`}
              >
                2
              </span>
              <span>2. DINER DETAILS</span>
            </button>
          </div>
        </div>

        {/* ================= STEP 1: REVIEW ITEMS ================= */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-fade-in">
            {/* Cart Item Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-white">
                  Selected Items ({totals.totalItemCount})
                </h3>
                <button
                  type="button"
                  onClick={() => actions.clearCart()}
                  className="text-xs text-[#FF3B3B] hover:underline font-semibold"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-[#141414] border border-[#27272A] rounded-2xl flex flex-col gap-3 shadow-card-luxe"
                  >
                    <div className="flex gap-3">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#1C1C1C] shrink-0 border border-[#27272A]">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <VegBadge isVeg={item.isVeg} size="sm" />
                              <h4 className="font-display font-extrabold text-sm text-white truncate">
                                {item.name}
                              </h4>
                            </div>
                            <button
                              type="button"
                              onClick={() => actions.removeCartItem(item.id)}
                              className="text-[#A1A1AA] hover:text-[#FF3B3B] transition-colors p-1 shrink-0"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="text-[11px] text-[#D4AF37] font-semibold mt-0.5">
                            {item.portionName} • {item.spiceLevel.name} Spice
                          </div>

                          {item.extras.length > 0 && (
                            <div className="text-[10px] text-[#A1A1AA] mt-0.5 truncate">
                              Extras: {item.extras.map((e) => e.name).join(', ')}
                            </div>
                          )}

                          {item.instructions && (
                            <div className="text-[10px] text-[#E8C547] italic mt-0.5 truncate">
                              Note: "{item.instructions}"
                            </div>
                          )}
                        </div>

                        {/* Quantity controls and item total */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#27272A]">
                          <span className="text-sm font-black text-white">
                            ₹{item.totalPrice}
                          </span>

                          <div className="flex items-center gap-2 bg-[#1C1C1C] border border-[#27272A] rounded-lg p-1">
                            <button
                              type="button"
                              onClick={() => actions.updateCartQuantity(item.id, -1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-white hover:bg-[#27272A]"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold text-white w-4 text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => actions.updateCartQuantity(item.id, 1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-white hover:bg-[#27272A]"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
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
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#D4AF37]" />
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
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#E8C547] to-[#D4AF37] text-black font-extrabold text-xs shadow-gold-glow"
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

        {/* ================= STEP 2: DINER INFO & PAYMENT (IN-PAGE) ================= */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-fade-in">
            {/* Top Diner Details Banner */}
            <div className="w-full rounded-2xl overflow-hidden border border-[#D4AF37]/35 shadow-[0_4px_20px_rgba(0,0,0,0.6)] bg-black">
              <img
                src="/wokmawa/chk.png"
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
      </main>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-lg border-t border-x border-[#D4AF37]/35 rounded-t-[26px] sm:rounded-t-[30px] shadow-[0_-8px_30px_rgba(0,0,0,0.85)] px-4 py-3.5 sm:py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          {/* Step 1 Footer Action: Proceed to Diner Info */}
          {currentStep === 1 && (
            <>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider">
                  Total Amount
                </span>
                <span className="text-xl font-black text-white">
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

          {/* Step 2 Footer Action: Direct Confirm & Place Order */}
          {currentStep === 2 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="py-3.5 px-4 rounded-full bg-[#1C1C1C] border border-[#27272A] text-white font-display font-bold text-xs uppercase tracking-wider hover:bg-[#252525] active:scale-95 transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                <span>BACK</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmAndPay}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-gradient-to-r from-[#F7D360] via-[#E5B83B] to-[#D4A328] text-black font-display font-black text-sm uppercase tracking-wider shadow-gold-glow hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? 'PLACING ORDER...' : `CONFIRM ORDER • ₹${totals.grandTotal}`}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
