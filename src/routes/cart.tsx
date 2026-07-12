import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Minus, Plus, Trash2, Ticket, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/paakashala/AppShell";
import { EmptyState } from "@/components/paakashala/EmptyState";
import { VegBadge } from "@/components/paakashala/MenuCard";
import { CustomerWelcome } from "@/components/paakashala/CustomerWelcome";
import { useCart, useCustomer, useTable, useOrders, useSettings, useMenu } from "@/lib/paakashala-store";
import { WHATSAPP_NUMBER } from "@/lib/paakashala-menu";
import { useOffers, logPromotionUsage } from "@/lib/promotions";
import { calculateCartPromotions } from "@/lib/promotions-engine";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

function CartPage() {
  const { items, setQty, remove, clear, total, count } = useCart();
  const { customer } = useCustomer();
  const { table } = useTable();
  const { push } = useOrders();
  const settings = useSettings();
  const navigate = useNavigate();
  const menuItems = useMenu();
  const { offers } = useOffers();

  const [showCustomerPrompt, setShowCustomerPrompt] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("paakashala_applied_coupon") || "";
    }
    return "";
  });
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  const hasPriceOnRequest = items.some((i) => i.price == null);

  // Compute calculated promotions
  const promoResult = calculateCartPromotions(items, offers, appliedCoupon || undefined, menuItems);

  // If customer completes the prompt, automatically process checkout
  useEffect(() => {
    if (showCustomerPrompt && customer) {
      setShowCustomerPrompt(false);
      processCheckout();
    }
  }, [customer, showCustomerPrompt]);

  const applyCouponCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    setCouponSuccess("");
    
    if (!couponInput.trim()) return;
    
    const code = couponInput.trim().toUpperCase();
    const couponOffer = offers.find(
      (o) => o.type === "coupon" && o.couponCode?.toUpperCase() === code && o.status === "active"
    );

    if (couponOffer) {
      // Validate minimum cart value
      const minVal = couponOffer.conditions?.minCartValue || 0;
      if (promoResult.subtotal < minVal) {
        setCouponError(`Min purchase of ₹${minVal} required for this coupon.`);
        return;
      }

      setAppliedCoupon(code);
      localStorage.setItem("paakashala_applied_coupon", code);
      setCouponSuccess(`Coupon "${code}" applied successfully!`);
      setCouponInput("");
    } else {
      setCouponError("Invalid or expired coupon code.");
    }
  };

  const removeCouponCode = () => {
    setAppliedCoupon("");
    localStorage.removeItem("paakashala_applied_coupon");
    setCouponSuccess("");
    setCouponError("");
  };

  const processCheckout = async () => {
    if (!items.length || !customer || !table) return;

    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      alert("Failed to load payment gateway. Please check your internet connection.");
      return;
    }

    try {
      // Use promotional grand total
      const amountInPaise = Math.round(promoResult.grandTotal * 100);
      const receiptId = Math.floor(1000 + Math.random() * 9000).toString();

      const response = await fetch("/api/create-order.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountInPaise,
          receipt: receiptId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create order on server");
      }

      const rzpOrder = await response.json();
      const rzpOrderId = rzpOrder.id;

      const options = {
        key: "rzp_live_StBUehIpeULYuL",
        amount: amountInPaise,
        currency: "INR",
        name: "Paakashala",
        description: `Order at Table ${table}`,
        order_id: rzpOrderId,
        handler: function (paymentResponse: any) {
          // Combine normal items and auto-added free items
          const finalItems = [...items, ...promoResult.freeItems];

          const order = {
            id: receiptId,
            mobile: customer.phone,
            customerName: customer.name,
            uid: customer.uid || "",
            tableId: table,
            createdAt: new Date().toISOString(),
            items: finalItems,
            subtotal: promoResult.subtotal,
            discount: promoResult.discount,
            tax: promoResult.tax,
            total: promoResult.grandTotal,
            appliedCoupon: appliedCoupon || null,
            appliedOffers: promoResult.appliedOffers.map((o) => o.offer.name),
            paymentId: paymentResponse.razorpay_payment_id,
            status: "pending",
          };
          
          push(order);

          // Log promotion usage statistics in database
          promoResult.appliedOffers.forEach((o) => {
            logPromotionUsage(receiptId, customer.uid || customer.phone, o.offer.id, o.discountAmount);
          });

          // Clean up coupon cache
          localStorage.removeItem("paakashala_applied_coupon");
          
          clear();
          navigate({ to: "/orders" });
        },
        prefill: {
          name: customer.name,
          contact: customer.phone,
          email: "shesettipavankumarswamy@gmail.com",
        },
        theme: {
          color: "#C89B3C", // Gold theme
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      alert("Error initiating payment. Please try again.");
    }
  };

  const handleCheckoutClick = () => {
    if (!customer) {
      setShowCustomerPrompt(true);
    } else {
      processCheckout();
    }
  };

  return (
    <AppShell>
      {showCustomerPrompt && <CustomerWelcome tableId={table} />}
      <div className="animate-fade-up">
        <div className="text-[10px] tracking-[0.4em] uppercase text-gold">Your Table</div>
        <h1 className="mt-1 text-3xl font-semibold text-brown-deep">Cart</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {count > 0 ? "Your order is ready to be placed." : "Curate your table from our menu."}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Your cart is empty"
          description="Add signature biryanis, tandoori classics or Andhra specials from the menu."
          actionLabel="Browse Menu"
          to="/menu"
        />
      ) : (
        <>
          {/* Cart item listing */}
          <ul className="mt-5 space-y-3">
            {items.map((it) => (
              <li key={it.id} className="flex gap-3 rounded-2xl bg-card p-3 border border-border/60 shadow-luxe">
                <img src={it.image} alt={it.name} loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <VegBadge type={it.type} />
                        <h3 className="truncate text-sm font-semibold text-brown-deep">{it.name}</h3>
                      </div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-widest text-gold">{it.category}</div>
                    </div>
                    <button
                      onClick={() => remove(it.id)}
                      aria-label="Remove"
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-destructive transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-md border border-gold/50 bg-cream px-1 py-1">
                      <button onClick={() => setQty(it.id, it.quantity - 1)} className="grid h-7 w-7 place-items-center rounded bg-gold/10 text-brown-deep active:scale-90 transition" aria-label="Decrease">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-4 text-center text-sm font-semibold text-brown-deep">{it.quantity}</span>
                      <button onClick={() => setQty(it.id, it.quantity + 1)} className="grid h-7 w-7 place-items-center rounded bg-gold-gradient text-brown-deep active:scale-90 transition" aria-label="Increase">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-1.5 justify-end">
                      {(() => {
                        const price = it.price ?? 0;
                        // Deterministic fake discount percentage between 10% and 30% based on item id
                        const getFakeDiscountPct = (id: string) => {
                          let hash = 0;
                          for (let i = 0; i < id.length; i++) {
                            hash = id.charCodeAt(i) + ((hash << 5) - hash);
                          }
                          return 10 + Math.abs(hash % 21); // 10 to 30
                        };

                        const discountPct = it.mrp && price > 0 && it.mrp > price
                          ? Math.round(((it.mrp - price) / it.mrp) * 100)
                          : getFakeDiscountPct(it.id);

                        const mrp = it.mrp || (price > 0 ? Math.round(price / (1 - discountPct / 100)) : 0);
                        const hasDiscount = mrp > price;

                        return (
                          <>
                            {hasDiscount && (
                              <span className="text-[10px] line-through text-muted-foreground font-normal">
                                ₹{(mrp * it.quantity).toFixed(0)}
                              </span>
                            )}
                            <div className={`text-sm font-bold ${it.price == null ? "italic text-muted-foreground" : "text-brown-deep"}`}>
                              {it.price == null ? "On request" : `₹${(it.price * it.quantity).toFixed(0)}`}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </li>
            ))}

            {/* Render Auto-added Free Promo Items */}
            {promoResult.freeItems.map((it, idx) => (
              <li key={`free-${it.id}-${idx}`} className="flex gap-3 rounded-2xl bg-card/65 p-3 border border-dashed border-green-500/50 shadow-sm animate-fade-in">
                <img src={it.image} alt={it.name} loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover opacity-85" />
                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <VegBadge type={it.type} />
                      <h3 className="truncate text-sm font-semibold text-brown-deep">{it.name}</h3>
                      <span className="bg-green-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">
                        FREE GIFT
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-widest text-gold">{it.category}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground/75">Qty: {it.quantity}</span>
                    <div className="text-sm font-extrabold text-green-600">
                      ₹0 <span className="text-[10px] line-through text-muted-foreground/50 font-normal">₹{MENU.find(m => m.id === it.id)?.price || 99}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Promotion Offers & Coupon entry section */}
          <div className="mt-5 space-y-4">
            
            {/* Coupon Entry Form */}
            <div className="rounded-2xl bg-card p-4 border border-border/60 shadow-sm">
              <div className="flex items-center gap-2 text-brown-deep font-bold text-xs mb-3">
                <Ticket className="h-4 w-4 text-gold" /> Add Coupon Code
              </div>
              
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Coupon <strong>{appliedCoupon}</strong> Applied!</span>
                  </div>
                  <button 
                    onClick={removeCouponCode}
                    className="font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={applyCouponCode} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="e.g. WELCOME20"
                    className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold uppercase"
                  />
                  <button
                    type="submit"
                    className="bg-brown-gradient text-cream px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all"
                  >
                    Apply
                  </button>
                </form>
              )}
              {couponError && <p className="text-[10px] font-bold text-red-500 mt-2 ml-1">{couponError}</p>}
              {couponSuccess && <p className="text-[10px] font-bold text-green-600 mt-2 ml-1">{couponSuccess}</p>}
            </div>

            {/* Dynamic Offers Status & Progress Bars */}
            {(promoResult.appliedOffers.length > 0 || promoResult.lockedOffers.length > 0) && (
              <div className="rounded-2xl bg-card p-4 border border-border/60 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-brown-deep mb-2">Available Promotions</h3>
                
                {/* Applied automatic offers */}
                {promoResult.appliedOffers.map((appl, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-green-700">
                    <span className="text-green-600 mt-0.5">✔</span>
                    <div>
                      <p className="font-bold">{appl.offer.name}</p>
                      <p className="text-[10px] text-muted-foreground">{appl.description} (-₹{appl.discountAmount.toFixed(0)})</p>
                    </div>
                  </div>
                ))}

                {/* Locked Offers with progress bars */}
                {promoResult.lockedOffers.map((lock, idx) => (
                  <div key={idx} className="text-xs text-brown-deep/80 space-y-1 pt-1 border-t border-border/40 first:border-0 first:pt-0">
                    <p className="font-semibold">{lock.offer.name}</p>
                    <p className="text-[10px] text-muted-foreground">{lock.message}</p>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1.5 overflow-hidden">
                      <div 
                        className="bg-gold-gradient h-full transition-all duration-300 rounded-full" 
                        style={{ width: `${lock.progress}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing Summary Block */}
          <div className="mt-5 rounded-2xl bg-card p-5 border border-border/60 shadow-luxe space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-brown-deep">₹{promoResult.subtotal.toFixed(0)}</span>
            </div>

            {promoResult.discount > 0 && (
              <div className="flex items-center justify-between text-xs text-green-700 font-medium">
                <span>Discounts Applied</span>
                <span>-₹{promoResult.discount.toFixed(0)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">GST (5%)</span>
              <span className="font-semibold text-brown-deep">₹{promoResult.tax.toFixed(0)}</span>
            </div>

            {customer && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Contact</span>
                <span className="font-semibold text-brown-deep">+91 {customer.phone}</span>
              </div>
            )}

            <div className="my-3 h-px bg-gold-gradient opacity-40" />
            
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] tracking-[0.35em] uppercase text-gold">Grand Total</div>
                <div className="mt-1 text-3xl font-bold text-brown-deep">₹{promoResult.grandTotal.toFixed(0)}</div>
              </div>
              {hasPriceOnRequest && (
                <div className="max-w-[140px] text-right text-[10px] leading-tight text-muted-foreground">
                  Some items priced on request — confirmed at restaurant.
                </div>
              )}
            </div>

            {/* Savings Banner */}
            {promoResult.savings > 0 && (
              <div className="bg-green-50 border border-green-200/50 rounded-xl p-3 text-center text-xs text-green-700 font-bold mt-3">
                🎉 You are saving ₹{promoResult.savings.toFixed(0)} on this order!
              </div>
            )}

            <button
              onClick={handleCheckoutClick}
              className="mt-5 w-full rounded-xl bg-brown-gradient py-3.5 text-sm font-semibold uppercase tracking-widest text-cream shadow-luxe active:scale-[0.98] transition"
            >
              Proceed to Checkout
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              You will be prompted to confirm your table & details.
            </p>
          </div>
        </>
      )}
    </AppShell>
  );
}

