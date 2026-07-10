import { Star, Plus } from "lucide-react";
import { useCart } from "@/lib/parkashala-store";
import type { MenuItem } from "@/lib/parkashala-menu";
import { VegBadge } from "./MenuCard";

export function FeaturedCard({ item }: { item: MenuItem }) {
  const { add } = useCart();
  return (
    <div className="w-56 shrink-0 overflow-hidden rounded-2xl bg-card border border-border/60 shadow-luxe">
      <div className="relative h-32 w-full overflow-hidden">
        <img src={item.image} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <span className="absolute top-2 left-2"><VegBadge type={item.type} /></span>
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-cream/90 px-2 py-0.5 text-[10px] font-semibold text-brown-deep shadow-luxe">
          <Star className="h-3 w-3 fill-gold text-gold" /> 4.{Math.floor((item.name.length * 7) % 9) + 1}
        </span>
      </div>
      <div className="p-3">
        <div className="text-[10px] uppercase tracking-widest text-gold">{item.category}</div>
        <h4 className="mt-0.5 line-clamp-1 text-sm font-semibold text-brown-deep">{item.name}</h4>
        <div className="mt-2 flex items-center justify-between">
          <div className={`text-sm font-bold ${item.price == null ? "text-muted-foreground italic" : "text-brown-deep"}`}>
            {item.price == null ? "On request" : `₹${item.price}`}
          </div>
          {item.price != null && (
            <button
              onClick={() => add(item)}
              className="grid h-8 w-8 place-items-center rounded-full bg-gold-gradient text-brown-deep shadow-luxe active:scale-90 transition"
              aria-label={`Add ${item.name}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
