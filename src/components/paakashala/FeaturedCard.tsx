import { Plus, Minus } from "lucide-react";
import { useCart } from "@/lib/paakashala-store";
import type { MenuItem } from "@/lib/paakashala-menu";

export function FeaturedCard({ item }: { item: MenuItem }) {
  const { items, add, setQty } = useCart();
  const inCart = items.find((c) => c.id === item.id);
  const count = inCart?.quantity || 0;

  return (
    <div className="w-full overflow-hidden rounded-2xl bg-card border border-border/60 shadow-luxe flex flex-col group hover:shadow-xl transition-shadow duration-300">
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
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-md px-1.5 py-0.5 flex items-center gap-1 shadow-sm">
          <div className={`h-2 w-2 rounded-full ${item.type === "veg" ? "bg-green-500" : "bg-red-500"}`} />
        </div>
      </div>

      {/* Info Block */}
      <div className="px-3 py-2 flex flex-col justify-between flex-1 min-h-[86px]">
        <div>
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">{item.category}</span>
          <h4 className="line-clamp-2 text-[10px] font-bold text-brown-deep leading-tight mt-0.5">{item.name}</h4>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1 mt-1">
          <span className={`text-[11px] font-extrabold ${item.price == null ? "text-muted-foreground/70 italic" : "text-brown-deep"}`}>
            {item.price == null ? "—" : `₹${item.price}`}
          </span>

          {item.price != null && (
            count > 0 ? (
              <div className="flex items-center gap-0.5 rounded-full border border-gold/50 bg-cream px-0.5 py-0.5 shadow-sm shrink-0 w-full justify-between mt-1">
                <button onClick={() => setQty(item.id, count - 1)} className="grid h-4 w-4 place-items-center rounded-full text-brown-deep active:scale-90 transition">
                  <Minus className="h-2 w-2" />
                </button>
                <span className="text-[10px] font-bold text-brown-deep min-w-[12px] text-center">{count}</span>
                <button onClick={() => setQty(item.id, count + 1)} className="grid h-4 w-4 place-items-center rounded-full bg-gold-gradient text-brown-deep active:scale-90 transition">
                  <Plus className="h-2 w-2" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => add(item)}
                className="grid h-7 w-7 place-items-center rounded-full bg-gold-gradient text-brown-deep shadow-sm active:scale-90 transition shrink-0"
                aria-label={`Add ${item.name}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
