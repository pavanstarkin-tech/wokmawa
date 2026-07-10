import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/parkashala/AppShell";
import { EmptyState } from "@/components/parkashala/EmptyState";
import { VegBadge } from "@/components/parkashala/MenuCard";
import { useCart, useMobile, useOrders } from "@/lib/parkashala-store";
import { WHATSAPP_NUMBER } from "@/lib/parkashala-menu";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function buildWhatsAppMessage(mobile: string, items: ReturnType<typeof useCart>["items"], total: number) {
  const lines: string[] = [];
  lines.push("*Parkashala Order*");
  lines.push(`Customer Mobile: +91 ${mobile}`);
  lines.push("");
  lines.push("*Items:*");
  items.forEach((it, i) => {
    const price = it.price == null ? "Price on request" : `₹${(it.price * it.quantity).toFixed(0)}`;
    lines.push(`${i + 1}. ${it.name} x ${it.quantity} — ${price}`);
  });
  lines.push("");
  lines.push(`*Total: ₹${total.toFixed(0)}*`);
  lines.push("");
  lines.push("Please confirm this order.");
  return lines.join("\n");
}

function CartPage() {
  const { items, setQty, remove, clear, total, count } = useCart();
  const { mobile } = useMobile();
  const { push } = useOrders();
  const navigate = useNavigate();

  const hasPriceOnRequest = items.some((i) => i.price == null);

  const checkout = () => {
    if (!items.length || !mobile) return;
    const msg = buildWhatsAppMessage(mobile, items, total);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    const order = {
      id: `order_${Date.now()}`,
      mobile,
      createdAt: new Date().toISOString(),
      items,
      total,
      status: "Order placed via WhatsApp",
    };
    push(order);
    clear();
    window.open(url, "_blank");
    navigate({ to: "/orders" });
  };

  return (
    <AppShell>
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
                    <div className="flex items-center gap-2 rounded-lg border border-gold/50 bg-cream px-1 py-1">
                      <button onClick={() => setQty(it.id, it.quantity - 1)} className="grid h-7 w-7 place-items-center rounded-md text-brown-deep active:scale-90 transition" aria-label="Decrease">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-4 text-center text-sm font-semibold text-brown-deep">{it.quantity}</span>
                      <button onClick={() => setQty(it.id, it.quantity + 1)} className="grid h-7 w-7 place-items-center rounded-md bg-gold-gradient text-brown-deep active:scale-90 transition" aria-label="Increase">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className={`text-sm font-bold ${it.price == null ? "italic text-muted-foreground" : "text-brown-deep"}`}>
                      {it.price == null ? "On request" : `₹${(it.price * it.quantity).toFixed(0)}`}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-2xl bg-card p-5 border border-border/60 shadow-luxe">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Items</span>
              <span className="font-semibold text-brown-deep">{count}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Contact</span>
              <span className="font-semibold text-brown-deep">+91 {mobile}</span>
            </div>
            <div className="my-3 h-px bg-gold-gradient opacity-40" />
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] tracking-[0.35em] uppercase text-gold">Grand Total</div>
                <div className="mt-1 text-3xl font-bold text-brown-deep">₹{total.toFixed(0)}</div>
              </div>
              {hasPriceOnRequest && (
                <div className="max-w-[140px] text-right text-[10px] leading-tight text-muted-foreground">
                  Some items priced on request — confirmed at restaurant.
                </div>
              )}
            </div>

            <button
              onClick={checkout}
              className="mt-5 w-full rounded-xl bg-brown-gradient py-3.5 text-sm font-semibold uppercase tracking-widest text-cream shadow-luxe active:scale-[0.98] transition"
            >
              Proceed to Checkout · WhatsApp
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Opens WhatsApp with your order summary.
            </p>
          </div>
        </>
      )}
    </AppShell>
  );
}
