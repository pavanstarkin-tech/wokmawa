import { createFileRoute } from "@tanstack/react-router";
import { Receipt, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/parkashala/AppShell";
import { EmptyState } from "@/components/parkashala/EmptyState";
import { useOrders } from "@/lib/parkashala-store";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const { orders } = useOrders();

  return (
    <AppShell>
      <div className="animate-fade-up">
        <div className="text-[10px] tracking-[0.4em] uppercase text-gold">Your History</div>
        <h1 className="mt-1 text-3xl font-semibold text-brown-deep">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every plate you've curated with us.</p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title="No orders yet"
          description="Place your first order and it'll appear here."
          actionLabel="Browse Menu"
          to="/menu"
        />
      ) : (
        <ul className="mt-5 space-y-4">
          {orders.map((o) => {
            const d = new Date(o.createdAt);
            return (
              <li key={o.id} className="overflow-hidden rounded-2xl bg-card border border-border/60 shadow-luxe">
                <div className="flex items-center gap-3 border-b border-border/60 bg-luxe-gradient px-4 py-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-gold-gradient text-brown-deep shadow-luxe">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-brown-deep">{o.status}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                      {d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-widest text-gold">Total</div>
                    <div className="text-base font-bold text-brown-deep">₹{o.total.toFixed(0)}</div>
                  </div>
                </div>
                <div className="p-4">
                  <ul className="space-y-2 text-sm">
                    {o.items.map((it) => (
                      <li key={it.id} className="flex items-center gap-3">
                        <img src={it.image} alt={it.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-brown-deep">{it.name}</div>
                          <div className="text-[11px] text-muted-foreground">Qty {it.quantity}</div>
                        </div>
                        <div className={`shrink-0 text-sm font-semibold ${it.price == null ? "italic text-muted-foreground" : "text-brown-deep"}`}>
                          {it.price == null ? "—" : `₹${(it.price * it.quantity).toFixed(0)}`}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
