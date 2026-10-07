import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  QrCode,
  Smartphone,
  CreditCard,
  Banknote,
  ArrowRight,
  Sparkles,
  Flame,
  ChefHat,
  Bell,
  Clock,
  ChevronRight,
  ShieldCheck,
  Tag,
  Share2,
} from 'lucide-react';
import { useWokStore, LiveOrder } from '../../lib/wokmawa-store';
import { VegBadge } from './WokBadge';

interface WokCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderComplete?: (order: LiveOrder) => void;
}

type CheckoutStep =
  | 'review'
  | 'customer'
  | 'payment_method'
  | 'upi_screen'
  | 'confirming'
  | 'confirmed'
  | 'live_tracker';

export const WokCheckoutModal: React.FC<WokCheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderComplete,
}) => {
  const { cart, totals, tableNumber, customer, appliedCoupon, activeOrder, actions } = useWokStore();

  const [step, setStep] = useState<CheckoutStep>('review');
  const [custName, setCustName] = useState(customer.name || '');
  const [custPhone, setCustPhone] = useState(customer.phone || '');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'counter'>('upi');
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');
  const [couponInput, setCouponInput] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [confirmingProgress, setConfirmingProgress] = useState(0);
  const [liveStatusIndex, setLiveStatusIndex] = useState(0);

  if (!isOpen) return null;

  // Handle coupon apply
  const handleApplyCoupon = () => {
    if (!couponInput) return;
    const res = actions.applyCoupon(couponInput);
    setCouponMessage({ text: res.message, success: res.success });
  };

  // Handle Customer Form
  const handleCustomerSubmit = (isGuest = false) => {
    actions.setCustomer({
      name: isGuest ? 'Guest Diner' : custName || 'Diner',
      phone: custPhone,
      isGuest,
    });
    setStep('payment_method');
  };

  // Trigger Payment Flow
  const handleProceedPayment = () => {
    if (paymentMethod === 'upi') {
      setStep('upi_screen');
    } else {
      startConfirmationFlow();
    }
  };

  // Start animated confirmation flow (Step 13)
  const startConfirmationFlow = () => {
    setStep('confirming');
    setConfirmingProgress(10);

    const order = actions.createOrder(paymentMethod);
    if (onOrderComplete) onOrderComplete(order);

    const interval = setInterval(() => {
      setConfirmingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setStep('confirmed');
          return 100;
        }
        return prev + 25;
      });
    }, 600);
  };

  // Status progression for Live Tracker (Step 15)
  const statusSteps = [
    { title: 'Order Received', desc: 'Sent straight to Master Kitchen', icon: CheckCircle2 },
    { title: 'Cooking in Wok', desc: 'Chef tossing on 400°C open flame', icon: Flame },
    { title: 'Plated & Garnished', desc: 'Sprinkling crispy fried garlic & scallions', icon: ChefHat },
    { title: 'Served to Table', desc: `Arriving hot at Table #${tableNumber}`, icon: Bell },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-backdrop-fade"
    >
      <div
        className="w-full max-w-lg max-h-[92vh] bg-[#0F0F0F] border-t sm:border border-[#27272A] rounded-t-[28px] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-sheet-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull/Grab Handle */}
        <div className="sm:hidden pt-2 pb-1 flex justify-center bg-[#141414]">
          <div className="w-10 h-1 bg-white/25 rounded-full" />
        </div>

        {/* Header Bar */}
        <div className="p-4 bg-[#141414] border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E8C547] to-[#D4AF37] flex items-center justify-center text-black shadow-gold-glow">
              <CreditCard className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-base text-white">
                {step === 'review' && 'Review Your Order'}
                {step === 'customer' && 'Customer Details'}
                {step === 'payment_method' && 'Select Payment Method'}
                {step === 'upi_screen' && 'UPI Instant Payment'}
                {step === 'confirming' && 'Confirming Your Order'}
                {step === 'confirmed' && 'Order Confirmed!'}
                {step === 'live_tracker' && 'Live Kitchen Tracker'}
              </h2>
              <span className="text-[11px] text-[#A1A1AA]">
                Table #{tableNumber} • Dine In
              </span>
            </div>
          </div>

          {step !== 'confirming' && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1C1C1C] border border-[#27272A] flex items-center justify-center text-white hover:border-[#D4AF37]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto no-scrollbar space-y-4 flex-1">
          {/* STEP 9: Final Review Order */}
          {step === 'review' && (
            <div className="space-y-4 animate-fade-in">
              {/* Order Items List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
                  Order Summary ({cart.length} items)
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-[#141414] border border-[#27272A] rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <VegBadge isVeg={item.isVeg} size="sm" />
                        <div>
                          <div className="text-xs font-bold text-white">
                            {item.quantity}x {item.name}
                          </div>
                          <div className="text-[10px] text-[#D4AF37]">
                            {item.portionName} • {item.spiceLevel.name} Spice
                            {item.extras.length > 0 && ` (+${item.extras.length} extras)`}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-white">
                        ₹{item.totalPrice}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coupon Applicator */}
              <div className="p-3 bg-[#141414] border border-[#27272A] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Tag className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Have a Promo Coupon?</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#D4AF37]">Use MAWA10</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter Coupon Code"
                    className="flex-1 bg-[#1C1C1C] border border-[#27272A] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#A1A1AA]/50 uppercase font-bold focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#E8C547] to-[#D4AF37] text-black font-extrabold text-xs shadow-gold-glow"
                  >
                    APPLY
                  </button>
                </div>

                {couponMessage && (
                  <div
                    className={`text-[11px] font-bold ${
                      couponMessage.success ? 'text-[#22C55E]' : 'text-[#FF3B3B]'
                    }`}
                  >
                    {couponMessage.text}
                  </div>
                )}
              </div>

              {/* Bill Details */}
              <div className="p-3.5 bg-[#141414] border border-[#27272A] rounded-xl space-y-2 text-xs">
                <div className="flex justify-between text-[#A1A1AA]">
                  <span>Item Total</span>
                  <span className="text-white">₹{totals.itemTotal}</span>
                </div>
                <div className="flex justify-between text-[#A1A1AA]">
                  <span>GST (5%)</span>
                  <span className="text-white">₹{totals.taxGst}</span>
                </div>
                <div className="flex justify-between text-[#A1A1AA]">
                  <span>Restaurant Packaging & Service</span>
                  <span className="text-white">₹{totals.packagingCharge}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-[#22C55E] font-bold">
                    <span>Coupon Discount</span>
                    <span>-₹{totals.discount}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#27272A] flex justify-between text-sm font-extrabold text-white">
                  <span>Grand Total</span>
                  <span className="text-[#D4AF37] text-base">₹{totals.grandTotal}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 10: Customer Details */}
          {step === 'customer' && (
            <div className="space-y-4 animate-fade-in">
              {/* Top Diner Details Banner */}
              <div className="w-full rounded-2xl overflow-hidden border border-[#D4AF37]/35 shadow-[0_4px_20px_rgba(0,0,0,0.6)] bg-black">
                <img
                  src="/wokmawa/chk.png"
                  alt="Almost There! Share Your Details"
                  className="w-full h-auto object-cover block"
                />
              </div>

              <div className="p-3.5 bg-[#141414] border border-[#27272A] rounded-2xl space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                  Diner Info (For SMS / WhatsApp Live Tracking)
                </h3>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] text-[#A1A1AA] font-semibold block mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-[#1C1C1C] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#A1A1AA]/50 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#A1A1AA] font-semibold block mb-1">
                      Mobile Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-[#1C1C1C] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#A1A1AA]/50 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs text-[#D4AF37]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>You can skip diner info and continue directly as guest.</span>
              </div>
            </div>
          )}

          {/* STEP 11: Payment Method Selection */}
          {step === 'payment_method' && (
            <div className="space-y-3 animate-fade-in">
              <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
                Select How You Wish to Pay (₹{totals.grandTotal})
              </span>

              {/* UPI Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  paymentMethod === 'upi'
                    ? 'bg-[#1F1B12] border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-gold-glow'
                    : 'bg-[#141414] border-[#27272A] hover:border-[#3F3F46]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#242424] flex items-center justify-center text-[#D4AF37]">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>UPI Instant (GPay / PhonePe / QR)</span>
                      <span className="text-[9px] font-bold bg-[#22C55E] text-black px-1.5 py-0.5 rounded-full">
                        FASTEST
                      </span>
                    </div>
                    <div className="text-xs text-[#A1A1AA]">Scan QR or pay via any UPI app</div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    paymentMethod === 'upi' ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'border-[#3F3F46]'
                  }`}
                >
                  {paymentMethod === 'upi' && <CheckCircle2 className="w-4 h-4" />}
                </div>
              </button>

              {/* Card Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-[#1F1B12] border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-gold-glow'
                    : 'bg-[#141414] border-[#27272A] hover:border-[#3F3F46]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#242424] flex items-center justify-center text-white">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-white">Credit / Debit Cards</div>
                    <div className="text-xs text-[#A1A1AA]">Visa, Mastercard, RuPay</div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    paymentMethod === 'card' ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'border-[#3F3F46]'
                  }`}
                >
                  {paymentMethod === 'card' && <CheckCircle2 className="w-4 h-4" />}
                </div>
              </button>

              {/* Pay at Counter Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod('counter')}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  paymentMethod === 'counter'
                    ? 'bg-[#1F1B12] border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-gold-glow'
                    : 'bg-[#141414] border-[#27272A] hover:border-[#3F3F46]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#242424] flex items-center justify-center text-white">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-white">Pay at Counter / Cash</div>
                    <div className="text-xs text-[#A1A1AA]">Settle bill directly with cashier</div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    paymentMethod === 'counter' ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'border-[#3F3F46]'
                  }`}
                >
                  {paymentMethod === 'counter' && <CheckCircle2 className="w-4 h-4" />}
                </div>
              </button>
            </div>
          )}

          {/* STEP 12: UPI Payment Screen */}
          {step === 'upi_screen' && (
            <div className="space-y-4 text-center animate-fade-in">
              <div className="p-4 bg-[#141414] border border-[#27272A] rounded-2xl flex flex-col items-center space-y-3">
                <span className="text-xs font-bold text-[#A1A1AA]">
                  Scan QR with any UPI App
                </span>

                {/* Simulated QR Code */}
                <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-[#D4AF37]">
                  <div className="w-36 h-36 bg-neutral-900 rounded-lg flex flex-col items-center justify-center p-2 text-center text-white">
                    <QrCode className="w-16 h-16 text-[#D4AF37]" />
                    <span className="text-[9px] font-mono mt-1 text-white">wokmawa@icici</span>
                  </div>
                </div>

                <div className="text-lg font-extrabold text-white">
                  Amount: <span className="text-[#D4AF37]">₹{totals.grandTotal}</span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA]">
                  <Clock className="w-3.5 h-3.5 text-[#FF3B3B]" />
                  <span>QR expires in 04:58 mins</span>
                </div>
              </div>

              {/* Quick App Selectors */}
              <div className="grid grid-cols-3 gap-2">
                {['Google Pay', 'PhonePe', 'Paytm'].map((app) => (
                  <button
                    key={app}
                    type="button"
                    onClick={() => setSelectedUpiApp(app)}
                    className="p-2.5 rounded-xl bg-[#141414] border border-[#27272A] hover:border-[#D4AF37] text-xs font-bold text-white transition-all active:scale-95"
                  >
                    {app}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 13: Confirming Payment (Animated) */}
          {step === 'confirming' && (
            <div className="py-8 text-center space-y-6 animate-fade-in">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-[#27272A] border-t-[#D4AF37] border-r-[#FF3B3B] animate-spin" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1C1C1C] to-[#0A0A0A] flex items-center justify-center text-2xl shadow-flame-glow animate-pulse">
                  🔥
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-display font-extrabold text-lg text-white">
                  Confirming Your Order...
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  {confirmingProgress < 40 && 'Transmitting order to Kitchen Wok station...'}
                  {confirmingProgress >= 40 && confirmingProgress < 80 && 'Generating live KOT ticket & reserving table...'}
                  {confirmingProgress >= 80 && 'Preparing Master Wok burner!'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-xs mx-auto bg-[#1C1C1C] h-2 rounded-full overflow-hidden border border-[#27272A]">
                <div
                  className="bg-gradient-to-r from-[#E8C547] via-[#D4AF37] to-[#FF3B3B] h-full transition-all duration-300"
                  style={{ width: `${confirmingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 14: Order Confirmed */}
          {step === 'confirmed' && activeOrder && (
            <div className="text-center space-y-5 animate-fade-in py-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center mx-auto text-white shadow-lg animate-bounce">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="font-display font-black text-2xl text-white">
                  Order Confirmed!
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-1">
                  Thank you! Your dishes are being freshly prepared on our high flame wok.
                </p>
              </div>

              {/* Order Card Ticket */}
              <div className="p-4 bg-[#141414] border border-[#D4AF37]/50 rounded-2xl space-y-3 text-left shadow-gold-glow">
                <div className="flex justify-between items-center pb-2.5 border-b border-[#27272A]">
                  <div>
                    <div className="text-xs text-[#A1A1AA]">Order ID</div>
                    <div className="text-base font-extrabold text-gold-gradient">
                      #{activeOrder.orderId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#A1A1AA]">Table Number</div>
                    <div className="text-base font-extrabold text-white">
                      Table #{activeOrder.tableNumber}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#D4AF37]" />
                    <span>Estimated Prep Time:</span>
                  </div>
                  <span className="font-bold text-white">12 - 15 Mins</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 15: Live Order Status Tracker */}
          {step === 'live_tracker' && activeOrder && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-3.5 bg-[#141414] border border-[#27272A] rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">
                    Order #{activeOrder.orderId}
                  </div>
                  <div className="text-[11px] text-[#A1A1AA]">
                    Table #{activeOrder.tableNumber} • {activeOrder.items.length} items
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37] font-bold text-xs">
                  Est. 12 Mins
                </div>
              </div>

              {/* 4-Stage Progress Tracker */}
              <div className="space-y-4 relative pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#27272A]">
                {statusSteps.map((st, idx) => {
                  const isCurrent = idx === 1; // e.g. Cooking in Wok
                  const isDone = idx < 1;
                  const Icon = st.icon;

                  return (
                    <div key={st.title} className="relative flex items-start gap-3">
                      <div
                        className={`absolute -left-6 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs z-10 transition-all ${
                          isDone
                            ? 'bg-[#22C55E] text-black font-bold'
                            : isCurrent
                            ? 'bg-gradient-to-r from-[#FF3B3B] to-[#F97316] text-white shadow-flame-glow animate-pulse'
                            : 'bg-[#1C1C1C] text-[#A1A1AA] border border-[#27272A]'
                        }`}
                      >
                        {isDone ? '✓' : <Icon className="w-3.5 h-3.5" />}
                      </div>

                      <div className="flex-1">
                        <div
                          className={`font-bold text-sm ${
                            isCurrent ? 'text-[#D4AF37]' : isDone ? 'text-white' : 'text-[#A1A1AA]'
                          }`}
                        >
                          {st.title} {isCurrent && '🔥 (Active)'}
                        </div>
                        <div className="text-xs text-[#A1A1AA]">{st.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Sticky Bottom Actions */}
        <div className="p-4 bg-[#0D0D0D] border-t border-[#27272A] flex items-center gap-3">
          {step === 'review' && (
            <button
              type="button"
              onClick={() => setStep('customer')}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#E8C547] via-[#D4AF37] to-[#C9A227] text-black font-extrabold text-sm shadow-gold-glow hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <span>CONFIRM & PAY • ₹{totals.grandTotal}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 'customer' && (
            <div className="w-full flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCustomerSubmit(true)}
                className="flex-1 py-3.5 px-3 rounded-xl bg-[#1A1A1A] border border-[#27272A] text-white font-bold text-xs hover:border-[#D4AF37]"
              >
                SKIP AS GUEST
              </button>
              <button
                type="button"
                onClick={() => handleCustomerSubmit(false)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 px-3 rounded-xl bg-gradient-to-r from-[#E8C547] to-[#D4AF37] text-black font-extrabold text-xs shadow-gold-glow"
              >
                <span>CONTINUE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {step === 'payment_method' && (
            <div className="w-full flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('customer')}
                className="px-4 py-3.5 rounded-xl bg-[#1A1A1A] border border-[#27272A] text-white text-xs font-bold"
              >
                BACK
              </button>
              <button
                type="button"
                onClick={handleProceedPayment}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#E8C547] via-[#D4AF37] to-[#C9A227] text-black font-extrabold text-sm shadow-gold-glow"
              >
                <span>PAY ₹{totals.grandTotal}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 'upi_screen' && (
            <div className="w-full flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('payment_method')}
                className="px-4 py-3.5 rounded-xl bg-[#1A1A1A] border border-[#27272A] text-white text-xs font-bold"
              >
                BACK
              </button>
              <button
                type="button"
                onClick={startConfirmationFlow}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-extrabold text-sm shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>CONFIRM PAYMENT</span>
              </button>
            </div>
          )}

          {step === 'confirmed' && (
            <button
              type="button"
              onClick={() => setStep('live_tracker')}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#E8C547] via-[#D4AF37] to-[#C9A227] text-black font-extrabold text-sm shadow-gold-glow"
            >
              <span>TRACK LIVE ORDER STATUS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 'live_tracker' && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-xl bg-[#1A1A1A] border border-[#27272A] hover:border-[#D4AF37] text-white font-bold text-xs"
            >
              ORDER MORE DISHES 🍜
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
