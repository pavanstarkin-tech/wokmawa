import { Plus, Minus } from "lucide-react";
import { useCart } from "@/lib/paakashala-store";
import type { MenuItem } from "@/lib/paakashala-menu";

export function MiniCategoryCard({ item }: { item: MenuItem }) {
  const { items, add, setQty } = useCart();
  const inCart = items.find((c) => c.id === item.id);

  const price = item.price ?? 0;
  const mrp = item.mrp || (price > 0 ? Math.round(price * 1.20) : 0);
  const hasDiscount = mrp > price;
  const discountPct = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;

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

      {/* Info + Add Button */}
      <div className="px-3 py-2 flex flex-col justify-between flex-1 min-h-[72px]">
        <h4 className="line-clamp-2 text-[10px] font-bold text-brown-deep leading-tight mt-0.5">{item.name}</h4>

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
            inCart ? (
              <div className="flex items-center gap-0.5 rounded-full border border-gold/50 bg-cream px-0.5 py-0.5 shadow-sm shrink-0 w-full justify-between">
                <button onClick={() => setQty(item.id, inCart.quantity - 1)} className="grid h-4 w-4 place-items-center rounded-full text-brown-deep active:scale-90 transition">
                  <Minus className="h-2 w-2" />
                </button>
                <span className="text-[10px] font-bold text-brown-deep leading-none min-w-[12px] text-center">{inCart.quantity}</span>
                <button onClick={() => setQty(item.id, inCart.quantity + 1)} className="grid h-4 w-4 place-items-center rounded-full bg-gold-gradient text-brown-deep active:scale-90 transition">
                  <Plus className="h-2 w-2" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => add(item)}
                className="w-full py-1 rounded-xl bg-gold-gradient text-brown-deep font-bold text-[9px] uppercase tracking-widest shadow-sm active:scale-95 transition"
                aria-label={`Add ${item.name}`}
              >
                Add
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

