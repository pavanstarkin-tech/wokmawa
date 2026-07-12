import { useState } from "react";
import { Plus, Minus, Leaf, Drumstick } from "lucide-react";
import { useCart } from "@/lib/paakashala-store";
import type { MenuItem } from "@/lib/paakashala-menu";

export function VegBadge({ type }: { type: "veg" | "non-veg" }) {
  const color = type === "veg" ? "#3B7A3B" : "#B4482B";
  return (
    <span
      className="inline-grid h-4 w-4 place-items-center rounded-sm border"
      style={{ borderColor: color }}
      aria-label={type}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  );
}

export function QuantitySelector({ qty, onDec, onInc }: any) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-gold/50 bg-cream p-1 shadow-sm">
      <button
        onClick={onDec}
        aria-label="Decrease"
        className="grid h-8 w-8 place-items-center rounded bg-gold/10 text-brown-deep transition active:scale-90"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-4 text-center text-sm font-bold text-brown-deep">{qty}</span>
      <button
        onClick={onInc}
        aria-label="Increase"
        className="grid h-8 w-8 place-items-center rounded bg-gold-gradient text-brown-deep transition active:scale-90"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function MenuCard({ item }: { item: MenuItem }) {
  const { items, add, setQty } = useCart();
  const inCart = items.find((c) => c.id === item.id);

  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  const handleAdd = () => {
    add(item);
    setIsAddedFeedback(true);
    setTimeout(() => {
      setIsAddedFeedback(false);
    }, 1000);
  };

  const price = item.price ?? 0;

  // Deterministic fake discount percentage between 10% and 30% based on item id
  const getFakeDiscountPct = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 10 + Math.abs(hash % 21); // 10 to 30
  };

  const discountPct = item.mrp && price > 0 && item.mrp > price
    ? Math.round(((item.mrp - price) / item.mrp) * 100)
    : getFakeDiscountPct(item.id);

  const mrp = item.mrp || (price > 0 ? Math.round(price / (1 - discountPct / 100)) : 0);
  const hasDiscount = mrp > price;

  return (
    <article className="group flex gap-3 rounded-2xl bg-card p-3 border border-border/60 shadow-luxe transition hover:-translate-y-0.5 relative">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute left-1.5 top-1.5 z-10">
          <VegBadge type={item.type} />
        </div>
        {hasDiscount && (
          <div className="absolute right-1 top-1 z-10 bg-green-600 text-white text-[7px] font-black uppercase px-1 rounded shadow-sm">
            {discountPct}% OFF
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate text-sm font-semibold text-brown-deep">{item.name}</h3>
          </div>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {hasDiscount && (
              <span className="text-[10px] line-through text-muted-foreground">
                ₹{mrp}
              </span>
            )}
            <div className={`text-sm font-bold ${item.price == null ? "text-muted-foreground italic" : "text-brown-deep"}`}>
              {item.price == null ? "Price on request" : `₹${item.price}`}
            </div>
          </div>
          {item.price == null ? (
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Ask at restaurant</span>
          ) : isAddedFeedback ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm transition-all"
              disabled
            >
              Added!
            </button>
          ) : inCart ? (
            <QuantitySelector
              qty={inCart.quantity}
              onDec={() => setQty(item.id, inCart.quantity - 1)}
              onInc={() => setQty(item.id, inCart.quantity + 1)}
            />
          ) : (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 rounded-md border border-gold bg-cream px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-brown-deep transition hover:bg-gold-gradient active:scale-95 shadow-luxe"
            >
              {item.type === "veg" ? <Leaf className="h-3.5 w-3.5" /> : <Drumstick className="h-3.5 w-3.5" />}
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
