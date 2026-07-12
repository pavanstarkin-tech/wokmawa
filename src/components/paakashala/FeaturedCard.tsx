import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { useCart } from "@/lib/paakashala-store";
import type { MenuItem } from "@/lib/paakashala-menu";

export function FeaturedCard({ item }: { item: MenuItem }) {
  const { items, add, setQty } = useCart();
  const inCart = items.find((c) => c.id === item.id);
  const count = inCart?.quantity || 0;

  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  const handleAdd = () => {
    add(item);
    setIsAddedFeedback(true);
    setTimeout(() => {
      setIsAddedFeedback(false);
    }, 400);
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
    <div className="w-full overflow-hidden rounded-2xl bg-card border border-border/60 shadow-luxe flex flex-col group hover:shadow-xl transition-shadow duration-300 relative">
      {/* Image */}
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        {/* Veg indicator */}
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-md px-1.5 py-0.5 flex items-center gap-1 shadow-sm z-10">
          <div className={`h-2 w-2 rounded-full ${item.type === "veg" ? "bg-green-500" : "bg-red-500"}`} />
        </div>

        {/* Promotional Badges overlay */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
          {hasDiscount && (
            <span className="bg-green-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">
              {discountPct}% OFF
            </span>
          )}
          {item.name.toLowerCase().includes("biryani") && (
            <span className="bg-amber-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">
              Trending
            </span>
          )}
          {item.name.toLowerCase().includes("lollipop") && (
            <span className="bg-red-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">
              Bestseller
            </span>
          )}
        </div>
      </div>

      {/* Info Block */}
      <div className="px-3 py-2 flex flex-col justify-between flex-1 min-h-[86px]">
        <div>
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">{item.category}</span>
          <h4 className="line-clamp-2 text-[10px] font-bold text-brown-deep leading-tight mt-0.5">{item.name}</h4>
        </div>

        <div className="flex flex-col gap-1.5 mt-2">
          {/* Price display with MRP */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {hasDiscount && (
              <span className="text-[10px] line-through text-muted-foreground">
                ₹{mrp}
              </span>
            )}
            <span className={`text-[11px] font-extrabold ${item.price == null ? "text-muted-foreground/70 italic" : "text-brown-deep"}`}>
              {item.price == null ? "—" : `₹${item.price}`}
            </span>
          </div>

          {item.price != null && (
            isAddedFeedback ? (
              <button
                className="w-full py-2.5 rounded-xl bg-green-600 text-white font-bold text-[10px] uppercase tracking-widest shadow-sm transition-all"
                disabled
              >
                Added!
              </button>
            ) : count > 0 ? (
              <div className="flex items-center gap-0.5 rounded-full border border-gold/50 bg-cream px-1.5 py-1.5 shadow-sm shrink-0 w-full justify-between">
                <button onClick={() => setQty(item.id, count - 1)} className="grid h-5 w-5 place-items-center rounded-full text-brown-deep active:scale-90 transition">
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-[10px] font-bold text-brown-deep min-w-[12px] text-center">{count}</span>
                <button onClick={() => setQty(item.id, count + 1)} className="grid h-5 w-5 place-items-center rounded-full bg-gold-gradient text-brown-deep active:scale-90 transition">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                className="w-full py-2.5 rounded-xl bg-gold-gradient text-brown-deep font-bold text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition"
                aria-label={`Add ${item.name}`}
              >
                Add to Table
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

